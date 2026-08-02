/**
 * Auto-import helpers for .umc HTML tags.
 *
 * If a template contains `<user-name>`, the loader resolves and imports
 * `user-name.umc` (or `.js`) so you don't write registration imports by hand.
 *
 * Also rewrites bare layout tags (`verticalbox`) to prefixed custom elements
 * (`umc-verticalbox`) in html / style / script sections.
 *
 * CommonJS so both the Vite ESM plugin and the VS Code preview can share it.
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  PREFIX,
  BUILTIN_TAG_LIST,
  BUILTIN_TAGS,
  BUILTIN_TAGS_ALL,
  PREFIXED_TAGS,
  baseTag,
  prefixBuiltinTag,
  isBuiltinTag,
  isUserWidgetTag,
} = require("./builtin-tags.cjs");

/** Built-in tags (bare + prefixed), never auto-imported as UserWidgets. */
const BUILTIN_TAGS_SKIP = BUILTIN_TAGS_ALL;

/** `<slot-footer>` wrappers, authoring sugar, not widgets. */
function isSlotWrapperTag(name) {
  return /^slot-[a-z0-9-]+$/i.test(String(name || ""));
}

const TAG_RE = /<\/?([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b/gi;
/** `{ tag: "channel-row" }` / `tag: 'user-message'` in script (dynamic create/set). */
const SCRIPT_TAG_RE = /\btag\s*:\s*["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)["'`]/gi;

/** Longest-first so `editabletext` wins over shorter prefixes. */
const BARE_TAGS_SORTED = [...BUILTIN_TAG_LIST].sort((a, b) => b.length - a.length);

/** Unique custom-element tag names found in markup (hyphenated only). */
function extractCustomTags(html) {
  const tags = new Set();
  if (!html) return tags;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html))) {
    const tag = m[1].toLowerCase();
    if (BUILTIN_TAGS_SKIP.has(tag) || isSlotWrapperTag(tag)) continue;
    tags.add(tag);
  }
  return tags;
}

/** Custom tags referenced from script via `{ tag: "…" }` create/set specs. */
function extractScriptTags(script) {
  const tags = new Set();
  if (!script) return tags;
  let m;
  SCRIPT_TAG_RE.lastIndex = 0;
  while ((m = SCRIPT_TAG_RE.exec(script))) {
    const tag = m[1].toLowerCase();
    if (BUILTIN_TAGS_SKIP.has(tag) || isSlotWrapperTag(tag)) continue;
    tags.add(tag);
  }
  return tags;
}

function guessTag(script) {
  const s = String(script || "");
  // Prefer the host tag inside defineUmc({ tag: "…" }), NOT the first
  // `{ tag: "child" }` create/set spec earlier in the file.
  const fromDef = s.match(
    /\bdefineUmc\s*\(\s*\{[\s\S]*?\btag\s*:\s*["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]/i
  );
  if (fromDef) return fromDef[1].toLowerCase();
  const m = s.match(/\btag\s*:\s*["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]/i);
  return m ? m[1].toLowerCase() : null;
}

/** `./foo.umc` style specifier from `fromDir` to `toFile`. */
function toImportSpecifier(fromDir, toFile) {
  let rel = path.relative(fromDir, toFile).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function findWidgetsRoot(fromFile) {
  let dir = path.dirname(fromFile);
  for (let i = 0; i < 12; i += 1) {
    if (path.basename(dir) === "widgets") return dir;
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return null;
}

/**
 * Breadth-first search for `tag.umc` then `tag.js` under `root`.
 * Prefers shallower paths; skips node_modules.
 */
function findInTree(root, tag) {
  const queue = [root];
  while (queue.length) {
    const dir = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ext of [".umc", ".js"]) {
      const hit = path.join(dir, `${tag}${ext}`);
      if (fs.existsSync(hit) && fs.statSync(hit).isFile()) return hit;
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      queue.push(path.join(dir, ent.name));
    }
  }
  return null;
}

/**
 * Resolve a custom-element tag to a widget file next to `fromFile`, then under
 * the nearest `widgets/` ancestor, then any extra `roots`.
 */
function resolveWidgetFile(tag, fromFile, { roots = [] } = {}) {
  const dir = path.dirname(fromFile);
  for (const ext of [".umc", ".js"]) {
    const local = path.join(dir, `${tag}${ext}`);
    if (fs.existsSync(local)) return local;
  }

  const searchRoots = [];
  const widgets = findWidgetsRoot(fromFile);
  if (widgets) searchRoots.push(widgets);
  for (const r of roots) {
    if (r && !searchRoots.includes(r)) searchRoots.push(r);
  }

  for (const root of searchRoots) {
    const hit = findInTree(root, tag);
    if (hit && path.resolve(hit) !== path.resolve(fromFile)) return hit;
  }
  return null;
}

/** True if `script` already side-effect-imports this file (any relative form). */
function scriptImportsFile(script, fromDir, absFile) {
  const re = /^[ \t]*import\s+(["'])(\.[^"']+)\1\s*;?[ \t]*$/gm;
  let m;
  while ((m = re.exec(script))) {
    const resolved = path.resolve(fromDir, m[2]);
    if (path.resolve(resolved) === path.resolve(absFile)) return true;
  }
  return false;
}

/**
 * Prepend `import "./child.umc"` lines for every custom tag in `html` or
 * `{ tag: "…" }` in `script` that resolves to a widget file and isn't already
 * imported.
 */
function injectAutoImports(script, html, umcPath, options = {}) {
  if (options.autoImport === false) return script;

  const fromDir = path.dirname(umcPath);
  const own = guessTag(script);
  const tags = new Set([...extractCustomTags(html), ...extractScriptTags(script)]);
  const lines = [];

  for (const tag of [...tags].sort()) {
    if (own && tag === own) continue;
    const file = resolveWidgetFile(tag, umcPath, options);
    if (!file) continue;
    if (path.resolve(file) === path.resolve(umcPath)) continue;
    if (scriptImportsFile(script, fromDir, file)) continue;
    lines.push(`import ${JSON.stringify(toImportSpecifier(fromDir, file))};`);
  }

  if (!lines.length) return script;
  return `${lines.join("\n")}\n${script}`;
}

/**
 * Absolute widget files referenced by custom tags in markup / script
 * (for the preview collector).
 */
function resolveReferencedWidgets(html, script, fromFile, options = {}) {
  const own =
    options.ownTag
      ? String(options.ownTag).toLowerCase()
      : guessTag(script);
  const tags = new Set([...extractCustomTags(html), ...extractScriptTags(script)]);
  const out = [];
  const seen = new Set();
  for (const tag of tags) {
    if (own && tag === own) continue;
    const file = resolveWidgetFile(tag, fromFile, options);
    if (!file) continue;
    const key = path.resolve(file);
    if (seen.has(key) || key === path.resolve(fromFile)) continue;
    seen.add(key);
    out.push(file);
  }
  return out;
}

/** @deprecated use resolveReferencedWidgets, kept for older call sites */
function resolveHtmlWidgets(html, fromFile, options = {}) {
  return resolveReferencedWidgets(html, options.script ?? "", fromFile, options);
}

/**
 * In `.umc` style sections, `self` means the component tag:
 *
 *   self[selected] > .x   →   server-pill[selected] > .x
 *
 * Rewrites type-selector positions only (not `align-self`, not `"self"` strings).
 */
function rewriteSelfSelectors(css, tag) {
  if (!css || !tag) return css || "";
  const src = String(css);
  let result = "";
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === '"' || c === "'") {
      const q = c;
      result += c;
      i += 1;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") {
          result += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        result += src[i];
        i += 1;
      }
      if (i < src.length) {
        result += src[i];
        i += 1;
      }
      continue;
    }

    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      result += src.slice(i, stop);
      i = stop;
      continue;
    }

    // Type selector `self`, not `myself`, not `align-self`.
    if (
      src.startsWith("self", i) &&
      (i === 0 || /[,>+~\s(;{]/.test(src[i - 1])) &&
      (i + 4 >= src.length || /[\s.#:\[>+~,\])]/.test(src[i + 4]))
    ) {
      result += tag;
      i += 4;
      continue;
    }

    result += c;
    i += 1;
  }

  return result;
}

/** True if `border:` here is a CSS property, not `border:hover` / `border::after`. */
function isBorderPropertyColon(src, colonIndex) {
  if (src[colonIndex] !== ":") return false;
  if (src[colonIndex + 1] === ":") return false;
  let j = colonIndex + 1;
  while (j < src.length && /[ \t\n\r\f]/.test(src[j])) j += 1;
  const rest = src.slice(j);
  if (
    /^(hover|focus|focus-visible|active|checked|disabled|not|is|where|has|empty|before|after|first-child|last-child|nth-child|placeholder)\b/i.test(
      rest
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Match a bare builtin type selector at `i`. Returns the bare tag length or 0.
 * Skips `border:` CSS properties (keeps `border:hover` / `border[fill]`).
 */
function matchBuiltinTypeSelector(src, i) {
  if (i > 0 && !/[,>+~\s(;{]/.test(src[i - 1])) return 0;
  for (const tag of BARE_TAGS_SORTED) {
    if (!src.startsWith(tag, i)) continue;
    const end = i + tag.length;
    if (end < src.length && !/[\s.#:\[>+~,\]){]/.test(src[end])) continue;
    if (tag === "border" && src[end] === ":" && isBorderPropertyColon(src, end)) {
      return 0;
    }
    return tag.length;
  }
  return 0;
}

/**
 * Prefix bare layout tags in HTML markup:
 *   <verticalbox …>  →  <umc-verticalbox …>
 * Skips attribute values and text content (only rewrites tag names).
 */
function prefixBuiltinTagsInHtml(html) {
  if (!html) return html || "";
  return String(html).replace(
    /<\/?([a-z][a-z0-9]*)\b/gi,
    (full, name) => {
      const lower = name.toLowerCase();
      if (!BUILTIN_TAGS.has(lower)) return full;
      return full.replace(name, PREFIX + lower);
    }
  );
}

/**
 * Prefix bare layout type selectors in CSS:
 *   verticalbox > .x  →  umc-verticalbox > .x
 * Leaves `border:` / `border-radius:` declarations alone.
 */
function prefixBuiltinTagsInCss(css) {
  if (!css) return css || "";
  const src = String(css);
  let result = "";
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === '"' || c === "'") {
      const q = c;
      result += c;
      i += 1;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") {
          result += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        result += src[i];
        i += 1;
      }
      if (i < src.length) {
        result += src[i];
        i += 1;
      }
      continue;
    }

    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      result += src.slice(i, stop);
      i = stop;
      continue;
    }

    // Leave dualized selectors alone: :is(verticalbox, umc-verticalbox)
    if (src.startsWith(":is(", i)) {
      const close = src.indexOf(")", i + 4);
      if (close !== -1) {
        result += src.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }

    const len = matchBuiltinTypeSelector(src, i);
    if (len) {
      result += PREFIX + src.slice(i, i + len);
      i += len;
      continue;
    }

    result += c;
    i += 1;
  }

  return result;
}

/**
 * Dualize bare type selectors for the shared stylesheet:
 *   verticalbox  →  :is(verticalbox, umc-verticalbox)
 * Leaves properties alone; skips already-dualized or already-prefixed tags.
 */
function dualizeBuiltinSelectors(css) {
  if (!css) return css || "";
  const src = String(css);
  let result = "";
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === '"' || c === "'") {
      const q = c;
      result += c;
      i += 1;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") {
          result += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        result += src[i];
        i += 1;
      }
      if (i < src.length) {
        result += src[i];
        i += 1;
      }
      continue;
    }

    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      result += src.slice(i, stop);
      i = stop;
      continue;
    }

    // Already dualized: :is(tag, umc-tag)
    if (src.startsWith(":is(", i)) {
      const close = src.indexOf(")", i + 4);
      if (close !== -1) {
        result += src.slice(i, close + 1);
        i = close + 1;
        continue;
      }
    }

    // Skip already-prefixed umc-* tags
    if (src.startsWith(PREFIX, i)) {
      result += PREFIX;
      i += PREFIX.length;
      continue;
    }

    const len = matchBuiltinTypeSelector(src, i);
    if (len) {
      const tag = src.slice(i, i + len);
      result += `:is(${tag}, ${PREFIX}${tag})`;
      i += len;
      continue;
    }

    result += c;
    i += 1;
  }

  return result;
}

/**
 * In script sections:
 *  , `{ tag: "textblock" }` → `{ tag: "umc-textblock" }`
 *  , selector strings starting with a builtin type → prefixed
 */
function prefixBuiltinTagsInScript(script) {
  if (!script) return script || "";
  let out = String(script);

  out = out.replace(
    /\btag\s*:\s*(["'`])([a-z][a-z0-9]*)\1/gi,
    (full, quote, name) => {
      const lower = name.toLowerCase();
      if (!BUILTIN_TAGS.has(lower)) return full;
      return `tag: ${quote}${PREFIX}${lower}${quote}`;
    }
  );

  // String / template literals that look like CSS/DOM selectors with a builtin type.
  out = out.replace(
    /(["'`])((?:\\.|(?!\1).)*?)\1/g,
    (full, quote, body) => {
      if (quote === "`" && body.includes("${")) return full;
      if (!/(^|[,\s>+~(])([a-z][a-z0-9]*)\b/.test(body)) return full;
      const hasBuiltin = BARE_TAGS_SORTED.some(
        (tag) =>
          new RegExp(`(^|[,\s>+~(])${tag}(?=[\s.#:\\[>+~,\\])]|$)`).test(body)
      );
      if (!hasBuiltin) return full;
      const rewritten = prefixBuiltinTagsInCss(body);
      if (rewritten === body) return full;
      return quote + rewritten + quote;
    }
  );

  return out;
}

module.exports = {
  PREFIX,
  BUILTIN_TAGS,
  BUILTIN_TAGS_ALL,
  BUILTIN_TAG_LIST,
  PREFIXED_TAGS,
  baseTag,
  prefixBuiltinTag,
  isBuiltinTag,
  isUserWidgetTag,
  isSlotWrapperTag,
  extractCustomTags,
  extractScriptTags,
  guessTag,
  resolveWidgetFile,
  injectAutoImports,
  resolveReferencedWidgets,
  resolveHtmlWidgets,
  rewriteSelfSelectors,
  prefixBuiltinTagsInHtml,
  prefixBuiltinTagsInCss,
  prefixBuiltinTagsInScript,
  dualizeBuiltinSelectors,
  toImportSpecifier,
  findWidgetsRoot,
};
