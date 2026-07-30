/** Injects widget.css once. Import this before widget.js to avoid FOUC. */

const STYLE_ATTR = "data-slatehtml";

export function injectStyles() {
  if (typeof document === "undefined") return null;

  const existing = document.querySelector(`link[${STYLE_ATTR}], style[${STYLE_ATTR}]`);
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./widget.css", import.meta.url).href;
  link.setAttribute(STYLE_ATTR, "");
  document.head.appendChild(link);
  return link;
}

injectStyles();
