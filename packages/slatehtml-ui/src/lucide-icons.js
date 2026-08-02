/**
 * All Lucide icons (kebab-case names, same as https://lucide.dev/icons/).
 */
import { createElement, icons } from "lucide";

/** Match Lucide’s `toPascalCase` so `chevron-down` → `ChevronDown`. */
function toPascalCase(string) {
  const camel = String(string || "").replace(
    /^([A-Z])|[\s-_]+(\w)/g,
    (_match, p1, p2) => (p2 ? p2.toUpperCase() : p1.toLowerCase())
  );
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function iconNode(name) {
  const key = toPascalCase(String(name || "").trim());
  return key ? icons[key] : null;
}

/** Build an SVG element for a Lucide icon name, or null. */
export function lucideSvg(name, attrs = {}) {
  const node = iconNode(name);
  if (!node) return null;
  return createElement(node, attrs);
}

export function hasLucideIcon(name) {
  return Boolean(iconNode(name));
}
