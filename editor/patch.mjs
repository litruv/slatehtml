/**
 * Rewrite one attribute on one source line of a .umc file.
 * Every other byte is left identical, including line endings.
 * Assumes one opening tag per line (same assumption as
 * editors/vscode-umc/preview.js:95 annotateHtmlWithSourceLines).
 * An empty value removes the attribute.
 */

const TAG_RE = /<([A-Za-z][\w-]*)((?:\s[^>/]*)?)(\s*\/?)>/;
const TOKEN_RE = /(\s*)([A-Za-z_:][\w:-]*)((?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s">]+))?)/g;

/**
 * @param {string} source full .umc source
 * @param {number} lineNo 1-based line holding the opening tag
 * @param {string} attr attribute name
 * @param {string} value new value ("" removes the attribute)
 * @returns {string} patched source, unchanged if the line has no opening tag
 */
export function patchAttr(source, lineNo, attr, value) {
  const parts = String(source).split(/(\r?\n)/);
  const i = (lineNo - 1) * 2;
  const line = parts[i];
  const tag = line && line.match(TAG_RE);
  if (!tag) return source;

  let attrs = tag[2] || "";
  let token = null;
  for (const match of attrs.matchAll(TOKEN_RE)) {
    if (match[2].toLowerCase() === String(attr).toLowerCase()) {
      token = match;
      break;
    }
  }

  const v = String(value ?? "");
  if (v === "") {
    if (!token) return source;
    attrs = attrs.slice(0, token.index) + attrs.slice(token.index + token[0].length);
  } else {
    const quote = v.includes('"') ? "'" : '"';
    const pair = `${attr}=${quote}${v}${quote}`;
    const tail = attrs.match(/\s*$/)[0];
    attrs = token
      ? attrs.slice(0, token.index) + token[1] + pair + attrs.slice(token.index + token[0].length)
      : `${attrs.slice(0, attrs.length - tail.length)} ${pair}${tail}`;
  }

  const patched =
    line.slice(0, tag.index) + `<${tag[1]}${attrs}${tag[3]}>` +
    line.slice(tag.index + tag[0].length);
  return parts.slice(0, i).join("") + patched + parts.slice(i + 1).join("");
}
