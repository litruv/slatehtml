/**
 * Runtime settings for slatehtml-ui (icons, defaults).
 *
 *   import { configure, getSettings, lucideSvg } from "slatehtml-ui/configure";
 *   // Optional alternate set:
 *   // import { fontAwesomeSvg } from "slatehtml-ui/icons/fontawesome";
 *
 *   configure({
 *     iconSize: "18",
 *     iconStrokeWidth: "1.75",
 *     icons: (name, attrs) => myIcon(name, attrs) ?? lucideSvg(name, attrs),
 *     // or: icons: fontAwesomeSvg,
 *   });
 */
import { lucideSvg } from "./lucide-icons.js";

const CONFIGURE_EVENT = "slatehtml-ui:configure";

const settings = {
  /**
   * Icon resolver `(name, attrs) => SVGElement | null`.
   * Default: Lucide. Return null for unknown names.
   */
  icons: lucideSvg,
  /** Default size when slate-icon has no size attr. */
  iconSize: "16",
  /** Default stroke-width when slate-icon has no stroke-width attr. */
  iconStrokeWidth: "2",
  /**
   * OS override for shortcuts / <slate-platform>:
   *   "auto" | "mac" | "windows" | "linux"
   */
  platform: "auto",
};

function isFn(v) {
  return typeof v === "function";
}

/**
 * Merge UI settings. Returns a shallow copy of the active settings.
 * Dispatches a refresh so mounted `slate-icon` elements repaint.
 */
export function configure(partial = {}) {
  if (partial && typeof partial === "object") {
    if ("icons" in partial) {
      settings.icons = isFn(partial.icons) ? partial.icons : lucideSvg;
    }
    if ("iconSize" in partial && partial.iconSize != null && partial.iconSize !== "") {
      settings.iconSize = String(partial.iconSize);
    }
    if (
      "iconStrokeWidth" in partial &&
      partial.iconStrokeWidth != null &&
      partial.iconStrokeWidth !== ""
    ) {
      settings.iconStrokeWidth = String(partial.iconStrokeWidth);
    }
    if ("platform" in partial && partial.platform != null && partial.platform !== "") {
      settings.platform = String(partial.platform);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONFIGURE_EVENT));
  }
  return getSettings();
}

export function getSettings() {
  return {
    icons: settings.icons,
    iconSize: settings.iconSize,
    iconStrokeWidth: settings.iconStrokeWidth,
    platform: settings.platform,
  };
}

function isIconNode(node) {
  if (node == null || typeof node !== "object") return false;
  if (typeof Node !== "undefined" && node instanceof Node) return true;
  // Node tests / shims without DOM Node
  return node.nodeType === 1;
}

/** Resolve an icon via the active provider (default Lucide). */
export function resolveIcon(name, attrs = {}) {
  const fn = isFn(settings.icons) ? settings.icons : lucideSvg;
  try {
    const node = fn(name, attrs);
    return isIconNode(node) ? node : null;
  } catch (err) {
    console.error("[slatehtml-ui] icons() failed", err);
    return null;
  }
}

export function defaultIconSize() {
  return settings.iconSize || "16";
}

export function defaultIconStrokeWidth() {
  return settings.iconStrokeWidth || "2";
}

/** Subscribe to configure() (used by slate-icon). Returns unsubscribe. */
export function onConfigure(fn) {
  if (typeof window === "undefined" || typeof fn !== "function") return () => {};
  window.addEventListener(CONFIGURE_EVENT, fn);
  return () => window.removeEventListener(CONFIGURE_EVENT, fn);
}

export { lucideSvg, CONFIGURE_EVENT };
