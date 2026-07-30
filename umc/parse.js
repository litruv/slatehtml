/**
 * Parse a .umc (UMG/SlateHTML component) source file.
 *
 * Format:
 *
 *   --- html ---
 *   ...markup, or a single line: @ ./relative.html
 *
 *   --- style ---
 *   ...css, or: @ ./relative.css
 *
 *   --- script ---
 *   ...js, or: @ ./relative.js
 *
 *   --- preview ---
 *   ...markup rendered by the editor preview (ignored at build time)
 *
 * Sections are optional. Separators are lines matching
 *   --- html|template|style|css|script|js|preview|demo ---
 * Content may be blank.
 */

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

/**
 * @param {string} source
 * @returns {{
 *   html: { kind: 'inline'|'link', value: string },
 *   style: { kind: 'inline'|'link', value: string },
 *   script: { kind: 'inline'|'link', value: string },
 *   preview: { kind: 'inline'|'link', value: string },
 * }}
 */
export function parseUmc(source) {
  const sections = {
    html: { kind: "inline", value: "" },
    style: { kind: "inline", value: "" },
    script: { kind: "inline", value: "" },
    preview: { kind: "inline", value: "" },
  };

  const lines = String(source).replace(/^\uFEFF/, "").split(/\r?\n/);
  let current = null;
  const buf = [];

  const flush = () => {
    if (!current) return;
    const raw = buf.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
    buf.length = 0;
    const link = raw.match(LINK_RE);
    if (link && !raw.includes("\n")) {
      sections[current] = { kind: "link", value: link[1].trim() };
    } else {
      sections[current] = { kind: "inline", value: raw };
    }
  };

  for (const line of lines) {
    const m = line.match(SECTION_RE);
    if (m) {
      flush();
      current = ALIASES[m[1].toLowerCase()];
      continue;
    }
    if (current) buf.push(line);
  }
  flush();

  return sections;
}
