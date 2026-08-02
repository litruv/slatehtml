/**
 * Parse a .umc (UMG/SlateHTML component) source file.
 *
 * Format:
 *
 *   @parent textblock   (optional, subclass a builtin / parent widget)
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
 *
 * File-level directives (before any section, or between sections on their
 * own line):
 *   @parent textblock
 *   @parent <textblock>
 *   @extends textblock
 */

const SECTION_RE =
  /^---\s*(html|template|style|css|script|js|preview|demo)\s*---\s*$/i;
const LINK_RE = /^@\s+(.+?)\s*$/;
/** `@parent textblock` / `@parent <textblock>` / `@extends umc-textblock` */
const PARENT_RE = /^@\s*(?:parent|extends)\s+<?([a-z][\w-]*)>?\s*$/i;

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
 *   parent: string,
 *   html: { kind: 'inline'|'link', value: string },
 *   style: { kind: 'inline'|'link', value: string },
 *   script: { kind: 'inline'|'link', value: string },
 *   preview: { kind: 'inline'|'link', value: string },
 * }}
 */
export function parseUmc(source) {
  const sections = {
    parent: "",
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
    const section = line.match(SECTION_RE);
    if (section) {
      flush();
      current = ALIASES[section[1].toLowerCase()];
      continue;
    }

    // File-level @parent / @extends, only when not inside a section buffer
    // that already has content, or always when current is null (preamble).
    if (!current || buf.length === 0) {
      const parent = line.match(PARENT_RE);
      if (parent) {
        sections.parent = parent[1].toLowerCase();
        continue;
      }
    }

    if (current) buf.push(line);
  }
  flush();

  return sections;
}
