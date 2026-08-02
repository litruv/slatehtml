/**
 * .umc live preview for VS Code / Cursor.
 *
 * The document itself is built by ./preview.js; this file is only the editor
 * glue: command, panel lifecycle, settings, and re-render on edit.
 *
 * CommonJS on purpose, the extension host loads extensions with require().
 */

const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const { buildPreviewHtml, previewLineRange } = require("./preview.js");
const { registerCompletions } = require("./completions.js");
const { registerNavigation } = require("./navigation.js");

const VIEW_TYPE = "umc.preview";
const panels = new Map(); // fsPath -> WebviewPanel

/** @type {vscode.TextEditorDecorationType | null} */
let inspectDecoration = null;

function activate(context) {
  registerCompletions(context);
  registerInspectBridge(context);
  registerNavigation(context, { openComponentFile });

  context.subscriptions.push(
    vscode.commands.registerCommand("umc.showPreview", async (uri) => {
      const doc = await resolveDocument(uri);
      if (!doc) {
        vscode.window.showWarningMessage("Open a .umc file to preview it.");
        return;
      }
      showPreview(context, doc);
    })
  );

  // Previews compile the whole widget folder, so a sibling edit refreshes them too.
  const rerenderAffected = (changed) => {
    if (!changed || !changed.fileName.endsWith(".umc")) return;
    const dir = path.dirname(changed.fileName);
    for (const [fsPath, panel] of panels) {
      if (path.dirname(fsPath) !== dir) continue;
      const doc = vscode.workspace.textDocuments.find((d) => d.fileName === fsPath);
      if (doc) render(panel, doc);
    }
  };

  let timer = null;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      clearTimeout(timer);
      timer = setTimeout(() => rerenderAffected(e.document), 250);
    }),
    vscode.workspace.onDidSaveTextDocument(rerenderAffected),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("umc.preview")) return;
      for (const [fsPath, panel] of panels) {
        const doc = vscode.workspace.textDocuments.find((d) => d.fileName === fsPath);
        if (doc) render(panel, doc);
      }
    })
  );
}

function registerInspectBridge(context) {
  inspectDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: new vscode.ThemeColor("editor.wordHighlightStrongBackground"),
    borderWidth: "1px 0 0 0",
    borderStyle: "solid",
    borderColor: new vscode.ThemeColor("editor.wordHighlightStrongBorder"),
  });
  context.subscriptions.push(inspectDecoration);

  context.subscriptions.push(
    vscode.languages.registerHoverProvider("umc", {
      provideHover(document, position, token) {
        const panel = panels.get(document.fileName);
        if (!panel) return null;

        const range = previewLineRange(document.getText());
        if (!range) return null;

        const line = position.line + 1;
        if (line < range.start || line > range.end) return null;

        panel.webview.postMessage({ type: "highlight", line });
        token.onCancellationRequested(() => {
          panel.webview.postMessage({ type: "clearHighlight" });
        });

        return null;
      },
    })
  );
}

function clearInspectDecoration(fsPath) {
  if (!inspectDecoration) return;
  const editor = vscode.window.visibleTextEditors.find((e) => e.document.fileName === fsPath);
  editor?.setDecorations(inspectDecoration, []);
}

function highlightEditorLine(fsPath, line) {
  if (!inspectDecoration) return;
  const editor = vscode.window.visibleTextEditors.find((e) => e.document.fileName === fsPath);
  if (!editor) return;
  const zero = Math.max(0, line - 1);
  const range = new vscode.Range(zero, 0, zero, Number.MAX_SAFE_INTEGER);
  editor.setDecorations(inspectDecoration, [range]);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

async function openComponentFile(fsPath, line) {
  const abs = path.resolve(fsPath);
  if (!fs.existsSync(abs)) {
    vscode.window.showWarningMessage(`Component file not found: ${path.basename(abs)}`);
    return;
  }
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(abs));
  const zero = Number.isFinite(line) && line > 0 ? line - 1 : 0;
  const editor = await vscode.window.showTextDocument(doc, {
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
    selection: new vscode.Range(zero, 0, zero, 0),
  });
  editor.revealRange(
    new vscode.Range(zero, 0, zero, 0),
    vscode.TextEditorRevealType.InCenterIfOutsideViewport
  );
}

function deactivate() {
  for (const panel of panels.values()) panel.dispose();
  panels.clear();
}

async function resolveDocument(uri) {
  if (uri instanceof vscode.Uri) {
    const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === uri.fsPath);
    return open ?? (await vscode.workspace.openTextDocument(uri));
  }
  const active = vscode.window.activeTextEditor?.document;
  return active && active.fileName.endsWith(".umc") ? active : null;
}

function ensurePanelMessages(panel) {
  if (panel._umcMessagesBound) return;
  panel._umcMessagesBound = true;
  panel.webview.onDidReceiveMessage((msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "hover" && Number.isFinite(msg.line)) {
      const fsPath = panel._umcDocPath;
      if (fsPath) highlightEditorLine(fsPath, msg.line);
    } else if (msg.type === "clearHover") {
      const fsPath = panel._umcDocPath;
      if (fsPath) clearInspectDecoration(fsPath);
    } else if (msg.type === "openComponent" && msg.file) {
      openComponentFile(msg.file, msg.line);
    }
  });
}

function showPreview(context, doc) {
  const existing = panels.get(doc.fileName);
  if (existing) {
    existing._umcDocPath = doc.fileName;
    ensurePanelMessages(existing);
    existing.reveal(vscode.ViewColumn.Beside, true);
    render(existing, doc);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    `Preview ${path.basename(doc.fileName)}`,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: localRoots(doc),
    }
  );

  panels.set(doc.fileName, panel);
  panel._umcDocPath = doc.fileName;
  panel.onDidDispose(() => {
    panels.delete(doc.fileName);
    clearInspectDecoration(doc.fileName);
  }, null, context.subscriptions);

  ensurePanelMessages(panel);

  render(panel, doc);
}

/** Everything the preview may load: the workspace, plus ancestors of the file. */
function localRoots(doc) {
  const roots = [];
  const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
  if (folder) roots.push(folder.uri);
  let dir = path.dirname(doc.fileName);
  for (let i = 0; i < 8; i += 1) {
    roots.push(vscode.Uri.file(dir));
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return roots;
}

function render(panel, doc) {
  const webview = panel.webview;
  const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
  const bridgePath = path.join(__dirname, "preview-bridge.js");

  try {
    webview.html = buildPreviewHtml({
      file: doc.fileName,
      source: doc.getText(),
      readSource: (file) => {
        const open = vscode.workspace.textDocuments.find((d) => d.fileName === file);
        return open ? open.getText() : fs.readFileSync(file, "utf8");
      },
      resolveUri: (file) => String(webview.asWebviewUri(vscode.Uri.file(file))),
      previewBridgeUri: String(webview.asWebviewUri(vscode.Uri.file(bridgePath))),
      cspSource: webview.cspSource,
      nonce: makeNonce(),
      roots: folder ? [folder.uri.fsPath] : [],
      stylesheets: configPaths(doc, "preview.stylesheets"),
      imports: configPaths(doc, "preview.imports"),
    });
  } catch (err) {
    webview.html = `<!DOCTYPE html><html><body style="font:12px/1.6 monospace;padding:16px;color:#f14c4c">${escapeHtml(
      String(err?.stack || err)
    )}</body></html>`;
  }
}

function configPaths(doc, key) {
  const list = vscode.workspace.getConfiguration("umc", doc.uri).get(key) ?? [];
  const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
  const bases = [folder?.uri.fsPath, path.dirname(doc.fileName)].filter(Boolean);

  const out = [];
  for (const rel of list) {
    for (const base of bases) {
      const full = path.resolve(base, rel);
      if (fs.existsSync(full)) {
        out.push(full);
        break;
      }
    }
  }
  return out;
}

function makeNonce() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

module.exports = { activate, deactivate };
