/**
 * Builds the .umc preview document. No vscode dependency, so it can be
 * exercised headlessly (see test/preview.test.mjs).
 *
 * CommonJS because the VS Code extension host loads extensions with require().
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  resolveReferencedWidgets,
  guessTag: guessTagFromScript,
  rewriteSelfSelectors,
  prefixBuiltinTagsInHtml,
  prefixBuiltinTagsInCss,
  prefixBuiltinTagsInScript,
} = require("../../umc/auto-import.cjs");

const SECTION_RE =
  /^---\s*(html|template|style|css|script|js|preview|demo)\s*---\s*$/i;
const LINK_RE = /^@\s+(.+?)\s*$/;
const ALIASES = {
  html: "html",
  template: "html",
  style: "style",
  css: "style",
  script: "script",
  js: "script",
  preview: "preview",
  demo: "preview",
};

/** Mirrors umc/parse.js (which is ESM and can't be required here). */
function parseUmcSource(source) {
  const sections = {
    html: { kind: "inline", value: "" },
    style: { kind: "inline", value: "" },
    script: { kind: "inline", value: "" },
    preview: { kind: "inline", value: "" },
  };

  const lines = String(source).replace(/^\uFEFF/, "").split(/\r?\n/);
  let current = null;
  let currentStartLine = null;
  let currentEndLine = null;
  const buf = [];

  const flush = () => {
    if (!current) return;
    const raw = buf.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
    buf.length = 0;
    const link = raw.match(LINK_RE);
    if (link && !raw.includes("\n")) {
      sections[current] = { kind: "link", value: link[1].trim() };
    } else {
      sections[current] = {
        kind: "inline",
        value: raw,
        startLine: currentStartLine,
        endLine: currentEndLine,
      };
    }
    currentStartLine = null;
    currentEndLine = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i];
    const m = line.match(SECTION_RE);
    if (m) {
      flush();
      current = ALIASES[m[1].toLowerCase()];
      continue;
    }
    if (current) {
      if (currentStartLine === null) currentStartLine = lineNo;
      currentEndLine = lineNo;
      buf.push(line);
    }
  }
  flush();

  return sections;
}

/** 1-based line is inside the preview section of this .umc source. */
function previewLineRange(source) {
  const section = parseUmcSource(source).preview;
  if (!section || section.kind !== "inline" || !section.startLine) return null;
  return { start: section.startLine, end: section.endLine ?? section.startLine };
}

/** Stamp `data-umc-line` on opening tags so preview hover can map back to the editor. */
function annotateHtmlWithSourceLines(html, startLine) {
  if (!html || !startLine) return html;
  const lines = html.split(/\r?\n/);
  return lines
    .map((line, index) => annotateLineOpeningTags(line, startLine + index))
    .join("\n");
}

function annotateLineOpeningTags(line, lineNo) {
  return line.replace(
    /<([A-Za-z][\w-]*)(\s[^>/]*)?(\s*\/?)>/g,
    (full, tag, attrs = "", selfClose = "") => {
      const a = attrs || "";
      if (/\bdata-umc-line=/i.test(a)) return full;
      return `<${tag} data-umc-line="${lineNo}"${a}${selfClose}>`;
    }
  );
}

/** Find a SlateHTML asset by walking up from the component, then the roots. */
function findAsset(relPath, { file, roots = [] }) {
  const bases = [];
  let dir = path.dirname(file);
  for (let i = 0; i < 8; i += 1) {
    bases.push(dir, path.join(dir, "node_modules", "slatehtml"));
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  for (const root of roots) {
    bases.push(root, path.join(root, "node_modules", "slatehtml"));
  }

  for (const base of bases) {
    const full = path.join(base, relPath);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function readSection(section, dir) {
  if (!section || section.kind === "inline") return section?.value ?? "";
  const file = path.resolve(dir, section.value);
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return `/* [umc] missing linked file: ${section.value} */`;
  }
}

/** `defineUmc` is injected by the loader, drop user imports of it. */
function stripDefineUmcImport(script) {
  return script.replace(
    /^\s*import\s*\{([^}]*)\}\s*from\s*["']slatehtml\/umc["']\s*;?\s*$/gm,
    (_, names) => {
      const rest = names
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !/^defineUmc(\s+as\s+\w+)?$/.test(s));
      return rest.length ? `/* preview: dropped defineUmc import */\n` : "";
    }
  );
}

/**
 * Registration imports are the preview's job, not the component's: every .umc
 * beside the focused file is already inlined below, and a browser can't load a
 * .umc as a module. Side-effect-only relative imports are therefore dropped;
 * value imports (`from "../data.js"`) are kept and rewritten.
 */
function dropRegistrationImports(script) {
  return script.replace(/^[ \t]*import\s*(["'])\.[^"']+\1\s*;?[ \t]*$/gm, "");
}

/** Point relative imports at URLs the preview document can fetch. */
function rewriteRelativeImports(script, dir, resolveUri) {
  return script.replace(
    /(\bfrom\s*|\bimport\s*)(["'])(\.[^"']+)\2/g,
    (match, prefix, quote, spec) => {
      const full = path.resolve(dir, spec);
      if (!fs.existsSync(full)) return match;
      return `${prefix}${quote}${resolveUri(full)}${quote}`;
    }
  );
}

/** Bare npm specifiers: `from "lodash"` / `import("matrix-js-sdk")`. */
function extractBareSpecifiers(script) {
  const out = new Set();
  if (!script) return out;
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*)(["'])([^./"'][^"']*)\1/g;
  let m;
  while ((m = re.exec(script))) {
    const spec = m[2];
    if (spec.startsWith("node:")) continue;
    out.add(spec);
  }
  return out;
}

/** Relative module paths in import/export (any extension). */
function extractRelativeSpecifiers(script) {
  const out = [];
  if (!script) return out;
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*)(["'])(\.[^"']+)\1/g;
  let m;
  while ((m = re.exec(script))) out.push(m[2]);
  return out;
}

/**
 * Walk the focused .umc (and relative .js / .umc script deps) for bare npm
 * imports the browser must resolve via import map.
 */
function collectBareNpmSpecifiers(file, source, readSource) {
  const bare = new Set();
  const seen = new Set();

  const visit = (absFile, text) => {
    const key = path.resolve(absFile);
    if (seen.has(key)) return;
    seen.add(key);
    const dir = path.dirname(key);

    let script = text;
    if (key.endsWith(".umc")) {
      const sections = parseUmcSource(text);
      script = readSection(sections.script, dir);
    }

    for (const spec of extractBareSpecifiers(script)) bare.add(spec);

    for (const rel of extractRelativeSpecifiers(script)) {
      const child = path.resolve(dir, rel);
      if (!fs.existsSync(child)) continue;
      let childSrc;
      try {
        childSrc =
          path.resolve(child) === path.resolve(file)
            ? source
            : readSource(child);
      } catch {
        try {
          childSrc = fs.readFileSync(child, "utf8");
        } catch {
          continue;
        }
      }
      visit(child, childSrc);
    }
  };

  visit(file, source);
  return bare;
}

/** Lightweight stub, real matrix-js-sdk is too heavy for the webview preview. */
function matrixSdkStubDataUrl() {
  const code = `
export const ClientEvent = {
  Sync: "sync",
  Room: "Room",
  DeleteRoom: "deleteRoom",
};

export function createClient(opts = {}) {
  const state = { accessToken: opts.accessToken || null, userId: opts.userId || null };
  const rooms = state.accessToken
    ? [
        { roomId: "!preview:matrix.org", name: "Preview Room", getDefaultRoomName: () => "Preview Room" },
        { roomId: "!lobby:matrix.org", name: "Lobby", getDefaultRoomName: () => "Lobby" },
      ]
    : [];
  return {
    loginRequest: async () => {
      throw new Error("UMC preview stubs matrix-js-sdk, use npm run dev or Electron to sign in.");
    },
    getAccessToken: () => state.accessToken,
    getUserId: () => state.userId,
    getRooms: () => rooms,
    getSyncState: () => (state.accessToken ? "PREPARED" : null),
    startClient: async () => {},
    stopClient: () => {},
    logout: async () => {},
    on() {},
    removeListener() {},
  };
}
export default { createClient, ClientEvent };
`.trim();
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

/** Browserify UMD build, no named ESM exports in the webview import map. */
function matrixEncryptAttachmentStubDataUrl() {
  const code = `
export async function decryptAttachment(buffer) {
  return buffer;
}
export async function encryptAttachment(buffer) {
  return { data: buffer, info: { key: {}, iv: "", hashes: {}, v: "v2" } };
}
export function encodeBase64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function decodeBase64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export default { decryptAttachment, encryptAttachment, encodeBase64, decodeBase64 };
`.trim();
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

function npmPackageStubDataUrl(name) {
  if (name === "matrix-js-sdk" || name.startsWith("@matrix-org/")) {
    return matrixSdkStubDataUrl();
  }
  if (name === "matrix-encrypt-attachment") {
    return matrixEncryptAttachmentStubDataUrl();
  }
  return null;
}

function shouldStubNpmPackage(name) {
  return npmPackageStubDataUrl(name) != null;
}

/** Resolve package browser/module/main from the nearest node_modules. */
function resolvePackageEntry(name, fromFile) {
  let dir = path.dirname(fromFile);
  for (;;) {
    const pkgDir = name.startsWith("@")
      ? path.join(dir, "node_modules", ...name.split("/"))
      : path.join(dir, "node_modules", name);
    const pkgJsonPath = path.join(pkgDir, "package.json");
    if (fs.existsSync(pkgJsonPath)) {
      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      } catch {
        return null;
      }
      let entry = pkg.browser;
      if (entry && typeof entry === "object") {
        entry = entry["."] || entry[pkg.main] || null;
      }
      if (typeof entry !== "string") {
        entry =
          (typeof pkg.exports?.["."] === "string" && pkg.exports["."]) ||
          pkg.exports?.["."]?.import ||
          pkg.exports?.["."]?.default ||
          pkg.module ||
          pkg.main ||
          "index.js";
      }
      if (typeof entry !== "string") return null;
      const full = path.resolve(pkgDir, entry);
      return fs.existsSync(full) ? full : null;
    }
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return null;
}

function guessTag(script) {
  return guessTagFromScript(script);
}

function tagFromFilename(file) {
  const base = path.basename(file, path.extname(file));
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/i.test(base) ? base.toLowerCase() : null;
}

function compileUnit(file, source, resolveUri) {
  const dir = path.dirname(file);
  const absFile = path.resolve(file);
  const sections = parseUmcSource(source);
  const rawScript = readSection(sections.script, dir);
  const tag = guessTag(rawScript) || tagFromFilename(file);
  const bareHtml = readSection(sections.html, dir);
  const barePreview = readSection(sections.preview, dir);

  return {
    name: path.basename(file),
    file: absFile,
    source,
    html: prefixBuiltinTagsInHtml(bareHtml),
    css: prefixBuiltinTagsInCss(rewriteSelfSelectors(readSection(sections.style, dir), tag)),
    preview: prefixBuiltinTagsInHtml(barePreview),
    tag,
    script: prefixBuiltinTagsInScript(
      rewriteRelativeImports(
        dropRegistrationImports(stripDefineUmcImport(rawScript)),
        dir,
        resolveUri
      )
    ),
  };
}

/** Map registered widget tags to their source file and useful jump lines. */
function buildComponentRegistry(units) {
  const registry = {};
  for (const unit of units) {
    if (!unit.tag || !unit.file || unit.fromJs) continue;
    const sections = parseUmcSource(unit.source ?? "");
    registry[unit.tag] = {
      file: unit.file,
      htmlLine: sections.html?.startLine ?? null,
      previewLine: sections.preview?.startLine ?? null,
    };
  }
  return registry;
}

/** Side-effect `import "./child.umc"` / `./child.js` specifiers (any relative depth). */
function registrationImportSpecifiers(script) {
  const re = /^[ \t]*import\s+(["'])(\.[^"']+\.(?:umc|js))\1\s*;?[ \t]*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(script))) out.push(m[2]);
  return out;
}

/**
 * The focused component plus every widget pulled in by:
 *   1. custom tags in its HTML (and recursively),
 *   2. leftover explicit `import "./x.umc"` / `./x.js` lines.
 * Post-order keeps the focused unit last (buildPreviewHtml reads units[last]).
 *
 * Plain `.js` widgets are rewritten like .umc scripts: side-effect registration
 * imports are dropped (those children are visited separately) and remaining
 * relative imports are pointed at fetchable URLs.
 */
function collectUnits({ file, source, readSource, resolveUri, roots = [] }) {
  const units = [];
  const seen = new Set();

  const visitJs = (absFile) => {
    const key = path.resolve(absFile);
    if (seen.has(key)) return;
    seen.add(key);

    const dir = path.dirname(absFile);
    let raw;
    try {
      raw = fs.readFileSync(absFile, "utf8");
    } catch {
      return;
    }

    for (const spec of registrationImportSpecifiers(raw)) {
      const child = path.resolve(dir, spec);
      if (!fs.existsSync(child)) continue;
      try {
        if (child.endsWith(".umc")) visitUmc(child, readSource(child));
        else if (child.endsWith(".js")) visitJs(child);
      } catch {
        /* ignore broken deps */
      }
    }

    units.push({
      name: path.basename(absFile),
      html: "",
      css: "",
      preview: "",
      tag: null,
      script: rewriteRelativeImports(dropRegistrationImports(raw), dir, resolveUri),
      fromJs: true,
    });
  };

  const visitUmc = (absFile, src) => {
    const key = path.resolve(absFile);
    if (seen.has(key)) return;
    seen.add(key);

    const dir = path.dirname(absFile);
    const sections = parseUmcSource(src);
    const html = readSection(sections.html, dir);
    const script = readSection(sections.script, dir);
    const ownTag = guessTag(script);

    const children = new Set([
      ...resolveReferencedWidgets(html, script, absFile, { ownTag, roots }),
      ...registrationImportSpecifiers(script).map((spec) => path.resolve(dir, spec)),
    ]);

    for (const child of children) {
      if (!fs.existsSync(child)) continue;
      try {
        if (child.endsWith(".umc")) visitUmc(child, readSource(child));
        else if (child.endsWith(".js")) visitJs(child);
      } catch {
        /* ignore broken deps */
      }
    }

    units.push(compileUnit(absFile, src, resolveUri));
  };

  visitUmc(file, source);
  return units;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function chrome() {
  return `
  :root { color-scheme: dark light; }
  body {
    margin: 0;
    padding: 0;
    font-family: var(--vscode-font-family, system-ui, sans-serif);
    color: var(--vscode-foreground, #ddd);
    background: var(--vscode-editor-background, #1e1e1e);
  }
  .umc-bar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    padding: 8px 10px;
    font: 11px/1.6 var(--vscode-editor-font-family, monospace);
    opacity: .85;
  }
  .umc-bar .umc-meta { opacity: .7; }
  .umc-bar .umc-spacer { flex: 1 1 auto; min-width: 8px; }
  .umc-size {
    font-variant-numeric: tabular-nums;
    opacity: .7;
  }
  .umc-bg {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    opacity: .9;
  }
  .umc-bg label { cursor: pointer; user-select: none; }
  .umc-bg input[type="color"] {
    width: 22px;
    height: 18px;
    padding: 0;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.45));
    border-radius: 3px;
    background: transparent;
    cursor: pointer;
  }
  .umc-bg button {
    appearance: none;
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.45));
    border-radius: 3px;
    padding: 0 6px;
    cursor: pointer;
    opacity: .8;
  }
  .umc-bg button:hover { opacity: 1; }
  .umc-stage {
    box-sizing: border-box;
    margin: 0 10px 10px;
    border: 1px solid var(--vscode-panel-border, rgba(128,128,128,.35));
    border-radius: 4px;
    padding: 0;
    overflow: auto;
    resize: both;
    min-width: 160px;
    min-height: 120px;
    width: calc(100% - 20px);
    max-width: calc(100% - 20px);
    height: calc(100vh - 56px);
    background: var(--umc-stage-bg, var(--vscode-sideBar-background, #252526));
  }
  .umc-error:empty { display: none; }
  .umc-error {
    margin: 0 10px 10px;
    padding: 8px 10px;
    color: var(--vscode-errorForeground, #f14c4c);
    font: 12px/1.5 var(--vscode-editor-font-family, monospace);
    white-space: pre-wrap;
  }
  #umc-stage [data-umc-line].umc-inspect-hover {
    outline: 2px solid var(--vscode-focusBorder, #007fd4);
    outline-offset: 2px;
  }
  .umc-hint {
    color: var(--vscode-textLink-foreground, #3794ff);
  }
  #umc-stage .umc-nav-target {
    cursor: pointer !important;
    box-shadow: inset 0 -1px 0 var(--vscode-textLink-foreground, #3794ff);
  }
  #umc-stage .umc-nav-target.umc-nav-active,
  #umc-stage.umc-modifier-open .umc-nav-target {
    outline: 1px dashed var(--vscode-textLink-foreground, #3794ff);
    outline-offset: 2px;
    box-shadow: inset 0 -2px 0 var(--vscode-textLink-foreground, #3794ff);
  }`;
}

/**
 * @param {object} options
 * @param {string} options.file            fsPath of the focused .umc
 * @param {string} options.source          its current text (may be unsaved)
 * @param {(f: string) => string} [options.readSource]  sibling reader
 * @param {(f: string) => string} options.resolveUri    fsPath -> fetchable URL
 * @param {string} [options.cspSource]     webview csp source; omitted when falsy
 * @param {string} [options.nonce]
 * @param {string[]} [options.roots]       extra search roots for widget.css etc.
 * @param {string[]} [options.stylesheets] resolved CSS files to inline
 * @param {string[]} [options.imports]     resolved JS modules to load first
 * @param {string} [options.previewBridgeUri] webview URI for preview-bridge.js
 */
function buildPreviewHtml(options) {
  const {
    file,
    source,
    readSource = (f) => fs.readFileSync(f, "utf8"),
    resolveUri,
    cspSource = "",
    nonce = "umc",
    roots = [],
    stylesheets = [],
    imports = [],
    previewBridgeUri = "",
  } = options;

  const runtimePath = findAsset(path.join("umc", "runtime.js"), { file, roots });
  if (!runtimePath) {
    return errorPage(
      "Could not find slatehtml/umc/runtime.js, open the folder containing SlateHTML, or install it into node_modules."
    );
  }

  const units = collectUnits({ file, source, readSource, resolveUri, roots });
  const unit = units[units.length - 1];
  const focusedSections = parseUmcSource(source);
  const previewRange = focusedSections.preview;
  const componentRegistry = buildComponentRegistry(units);
  const focusMeta = {
    file: path.resolve(file),
    previewRange: previewLineRange(source),
  };

  const widgetCssPath = findAsset("widget.css", { file, roots });
  const widgetJsPath = findAsset("widget.js", { file, roots });
  const widgetCss = widgetCssPath ? fs.readFileSync(widgetCssPath, "utf8") : "";
  const widgetJsUri = widgetJsPath ? resolveUri(widgetJsPath) : null;
  const runtimeUri = resolveUri(runtimePath);

  // No script section means nothing registers an element; show the markup itself.
  let body =
    unit.preview || (unit.tag ? `<${unit.tag}></${unit.tag}>` : unit.script.trim() ? "" : unit.html);
  if (unit.preview && previewRange?.startLine) {
    body = annotateHtmlWithSourceLines(body, previewRange.startLine);
  }

  const csp = cspSource
    ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data: https: http:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource} data:; font-src ${cspSource} data:; connect-src ${cspSource} https: http:;" />`
    : "";

  const styles = [
    `<style>${widgetCss}</style>`,
    ...stylesheets.map(
      (f) => `<style>${prefixBuiltinTagsInCss(fs.readFileSync(f, "utf8"))}</style>`
    ),
    ...units
      .filter((u) => u.css && u.css.trim())
      .map((u) => `<style data-umc="${escapeHtml(u.name)}">${u.css}</style>`),
    `<style>${chrome()}</style>`,
  ].join("\n");

  // Import map: slatehtml runtime + bare npm specs found in the preview graph.
  // matrix-js-sdk is stubbed (full SDK needs Vite/Electron).
  const importMapImports = {
    "slatehtml/umc": runtimeUri,
    "slatehtml/umc/runtime.js": runtimeUri,
  };
  for (const spec of collectBareNpmSpecifiers(file, source, readSource)) {
    if (importMapImports[spec]) continue;
    if (shouldStubNpmPackage(spec)) {
      importMapImports[spec] = npmPackageStubDataUrl(spec);
      continue;
    }
    const entry = resolvePackageEntry(spec, file);
    if (entry) importMapImports[spec] = resolveUri(entry);
  }

  const importMap = `<script type="importmap" nonce="${nonce}">${JSON.stringify({
    imports: importMapImports,
  })}</script>`;

  const scripts = [
    importMap,
    widgetJsUri ? `<script type="module" nonce="${nonce}" src="${widgetJsUri}"></script>` : "",
    ...imports.map(
      (f) => `<script type="module" nonce="${nonce}" src="${resolveUri(f)}"></script>`
    ),
    ...units
      .filter((u) => u.script && u.script.trim())
      .map((u) => {
        if (u.fromJs) {
          return `<script type="module" nonce="${nonce}">\n${u.script}\n</script>`;
        }
        return [
          `<script type="module" nonce="${nonce}">`,
          `import { defineUmc as __defineUmc } from ${JSON.stringify(runtimeUri)};`,
          `const __umcHtml = ${JSON.stringify(u.html)};`,
          `const defineUmc = (def = {}) => __defineUmc({ html: __umcHtml, ...def });`,
          u.script,
          `</script>`,
        ].join("\n");
      }),
  ]
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
${csp}
${styles}
</head>
<body>
<div class="umc-bar">
  <span class="umc-meta">${unit.tag ? `&lt;${unit.tag}&gt;` : "no tag found"}</span>
  <span class="umc-meta">·</span>
  <span class="umc-meta">${unit.preview ? "preview section" : "default attrs"}</span>
  <span class="umc-meta umc-hint" id="umc-nav-hint">Hover widget · Ctrl+click to open source</span>
  <span class="umc-spacer"></span>
  <span class="umc-size" id="umc-size" title="Stage content box (resizable)">- × -</span>
  <span class="umc-bg" title="Stage background">
    <label for="umc-bg-input">bg</label>
    <input type="color" id="umc-bg-input" value="#1e1e1e" aria-label="Stage background color" />
    <button type="button" id="umc-bg-clear" title="Clear stage background">clear</button>
  </span>
</div>
<div class="umc-stage" id="umc-stage">${body}</div>
<div class="umc-error" id="umc-error"></div>
<script nonce="${nonce}">
  window.UMC_PREVIEW = {
    components: ${JSON.stringify(componentRegistry)},
    focus: ${JSON.stringify(focusMeta)},
  };
  const umcError = document.getElementById("umc-error");
  const umcShow = (msg) => { umcError.textContent = String(msg ?? ""); };
  window.addEventListener("error", (e) => umcShow(e.message));
  window.addEventListener("unhandledrejection", (e) => umcShow(e.reason));

  (function umcStageChrome() {
    const stage = document.getElementById("umc-stage");
    const sizeEl = document.getElementById("umc-size");
    const bgInput = document.getElementById("umc-bg-input");
    const bgClear = document.getElementById("umc-bg-clear");
    if (!stage || !sizeEl || !bgInput) return;

    const BG_KEY = "umc.preview.stageBg";

    const updateSize = () => {
      const w = Math.round(stage.clientWidth);
      const h = Math.round(stage.clientHeight);
      sizeEl.textContent = w + " × " + h;
    };

    const applyBg = (value) => {
      if (value) {
        stage.style.setProperty("--umc-stage-bg", value);
        bgInput.value = value;
        try { localStorage.setItem(BG_KEY, value); } catch (_) {}
      } else {
        stage.style.removeProperty("--umc-stage-bg");
        try { localStorage.removeItem(BG_KEY); } catch (_) {}
      }
    };

    let saved = null;
    try { saved = localStorage.getItem(BG_KEY); } catch (_) {}
    if (saved) applyBg(saved);

    bgInput.addEventListener("input", () => applyBg(bgInput.value));
    bgClear.addEventListener("click", () => applyBg(null));

    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(updateSize).observe(stage);
    } else {
      window.addEventListener("resize", updateSize);
    }
  })();
</script>
${scripts}
${previewBridgeUri ? `<script nonce="${nonce}" src="${previewBridgeUri}"></script>` : ""}
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html><html><body style="font:12px/1.6 monospace;padding:16px;color:#f14c4c">${escapeHtml(
    message
  )}</body></html>`;
}

module.exports = {
  buildPreviewHtml,
  parseUmcSource,
  previewLineRange,
  annotateHtmlWithSourceLines,
  buildComponentRegistry,
  errorPage,
};
