/**
 * Click-drag scrolling for scrollboxes (mouse/pen, touch already pans natively).
 *
 * Enabled via `configure({ dragScroll: true })` or per-box `drag-scroll`.
 * Opt out: `drag-scroll="false"`.
 *
 * Works over buttons, links, labels, and list chrome inside a scrollbox.
 * Skips only explicit selection/editing surfaces: `user-select: text|all`,
 * `pre`/`code`/`[selectable]`, text fields, and pointer-owned controls.
 */

/** Controls that own the pointer gesture, don't steal for scroll. */
const SKIP_POINTER_OWNED =
  "input,textarea,select,option," +
  "[contenteditable=''],[contenteditable=true]," +
  "editabletext,umc-editabletext," +
  "[role=slider],[role=scrollbar],[role=textbox]," +
  "slate-slider,slate-text-field,slate-select," +
  "slate-dropdown,slate-combobox,slate-autocomplete";

/** Explicit selection / editing surfaces. */
const SELECTABLE_MARK =
  "pre,code,[selectable],[data-selectable]," +
  "input,textarea,[contenteditable=''],[contenteditable=true]," +
  "editabletext,umc-editabletext";

const THRESHOLD_PX = 3;
const SCROLLBOX_SEL = "scrollbox, umc-scrollbox";

/** @type {{ enabled: (el: Element) => boolean } | null} */
let apiRef = null;
let docBound = false;

/** @type {null | {
 *   pointerId: number,
 *   x: number,
 *   y: number,
 *   left: number,
 *   top: number,
 *   moved: boolean,
 *   scrollbox: Element,
 * }} */
let gesture = null;

function isSelectableTextTarget(target, scrollbox) {
  let node =
    target instanceof Element
      ? target
      : target && target.parentElement
        ? target.parentElement
        : null;
  if (!node) return false;

  if (node.closest(SELECTABLE_MARK)) {
    const zone = node.closest(SELECTABLE_MARK);
    if (zone && getComputedStyle(zone).userSelect === "none") return false;
    return true;
  }

  // Only block when something under the finger opts into selection.
  while (node && node !== scrollbox) {
    if (node instanceof Element) {
      const us = getComputedStyle(node).userSelect;
      if (us === "none") return false;
      if (us === "text" || us === "all") return true;
    }
    node = node.parentElement;
  }
  return false;
}

function shouldSkipDrag(target, scrollbox) {
  if (!(target instanceof Element) && !(target && target.parentElement)) {
    return true;
  }
  const el = target instanceof Element ? target : target.parentElement;
  if (el.closest(SKIP_POINTER_OWNED)) return true;
  return isSelectableTextTarget(el, scrollbox);
}

function canScroll(el) {
  return (
    el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1
  );
}

/** Nearest enabled scrollbox under `node` (prefer one that can actually scroll). */
function findScrollbox(node, enabled) {
  let el =
    node instanceof Element
      ? node
      : node && node.parentElement
        ? node.parentElement
        : null;
  /** @type {Element | null} */
  let fallback = null;
  while (el) {
    if (el.matches?.(SCROLLBOX_SEL) && enabled(el)) {
      if (canScroll(el)) return el;
      if (!fallback) fallback = el;
    }
    el = el.parentElement;
  }
  return fallback;
}

function endGesture() {
  if (!gesture) return;
  const { moved, scrollbox } = gesture;
  gesture = null;
  scrollbox.classList.remove("umc-drag-scrolling");
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
  if (moved) {
    const suppress = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    // Capture on document so <a> navigation / button click cannot fire.
    document.addEventListener("click", suppress, { capture: true, once: true });
    document.addEventListener("auxclick", suppress, {
      capture: true,
      once: true,
    });
  }
}

function onMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  const dx = e.clientX - gesture.x;
  const dy = e.clientY - gesture.y;
  if (!gesture.moved) {
    if (Math.hypot(dx, dy) < THRESHOLD_PX) return;
    gesture.moved = true;
    gesture.scrollbox.classList.add("umc-drag-scrolling");
    try {
      gesture.scrollbox.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  e.preventDefault();
  gesture.scrollbox.scrollLeft = gesture.left - dx;
  gesture.scrollbox.scrollTop = gesture.top - dy;
}

function onUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  endGesture();
}

function onDragStart(e) {
  // Native <a>/img drag steals the gesture, always kill it while we may scroll.
  if (!apiRef) return;
  const scrollbox = findScrollbox(e.target, apiRef.enabled);
  if (scrollbox) e.preventDefault();
}

function onPointerDownCapture(e) {
  if (!apiRef) return;
  if (e.button !== 0) return;
  if (e.pointerType === "touch") return;
  if (gesture) endGesture();

  const scrollbox = findScrollbox(e.target, apiRef.enabled);
  if (!scrollbox) return;
  if (shouldSkipDrag(e.target, scrollbox)) return;

  gesture = {
    pointerId: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    left: scrollbox.scrollLeft,
    top: scrollbox.scrollTop,
    moved: false,
    scrollbox,
  };
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function bindDocument() {
  if (docBound || typeof document === "undefined") return;
  docBound = true;
  document.addEventListener("pointerdown", onPointerDownCapture, true);
  document.addEventListener("dragstart", onDragStart, true);
}

function unbindDocument() {
  if (!docBound || typeof document === "undefined") return;
  docBound = false;
  endGesture();
  document.removeEventListener("pointerdown", onPointerDownCapture, true);
  document.removeEventListener("dragstart", onDragStart, true);
}

/**
 * Keep class hooks on each scrollbox; real listening is document-capture.
 * @param {Element} el
 * @param {{ enabled: (el: Element) => boolean }} api
 */
export function bindDragScroll(el, api) {
  if (!(el instanceof Element)) return;
  apiRef = api;

  const enabled = api.enabled(el);
  el.classList.toggle("umc-drag-scroll", enabled);

  // Tear down any legacy per-box listeners from earlier builds.
  el._dragScrollCleanup?.();
  el._dragScrollCleanup = null;
  el._dragScrollBound = enabled;

  if (enabled) bindDocument();
  else if (typeof document !== "undefined") {
    const any = [...document.querySelectorAll(SCROLLBOX_SEL)].some((node) =>
      api.enabled(node)
    );
    if (!any) unbindDocument();
  }
}

/** Refresh class hooks; ensure document listener matches settings. */
export function rebindDragScroll(root, api) {
  apiRef = api;
  const scope = root && root.querySelectorAll ? root : document;
  if (!scope?.querySelectorAll) return;

  let any = false;
  for (const el of scope.querySelectorAll(SCROLLBOX_SEL)) {
    bindDragScroll(el, api);
    if (api.enabled(el)) any = true;
  }
  if (any) bindDocument();
  else unbindDocument();
}
