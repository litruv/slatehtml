/**
 * OS / platform helpers for slatehtml-ui.
 *
 *   import { platform, formatShortcut, isMac } from "slatehtml-ui/platform";
 *
 *   platform()              → "mac" | "windows" | "linux" | "unknown"
 *   formatShortcut("mod+C") → "⌘C" on Mac, "Ctrl+C" elsewhere
 *
 * Override via configure({ platform: "mac" | "windows" | "linux" | "auto" }).
 *
 * Keyboard matching / global registration live in `slatehtml/umc` (registerShortcut).
 */

import { getSettings, onConfigure, configure as configureUi } from "./configure.js";
import {
  formatShortcut as formatShortcutCore,
  parseShortcut,
  matchShortcut,
  registerShortcut,
} from "../../../umc/shortcuts.js";

const PLATFORM_EVENT = "slatehtml-ui:platform";

/** @typedef {"mac" | "windows" | "linux" | "unknown"} PlatformId */

const ALIASES = {
  mac: "mac",
  macos: "mac",
  osx: "mac",
  darwin: "mac",
  ios: "mac",
  windows: "windows",
  win: "windows",
  win32: "windows",
  win64: "windows",
  linux: "linux",
  ubuntu: "linux",
  debian: "linux",
  fedora: "linux",
  android: "linux",
  chromeos: "linux",
  cros: "linux",
};

function normalizePlatform(raw) {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  return ALIASES[key] || null;
}

function detectPlatform() {
  if (typeof navigator === "undefined") return "unknown";

  try {
    const uaData = navigator.userAgentData;
    if (uaData?.platform) {
      const fromUa = normalizePlatform(uaData.platform);
      if (fromUa) return fromUa;
    }
  } catch {
    /* ignore */
  }

  const plat = String(navigator.platform || "");
  const ua = String(navigator.userAgent || "");
  if (/Mac|iPhone|iPad|iPod/i.test(plat) || /Mac OS X|iPhone|iPad/i.test(ua)) {
    return "mac";
  }
  if (/Win/i.test(plat) || /Windows/i.test(ua)) return "windows";
  if (/Linux|X11|Android|CrOS/i.test(plat) || /Linux|Android|CrOS/i.test(ua)) {
    return "linux";
  }
  return "unknown";
}

/** Active platform, honoring configure({ platform }). */
export function platform() {
  const mode = String(getSettings().platform || "auto").toLowerCase();
  if (mode && mode !== "auto") {
    const n = normalizePlatform(mode);
    if (n) return n;
  }
  return detectPlatform();
}

export function isMac() {
  return platform() === "mac";
}

export function isWindows() {
  return platform() === "windows";
}

export function isLinux() {
  return platform() === "linux";
}

/**
 * Whether a branch tag / attr matches the active platform.
 * Accepts mac|windows|linux plus aliases; `default` / `other` match as fallback.
 */
export function platformMatches(name, active = platform()) {
  const n = String(name || "")
    .trim()
    .toLowerCase();
  if (!n) return false;
  if (n === "default" || n === "other" || n === "fallback") return true;
  const id = normalizePlatform(n);
  return Boolean(id && active === id);
}

/** Platform-aware shortcut label (uses configure platform override when set). */
export function formatShortcut(spec) {
  return formatShortcutCore(spec, platform() === "mac");
}

/** Notify platform listeners (slate-platform, menu shortcuts). */
export function notifyPlatform() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLATFORM_EVENT));
}

/** Subscribe to platform / configure changes. */
export function onPlatform(fn) {
  if (typeof window === "undefined" || typeof fn !== "function") return () => {};
  const wrap = () => fn(platform());
  window.addEventListener(PLATFORM_EVENT, wrap);
  const offConfig = onConfigure(wrap);
  return () => {
    window.removeEventListener(PLATFORM_EVENT, wrap);
    offConfig();
  };
}

/**
 * Force platform for demos / tests.
 *   setPlatform("mac") | setPlatform("auto")
 */
export function setPlatform(id = "auto") {
  configureUi({ platform: id });
  notifyPlatform();
  return platform();
}

export {
  PLATFORM_EVENT,
  detectPlatform,
  normalizePlatform,
  parseShortcut,
  matchShortcut,
  registerShortcut,
};
