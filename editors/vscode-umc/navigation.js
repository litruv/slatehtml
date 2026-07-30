/**
 * Ctrl+click navigation from .umc editor → child widget source (--- html ---).
 */

const fs = require("node:fs");
const path = require("node:path");
const { parseUmcSource } = require("./preview.js");
const { resolveWidgetFile, BUILTIN_TAGS_ALL } = require("../../umc/auto-import.cjs");

const TAG_RE = /<\/?([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b/gi;
const SCRIPT_TAG_RE = /\btag\s*:\s*["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)["'`]/gi;
const QUERY_TAG_RE =
  /(?:querySelector|querySelectorAll|getElementsByTagName|createElement)\s*\(\s*["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)["'`]/gi;

/**
 * @param {string} source
 * @param {string} fromFile
 * @param {{ roots?: string[], readSource?: (file: string) => string }} [options]
 * @returns {Array<{ tag: string, file: string, line: number, range: { start: { line: number, character: number }, end: { line: number, character: number } } }>}
 */
function collectNavigationTargets(source, fromFile, options = {}) {
  const { roots = [], readSource } = options;
  const sections = parseUmcSource(source);
  const targets = [];
  const fromAbs = path.resolve(fromFile);
  const htmlLineCache = new Map();

  const jumpLine = (file) => {
    if (htmlLineCache.has(file)) return htmlLineCache.get(file);
    let line = 1;
    try {
      const text = readSource ? readSource(file) : fs.readFileSync(file, "utf8");
      const parsed = parseUmcSource(text);
      line = parsed.html?.startLine ?? 1;
    } catch {
      /* unreadable target */
    }
    htmlLineCache.set(file, line);
    return line;
  };

  const push = (tag, hit, line0, charStart, charEnd) => {
    if (!hit || path.resolve(hit) === fromAbs) return;
    targets.push({
      tag,
      file: hit,
      line: jumpLine(hit),
      range: {
        start: { line: line0, character: charStart },
        end: { line: line0, character: charEnd },
      },
    });
  };

  const scanLine = (lineText, fileLine0, re, tagIndex) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(lineText))) {
      const tag = m[tagIndex].toLowerCase();
      if (BUILTIN_TAGS_ALL.has(tag)) continue;
      const hit = resolveWidgetFile(tag, fromFile, { roots });
      if (!hit) continue;
      const raw = m[tagIndex];
      const startInMatch = m[0].indexOf(raw);
      const charStart = m.index + startInMatch;
      push(tag, hit, fileLine0, charStart, charStart + raw.length);
    }
  };

  const scanSection = (section, re, tagIndex) => {
    if (!section?.value || section.kind !== "inline" || !section.startLine) return;
    const lines = section.value.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      scanLine(lines[i], section.startLine + i - 1, re, tagIndex);
    }
  };

  scanSection(sections.html, TAG_RE, 1);
  scanSection(sections.preview, TAG_RE, 1);
  scanSection(sections.script, SCRIPT_TAG_RE, 1);
  scanSection(sections.script, QUERY_TAG_RE, 1);

  return targets;
}

function commandUri(vscode, file, line) {
  return vscode.Uri.parse(
    `command:umc.openComponent?${encodeURIComponent(JSON.stringify([file, line]))}`
  );
}

function rootsForDocument(vscode, document) {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  return folder ? [folder.uri.fsPath] : [];
}

function registerNavigation(context, { openComponentFile }) {
  const vscode = require("vscode");
  context.subscriptions.push(
    vscode.commands.registerCommand("umc.openComponent", (file, line) => {
      openComponentFile(file, line);
    })
  );

  const linkProvider = {
    provideDocumentLinks(document) {
      const targets = collectNavigationTargets(document.getText(), document.fileName, {
        roots: rootsForDocument(vscode, document),
        readSource: (file) => {
          const open = vscode.workspace.textDocuments.find((d) => d.fileName === file);
          return open ? open.getText() : fs.readFileSync(file, "utf8");
        },
      });

      return targets.map((t) => {
        const range = new vscode.Range(
          t.range.start.line,
          t.range.start.character,
          t.range.end.line,
          t.range.end.character
        );
        const link = new vscode.DocumentLink(range, commandUri(vscode, t.file, t.line));
        link.tooltip = `Open ${path.basename(t.file)}`;
        return link;
      });
    },
  };

  const definitionProvider = {
    provideDefinition(document, position) {
      const targets = collectNavigationTargets(document.getText(), document.fileName, {
        roots: rootsForDocument(vscode, document),
        readSource: (file) => {
          const open = vscode.workspace.textDocuments.find((d) => d.fileName === file);
          return open ? open.getText() : fs.readFileSync(file, "utf8");
        },
      });

      const hit = targets.find((t) => {
        const range = new vscode.Range(
          t.range.start.line,
          t.range.start.character,
          t.range.end.line,
          t.range.end.character
        );
        return range.contains(position);
      });
      if (!hit) return null;

      const zero = Math.max(0, (hit.line ?? 1) - 1);
      return new vscode.Location(vscode.Uri.file(hit.file), new vscode.Position(zero, 0));
    },
  };

  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider("umc", linkProvider),
    vscode.languages.registerDefinitionProvider("umc", definitionProvider)
  );
}

module.exports = { collectNavigationTargets, registerNavigation };
