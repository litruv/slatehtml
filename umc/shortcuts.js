/**
 * Global keyboard shortcut registry for SlateHTML / UMC.
 *
 *   import { registerShortcut, matchShortcut, formatShortcut } from "slatehtml/umc";
 *
 *   const stop = registerShortcut("mod+S", (ev) => { ev.preventDefault(); save(); });
 *   stop(); // unregister
 *
 * defineUmc({
 *   shortcuts: {
 *     "mod+S": (el, api, ev) => api.emit("saved"),
 *     "mod+Enter": "submitted", // emit event name
 *   },
 * });
 *
 * Host attr: shortcut="mod+S" → fires `shortcut` / click when pressed.
 */

let seq = 0;
/** @type {Map<number, ShortcutBinding>} */
const bindings = new Map();
let listening = false;

/**
 * @typedef {{
 *   id: number,
 *   spec: string,
 *   parsed: ParsedShortcut,
 *   handler: (event: KeyboardEvent) => void,
 *   el?: Element | null,
 *   allowInInputs?: boolean,
 *   priority?: number,
 * }} ShortcutBinding
 *
 * @typedef {{
 *   key: string,
 *   mod: boolean,
 *   ctrl: boolean,
 *   alt: boolean,
 *   shift: boolean,
 *   meta: boolean,
 * }} ParsedShortcut
 */

function isMacHost() {
  if (typeof navigator === "undefined") return false;
  try {
    const p = navigator.userAgentData?.platform;
    if (p && /mac/i.test(p)) return true;
  } catch {
    /* ignore */
  }
  const plat = String(navigator.platform || "");
  const ua = String(navigator.userAgent || "");
  return /Mac|iPhone|iPad|iPod/i.test(plat) || /Mac OS X|iPhone|iPad/i.test(ua);
}

const MOD_NAMES = new Set([
  "mod",
  "cmd",
  "command",
  "meta",
  "ctrl",
  "control",
  "alt",
  "option",
  "shift",
]);

/**
 * Parse "mod+shift+S" / "⌘⇧S" into a matcher descriptor.
 * `mod` means Meta on Mac, Ctrl elsewhere.
 */
export function parseShortcut(spec) {
  const raw = String(spec || "").trim();
  if (!raw) return null;

  /** @type {ParsedShortcut} */
  const out = {
    key: "",
    mod: false,
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };

  if (/[⌘⌥⌃⇧]/.test(raw)) {
    const compact = raw.replace(/\s+/g, "");
    out.meta = compact.includes("⌘");
    out.alt = compact.includes("⌥");
    out.ctrl = compact.includes("⌃");
    out.shift = compact.includes("⇧");
    out.mod = out.meta; // glyph form already chose meta
    const key = compact.replace(/[⌘⌥⌃⇧+]/g, "");
    out.key = key.length === 1 ? key.toLowerCase() : key.toLowerCase();
    return out.key ? out : null;
  }

  const parts = raw.split(/[+\-]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;

  for (const part of parts) {
    const low = part.toLowerCase();
    if (low === "mod") {
      out.mod = true;
      continue;
    }
    if (low === "cmd" || low === "command" || low === "meta") {
      out.meta = true;
      out.mod = true;
      continue;
    }
    if (low === "ctrl" || low === "control") {
      out.ctrl = true;
      continue;
    }
    if (low === "alt" || low === "option") {
      out.alt = true;
      continue;
    }
    if (low === "shift") {
      out.shift = true;
      continue;
    }
    out.key = low;
  }

  return out.key ? out : null;
}

/**
 * Display label for a shortcut spec (⌘C on Mac, Ctrl+C elsewhere).
 */
export function formatShortcut(spec, mac = isMacHost()) {
  const raw = String(spec || "").trim();
  if (!raw) return "";

  if (/[⌘⌥⌃⇧]/.test(raw)) {
    if (mac) return raw.replace(/\s+/g, "");
    return raw
      .replace(/⌘/g, "Ctrl+")
      .replace(/⌥/g, "Alt+")
      .replace(/⌃/g, "Ctrl+")
      .replace(/⇧/g, "Shift+")
      .replace(/\++/g, "+")
      .replace(/\+$/g, "")
      .replace(/\s+/g, "");
  }

  const parts = raw.split(/[+\-]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return raw;

  const macMap = {
    mod: "⌘",
    cmd: "⌘",
    command: "⌘",
    meta: "⌘",
    ctrl: "⌃",
    control: "⌃",
    alt: "⌥",
    option: "⌥",
    shift: "⇧",
  };
  const pcMap = {
    mod: "Ctrl",
    cmd: "Ctrl",
    command: "Ctrl",
    meta: "Ctrl",
    ctrl: "Ctrl",
    control: "Ctrl",
    alt: "Alt",
    option: "Alt",
    shift: "Shift",
  };
  const map = mac ? macMap : pcMap;
  const out = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (map[key]) out.push(map[key]);
    else out.push(part.length === 1 ? part.toUpperCase() : part);
  }
  return mac ? out.join("") : out.join("+");
}

/** Does this KeyboardEvent match a parsed shortcut? */
export function matchShortcut(event, specOrParsed) {
  if (!event || typeof event !== "object") return false;
  // Allow tests / shims without a real KeyboardEvent instance.
  if (typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) {
    /* ok */
  } else if (event.type && event.type !== "keydown" && event.type !== "keyup") {
    return false;
  }

  const parsed =
    typeof specOrParsed === "string" ? parseShortcut(specOrParsed) : specOrParsed;
  if (!parsed?.key) return false;

  const key = String(event.key || "").toLowerCase();
  const code = String(event.code || "");
  const want = parsed.key.toLowerCase();

  let keyOk = key === want;
  if (!keyOk && want.length === 1) {
    const letter = /^key([a-z])$/i.exec(code);
    const digit = /^digit([0-9])$/i.exec(code);
    if (letter) keyOk = letter[1].toLowerCase() === want;
    else if (digit) keyOk = digit[1] === want;
  }
  if (!keyOk && want.startsWith("f") && /^f\d{1,2}$/.test(want)) {
    keyOk = key === want;
  }
  if (!keyOk) return false;

  const mac = isMacHost();
  const wantCtrl = parsed.ctrl || (parsed.mod && !mac);
  const wantMeta = parsed.meta || (parsed.mod && mac);

  if (!!event.ctrlKey !== wantCtrl) return false;
  if (!!event.metaKey !== wantMeta) return false;
  if (!!event.altKey !== parsed.alt) return false;
  if (!!event.shiftKey !== parsed.shift) return false;

  if (MOD_NAMES.has(key)) return false;

  return true;
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) return false;
  const tag = target.localName?.toLowerCase() || "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  if (target.closest?.("editabletext, umc-editabletext, [contenteditable=true]")) {
    return true;
  }
  return false;
}

function onDocKeydown(event) {
  if (event.defaultPrevented) return;
  if (bindings.size === 0) return;

  const list = [...bindings.values()].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  for (const binding of list) {
    if (binding.el && !binding.el.isConnected) continue;
    if (!binding.allowInInputs && isTypingTarget(event.target)) continue;
    if (!matchShortcut(event, binding.parsed)) continue;
    try {
      binding.handler(event);
    } catch (err) {
      console.error("[umc] shortcut handler failed", binding.spec, err);
    }
    break;
  }
}

function ensureListening() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("keydown", onDocKeydown, true);
}

/**
 * Register a global shortcut. Returns an unregister function.
 *
 *   registerShortcut("mod+S", (ev) => { ev.preventDefault(); save(); })
 *   registerShortcut("mod+K", handler, { el, allowInInputs: true, priority: 10 })
 */
export function registerShortcut(spec, handler, opts = {}) {
  const parsed = parseShortcut(spec);
  if (!parsed || typeof handler !== "function") {
    return () => {};
  }
  const id = ++seq;
  /** @type {ShortcutBinding} */
  const binding = {
    id,
    spec: String(spec).trim(),
    parsed,
    handler,
    el: opts.el ?? null,
    allowInInputs: Boolean(opts.allowInInputs),
    priority: Number(opts.priority) || 0,
  };
  bindings.set(id, binding);
  ensureListening();
  return () => {
    bindings.delete(id);
  };
}

/** Unregister by id returned from an older API, or clear all for an element. */
export function unregisterShortcut(idOrEl) {
  if (typeof idOrEl === "number") {
    bindings.delete(idOrEl);
    return;
  }
  if (idOrEl instanceof Element) {
    for (const [id, b] of bindings) {
      if (b.el === idOrEl) bindings.delete(id);
    }
  }
}

/** Clear every binding (tests). */
export function clearShortcuts() {
  bindings.clear();
}

/** Active bindings snapshot (debug / tests). */
export function listShortcuts() {
  return [...bindings.values()].map((b) => ({
    id: b.id,
    spec: b.spec,
    priority: b.priority || 0,
    el: b.el?.localName || null,
  }));
}

/**
 * Bind defineUmc `shortcuts` map onto a host. Returns disposer.
 * Values: function (el, api, event) | string event name to emit.
 */
export function installDefShortcuts(el, api, shortcuts) {
  if (!shortcuts || typeof shortcuts !== "object") return () => {};
  const stops = [];
  for (const [spec, action] of Object.entries(shortcuts)) {
    if (!spec) continue;
    const stop = registerShortcut(
      spec,
      (event) => {
        if (!el.isConnected) return;
        if (el.hasAttribute("disabled")) return;
        event.preventDefault();
        if (typeof action === "function") {
          action.call(el, el, api, event);
        } else if (typeof action === "string" && action) {
          api.emit(action, { shortcut: spec, key: event.key });
        }
      },
      { el, priority: 0 }
    );
    stops.push(stop);
  }
  return () => {
    for (const stop of stops) stop();
  };
}

/**
 * Host `shortcut="mod+S"` attr: on match, emit `shortcut` and synthesize click.
 */
export function syncHostShortcutAttr(el, api) {
  const prev = el.__umcShortcutAttrStop;
  if (typeof prev === "function") {
    prev();
    el.__umcShortcutAttrStop = null;
  }
  const spec = (el.getAttribute("shortcut") || "").trim();
  if (!spec) return;
  el.__umcShortcutAttrStop = registerShortcut(
    spec,
    (event) => {
      if (!el.isConnected || el.hasAttribute("disabled")) return;
      event.preventDefault();
      api.emit("shortcut", { shortcut: spec, key: event.key });
      el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
      );
    },
    { el }
  );
}

export function disposeHostShortcutAttr(el) {
  if (typeof el.__umcShortcutAttrStop === "function") {
    el.__umcShortcutAttrStop();
    el.__umcShortcutAttrStop = null;
  }
  unregisterShortcut(el);
}
