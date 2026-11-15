/**
 * Shared modal shell behaviors (slate-modal, slate-dialog, slate-shadowbox).
 *
 * A widget calls four things:
 *   mountModal(el, api, triggerAttr, close)  Construct — role/aria, close + backdrop
 *                                           clicks, Escape, Tab trap, trigger registry.
 *                                           `close` is the widget's own close path
 *                                           (extra `closed` detail + side effects);
 *                                           core routes every close through it.
 *   syncModal(el, api, detail)              SynchronizeProperties — hidden/inert,
 *                                           portal, scroll lock, focus, `opened`;
 *                                           returns whether the host is open
 *   closeModal(el, api, reason, detail)     the widget's close path calls this, returns
 *                                           the `closed` payload (null when not open)
 *   unmountModal(el)                        Destroyed — false while portaling
 *
 * Templates mark the close control with `data-modal-close` and the backdrop with
 * `data-modal-backdrop`. Trigger attrs are copied by prefix: `dialog-title` → title,
 * `shadowbox-src` → src.
 */

const FOCUSABLE =
  'button,[href],input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])';

const liveModals = new Set();
const triggerAttrs = new Set();
let docClickBound = false;
let stackSeq = 0;

export function attrOn(el, name, fallback = true) {
  if (!el.hasAttribute(name)) return fallback;
  const v = String(el.getAttribute(name) ?? "")
    .trim()
    .toLowerCase();
  if (v === "" || v === "true" || v === "1" || v === "on") return true;
  if (v === "false" || v === "0" || v === "off") return false;
  return fallback;
}

function openModals() {
  return [...liveModals].filter((m) => m.hasAttribute("open"));
}

function topModal() {
  let top = null;
  for (const m of openModals()) {
    if (!top || (m._modalStackOrder || 0) > (top._modalStackOrder || 0)) top = m;
  }
  return top;
}

/**
 * Scroll lock shared by every open modal. The drawer keeps its own key; when it
 * locks on top of ours it saves our value as its own, so hand the original back
 * on release instead of restoring the stacked one.
 */
function syncScrollLock() {
  const root = document.documentElement;
  const drawerLock = root.dataset.slateDrawerScrollLock;
  if (openModals().length) {
    if (drawerLock != null) return; // drawer already locks the page
    if (root.dataset.slateModalScrollLock == null) {
      root.dataset.slateModalScrollLock = root.style.overflow || "";
      root.style.overflow = "hidden";
    }
    return;
  }
  if (root.dataset.slateModalScrollLock == null) return;
  const saved = root.dataset.slateModalScrollLock;
  delete root.dataset.slateModalScrollLock;
  if (drawerLock != null) {
    root.dataset.slateDrawerScrollLock = saved;
    return;
  }
  root.style.overflow = saved;
}

function portalModal(el) {
  if (!el._modalHome) el._modalHome = { parent: el.parentNode, next: el.nextSibling };
  if (el.parentNode === document.body) return;
  el._modalPortaling = true;
  document.body.appendChild(el);
  el._modalPortaling = false;
}

function restoreModalHome(el) {
  const home = el._modalHome;
  if (!home) return;
  // Destroyed fires while the host is already out of the tree; re-inserting
  // would re-attach a widget the caller removed.
  if (!el.isConnected || !home.parent?.isConnected) {
    el._modalHome = null;
    return;
  }
  // Clear the home before re-inserting: the move fires connectedCallback
  // synchronously, and syncModal would otherwise see the stale home and
  // re-insert forever.
  el._modalPortaling = true;
  el._modalHome = null;
  if (home.next && home.next.parentNode === home.parent) {
    home.parent.insertBefore(el, home.next);
  } else {
    home.parent.appendChild(el);
  }
  el._modalPortaling = false;
}

function focusables(el) {
  return [...el.querySelectorAll(FOCUSABLE)].filter(
    (n) => !n.hasAttribute("disabled") && !n.closest("[hidden]")
  );
}

function restoreFocus(el) {
  const saved = el._modalReturnFocus;
  el._modalReturnFocus = null;
  if (saved && typeof saved.focus === "function" && saved.isConnected) saved.focus();
}

function trapTab(el, event) {
  const items = focusables(el);
  if (!items.length) return;
  const i = items.indexOf(document.activeElement);
  if (i < 0) {
    event.preventDefault();
    items[0].focus();
    return;
  }
  const next = items[(i + (event.shiftKey ? -1 : 1) + items.length) % items.length];
  event.preventDefault();
  if (next !== document.activeElement) next.focus();
}

function findTrigger(event) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const node of path) {
    if (node instanceof Element && [...triggerAttrs].some((a) => node.hasAttribute(a))) {
      return node;
    }
  }
  const t = event.target;
  if (!(t instanceof Element)) return null;
  for (const a of triggerAttrs) {
    const hit = t.closest(`[${a}]`);
    if (hit) return hit;
  }
  return null;
}

/** Copy `<trigger>-<attr>` from a trigger onto the widget (shadowbox-src → src). */
export function applyTriggerAttrs(el, trigger) {
  const prefix = `${el._modalTrigger}-`;
  if (!(trigger instanceof Element)) return;
  for (const a of trigger.attributes) {
    if (!a.name.startsWith(prefix) || a.value === "") continue;
    el.setAttribute(a.name.slice(prefix.length), a.value);
  }
}

function onTriggerClick(event) {
  const trigger = findTrigger(event);
  if (!trigger) return;
  for (const el of liveModals) {
    const attr = el._modalTrigger;
    const id = attr ? trigger.getAttribute(attr) : "";
    if (!id || (el.id !== id && el.getAttribute("name") !== id)) continue;
    if (el.contains(trigger)) return;
    event.preventDefault();
    applyTriggerAttrs(el, trigger);
    el.setAttribute("open", "");
    return;
  }
}

export function mountModal(el, api, triggerAttr, closeFn) {
  el._modalTrigger = triggerAttr || "";
  el._modalClose = typeof closeFn === "function" ? closeFn : null;
  liveModals.add(el);
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");

  if (el._modalTrigger) {
    triggerAttrs.add(el._modalTrigger);
    if (!docClickBound) {
      docClickBound = true;
      document.addEventListener("click", onTriggerClick, true);
    }
  }

  if (el._modalBound) return;
  el._modalBound = true;

  const closeWith = (reason) =>
    el._modalClose ? el._modalClose(el, api, reason) : closeModal(el, api, reason);

  el.addEventListener("click", (event) => {
    const close = event.target?.closest?.("[data-modal-close]");
    if (close && el.contains(close)) {
      event.preventDefault();
      closeWith("close");
      return;
    }
    const backdrop = event.target?.closest?.("[data-modal-backdrop]");
    if (backdrop && el.contains(backdrop) && attrOn(el, "close-backdrop", true)) {
      closeWith("backdrop");
    }
  });

  el._modalKey = (event) => {
    if (!el.hasAttribute("open") || topModal() !== el) return;
    if (event.key === "Escape") {
      if (!attrOn(el, "close-escape", true)) return;
      event.preventDefault();
      closeWith("escape");
      return;
    }
    if (!el.contains(document.activeElement)) return;
    if (event.key === "Tab") {
      trapTab(el, event);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && document.activeElement?.matches?.("[data-modal-close]")) {
      event.preventDefault();
      closeWith("close");
    }
  };
  document.addEventListener("keydown", el._modalKey);
}

export function closeModal(el, api, reason, detail = {}) {
  if (!el.hasAttribute("open")) return null;
  const wasOpen = el._wasOpen;
  el.removeAttribute("open");
  if (wasOpen) restoreFocus(el);
  el._wasOpen = false;
  restoreModalHome(el);
  syncScrollLock();
  const payload = { reason: reason || "dismiss", ...detail };
  api.emit("closed", payload);
  return payload;
}

export function syncModal(el, api, detail = {}) {
  const open = el.hasAttribute("open");
  const root = el.firstElementChild;
  root?.toggleAttribute("hidden", !open);
  if (root) root.inert = !open;
  el.setAttribute("aria-hidden", open ? "false" : "true");

  if (open) portalModal(el);
  else if (el._modalHome) restoreModalHome(el);
  syncScrollLock();

  if (open && !el._wasOpen) {
    el._wasOpen = true;
    el._modalStackOrder = ++stackSeq;
    el._modalReturnFocus = document.activeElement;
    const items = focusables(el);
    if (items.length) items[0].focus();
    api.emit("opened", detail);
  } else if (!open) {
    el._wasOpen = false;
  }
  return open;
}

/** Returns false when the move to document.body caused the brief disconnect. */
export function unmountModal(el) {
  if (el._modalPortaling) return false;
  liveModals.delete(el);
  if (!liveModals.size && docClickBound) {
    docClickBound = false;
    document.removeEventListener("click", onTriggerClick, true);
  }
  if (el._modalKey) {
    document.removeEventListener("keydown", el._modalKey);
    el._modalKey = null;
  }
  el._modalBound = false;
  return true;
}
