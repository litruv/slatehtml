/**
 * Lint `.umc` --- style --- CSS for layout properties that belong on panel attrs.
 *
 * Forbidden: flex/grid layout, CSS positioning (position/inset/edges/z-index), float.
 * Allowed display values: none, contents, block, inline, inline-block (+ CSS-wide keywords).
 *
 * Escape hatch: put `umc-layout-ok` in a CSS comment on the same declaration line
 * (for chrome hosts like slate-button / popup-anchor).
 */

"use strict";

const ALLOWED_DISPLAY = new Set([
  "none",
  "contents",
  "block",
  "inline",
  "inline-block",
  "revert",
  "revert-layer",
  "unset",
  "initial",
  "inherit",
]);

const FORBIDDEN_PROPS = new Set([
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "float",
  "clear",
  "order",
  "z-index",
  "flex",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "flex-direction",
  "flex-wrap",
  "flex-flow",
  "justify-content",
  "justify-items",
  "justify-self",
  "align-content",
  "align-items",
  "align-self",
  "place-content",
  "place-items",
  "place-self",
  "gap",
  "row-gap",
  "column-gap",
  "grid",
  "grid-area",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-column",
  "grid-column-end",
  "grid-column-start",
  "grid-row",
  "grid-row-end",
  "grid-row-start",
  "grid-template",
  "grid-template-areas",
  "grid-template-columns",
  "grid-template-rows",
]);

const DECL_RE =
  /(?:^|[;{])\s*([a-zA-Z][\w-]*)\s*:\s*([^;{}]+)/g;

const OK_RE = /umc-layout-ok/i;

function isForbiddenProp(prop) {
  const p = prop.toLowerCase();
  if (FORBIDDEN_PROPS.has(p)) return true;
  if (p === "inset" || p.startsWith("inset-")) return true;
  if (p.startsWith("grid-")) return true;
  return false;
}

function displayForbidden(value) {
  const raw = String(value)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/!important/gi, "")
    .trim()
    .toLowerCase();
  if (!raw) return false;
  // Take first comma-separated / space token group for simple values.
  const first = raw.split(/\s+/)[0];
  if (ALLOWED_DISPLAY.has(first)) return false;
  return /^(inline-)?(flex|grid)$/.test(first);
}

function reasonFor(prop, value) {
  const p = prop.toLowerCase();
  if (p === "display") {
    return `display:${String(value).trim()} — use panel tags/attrs for layout (display:contents/none/block are ok)`;
  }
  if (
    p === "position" ||
    p === "top" ||
    p === "right" ||
    p === "bottom" ||
    p === "left" ||
    p === "inset" ||
    p.startsWith("inset-") ||
    p === "z-index"
  ) {
    return `${p} — use canvaspanel anchors / overlay alignment, not CSS positioning`;
  }
  if (p === "float" || p === "clear") {
    return `${p} — use panel tags for layout`;
  }
  return `${p} — use panel attrs (fill, gap, halign, valign, …), not flex/grid CSS`;
}

/**
 * @param {string} css
 * @param {{ file?: string, lineOffset?: number }} [opts]
 * @returns {{ line: number, prop: string, value: string, message: string, file?: string }[]}
 */
function lintUmcStyle(css, opts = {}) {
  const file = opts.file;
  const lineOffset = opts.lineOffset ?? 0;
  const errors = [];
  const lines = String(css ?? "").split(/\r?\n/);
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let cleaned = "";
    let j = 0;
    while (j < line.length) {
      if (inComment) {
        const end = line.indexOf("*/", j);
        if (end < 0) {
          j = line.length;
          break;
        }
        inComment = false;
        j = end + 2;
        continue;
      }
      if (line[j] === "/" && line[j + 1] === "*") {
        // Keep umc-layout-ok visible for the OK check before stripping.
        const end = line.indexOf("*/", j + 2);
        const block = end < 0 ? line.slice(j) : line.slice(j, end + 2);
        if (OK_RE.test(block)) cleaned += " /* umc-layout-ok */ ";
        if (end < 0) {
          inComment = true;
          j = line.length;
          break;
        }
        j = end + 2;
        continue;
      }
      // Skip quoted strings so url("flex.png") / content doesn't false-positive props.
      if (line[j] === '"' || line[j] === "'") {
        const q = line[j];
        cleaned += q;
        j += 1;
        while (j < line.length) {
          if (line[j] === "\\") {
            cleaned += line[j] + (line[j + 1] ?? "");
            j += 2;
            continue;
          }
          cleaned += line[j];
          if (line[j] === q) {
            j += 1;
            break;
          }
          j += 1;
        }
        continue;
      }
      cleaned += line[j];
      j += 1;
    }

    if (OK_RE.test(cleaned)) continue;

    DECL_RE.lastIndex = 0;
    let m;
    while ((m = DECL_RE.exec(cleaned))) {
      const prop = m[1];
      const value = m[2].trim();
      // Custom properties are appearance tokens, not layout.
      if (prop.startsWith("--")) continue;

      const p = prop.toLowerCase();
      let bad = false;
      if (p === "display") bad = displayForbidden(value);
      else bad = isForbiddenProp(p);

      if (!bad) continue;

      const lineNo = i + 1 + lineOffset;
      errors.push({
        line: lineNo,
        prop: p,
        value,
        message: reasonFor(p, value),
        ...(file ? { file } : {}),
      });
    }
  }

  return errors;
}

/**
 * @param {string} css
 * @param {{ file?: string, lineOffset?: number }} [opts]
 */
function assertUmcStyle(css, opts = {}) {
  const errors = lintUmcStyle(css, opts);
  if (!errors.length) return;
  const where = opts.file ? opts.file : "--- style ---";
  const body = errors
    .map((e) => `  ${where}:${e.line}: ${e.message}`)
    .join("\n");
  const err = new Error(
    `[umc] layout CSS is not allowed in widget styles (use panel attrs).\n` +
      `Add /* umc-layout-ok */ on a line to allow intentional chrome exceptions.\n` +
      body
  );
  err.umcStyleErrors = errors;
  throw err;
}

module.exports = {
  lintUmcStyle,
  assertUmcStyle,
  ALLOWED_DISPLAY,
  FORBIDDEN_PROPS,
};
