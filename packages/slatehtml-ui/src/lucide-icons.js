/**
 * Curated Lucide icons for tree-shaking.
 * Add a PascalCase import + kebab-case entry when a widget needs a new icon:
 *   https://lucide.dev/icons/
 */
import {
  createElement,
  AtSign,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Search,
  X,
} from "lucide";

const NODES = {
  "at-sign": AtSign,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  hash: Hash,
  "log-in": LogIn,
  "log-out": LogOut,
  maximize: Maximize2,
  minimize: Minimize2,
  pause: Pause,
  play: Play,
  search: Search,
  x: X,
};

/** Build an SVG element for a registered Lucide icon name, or null. */
export function lucideSvg(name, attrs = {}) {
  const node = NODES[String(name || "").trim()];
  if (!node) return null;
  return createElement(node, attrs);
}

export function hasLucideIcon(name) {
  return Boolean(NODES[String(name || "").trim()]);
}
