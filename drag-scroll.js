/**
 * Click-drag scrolling for scrollboxes (mouse/pen, touch already pans natively).
 *
 * Enabled via `configure({ dragScroll: true })` or per-box `drag-scroll`.
 * Opt out: `drag-scroll="false"`.
 *
 * Works over buttons, links, labels, and list chrome inside a scrollbox.
 * Skips pointer-owned controls (fields, sliders, menus). For selectable text
 * (`user-select: text|all`, `pre`/`code`/`[selectable]`), skips only when a
 * glyph is under the pointer — empty padding in those boxes still scrolls.
 *
 * Release after a flick keeps coasting with decelerating velocity.
 */

/** Controls that own the pointer gesture, don't steal for scroll. */
const SKIP_POINTER_OWNED =
  "input,textarea,select,option," +
  "[contenteditable=''],[contenteditable=true]," +
  "editabletext,umc-editabletext," +
  "[role=slider],[role=scrollbar],[role=textbox]," +
  "slate-slider,slate-text-field,slate-select," +
  "slate-dropdown,slate-combobox,slate-autocomplete";

/** Explicit selection surfaces (glyph hit-tested; not whole-box). */
const SELECTABLE_MARK = "pre,code,[selectable],[data-selectable]";

const THRESHOLD_PX = 3;
const GLYPH_HIT_PAD = 3;
const SCROLLBOX_SEL = "scrollbox, umc-scrollbox";
/** Keep recent pointer samples for flick velocity (ms). */
const VELOCITY_WINDOW_MS = 100;
/** px/ms — below this, stop coasting. */
const VELOCITY_STOP = 0.02;
/** Per-frame multiply (~60fps → settles in ~300–500ms). */
const FRICTION = 0.95;
/** Cap release speed so a wild flick doesn't fly forever (px/ms). */
const VELOCITY_MAX = 3.5;

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
 *   samples: { t: number, x: number, y: number }[],
 * }} */
let gesture = null;

/** @type {null | {
 *   scrollbox: Element,
 *   vx: number,
 *   vy: number,
 *   last: number,
 *   raf: number,
 * }} */
let momentum = null;

/**
 * True when (x,y) lands on a rendered text glyph, not just a text element's box.
 * Uses caret hit-testing + character rect proximity.
 */
function hasGlyphAtPoint(x, y) {
  let range = null;
  if (typeof document.caretRangeFromPoint === "function") {
    range = document.caretRangeFromPoint(x, y);
  } else if (typeof document.caretPositionFromPoint === "function") {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos?.offsetNode) {
      range = document.createRange();
      try {
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      } catch {
        return false;
      }
    }
  }
  if (!range) return false;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = node.textContent ?? "";
  if (!text.length) return false;

  const offset = Math.min(range.startOffset, text.length);
  const probe = document.createRange();
  try {
    if (offset > 0) {
      probe.setStart(node, offset - 1);
      probe.setEnd(node, offset);
    } else {
      probe.setStart(node, 0);
      probe.setEnd(node, Math.min(1, text.length));
    }
  } catch {
    return false;
  }

  const pad = GLYPH_HIT_PAD;
  for (const rect of probe.getClientRects()) {
    if (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    ) {
      return true;
    }
  }
  return false;
}

function isSelectableTextTarget(target, scrollbox, x, y) {
  let node =
    target instanceof Element
      ? target
      : target && target.parentElement
        ? target.parentElement
        : null;
  if (!node) return false;

  let selectable = false;
  if (node.closest(SELECTABLE_MARK)) {
    const zone = node.closest(SELECTABLE_MARK);
    if (zone && getComputedStyle(zone).userSelect === "none") return false;
    selectable = true;
  } else {
    // Only block when something under the finger opts into selection.
    let walk = node;
    while (walk && walk !== scrollbox) {
      if (walk instanceof Element) {
        const us = getComputedStyle(walk).userSelect;
        if (us === "none") return false;
        if (us === "text" || us === "all") {
          selectable = true;
          break;
        }
      }
      walk = walk.parentElement;
    }
  }

  if (!selectable) return false;
  // Prefer glyph hit-test so padding / empty lines still drag-scroll.
  if (typeof x === "number" && typeof y === "number") {
    return hasGlyphAtPoint(x, y);
  }
  return true;
}

function shouldSkipDrag(target, scrollbox, x, y) {
  if (!(target instanceof Element) && !(target && target.parentElement)) {
    return true;
  }
  const el = target instanceof Element ? target : target.parentElement;
  if (el.closest(SKIP_POINTER_OWNED)) return true;
  return isSelectableTextTarget(el, scrollbox, x, y);
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
    // Fixed overlays (drawers/dialogs) sit in the page tree but must not
    // climb into the gallery scroller when their own body can't scroll.
    if (el instanceof Element) {
      if (
        el.classList.contains("slate-drawer-root") ||
        el.classList.contains("slate-dialog-root") ||
        el.getAttribute("role") === "dialog"
      ) {
        break;
      }
      const pos = getComputedStyle(el).position;
      if (pos === "fixed" || pos === "sticky") break;
    }
    el = el.parentElement;
  }
  return fallback;
}

function pushSample(g, x, y, t = performance.now()) {
  g.samples.push({ t, x, y });
  const cutoff = t - VELOCITY_WINDOW_MS;
  while (g.samples.length > 2 && g.samples[0].t < cutoff) g.samples.shift();
}

function velocityFromSamples(samples) {
  if (!samples || samples.length < 2) return { vx: 0, vy: 0 };
  const newest = samples[samples.length - 1];
  let oldest = samples[0];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (newest.t - samples[i].t >= 16) {
      oldest = samples[i];
      break;
    }
  }
  const dt = newest.t - oldest.t;
  if (dt < 8) return { vx: 0, vy: 0 };
  // Pointer moved down → content should keep moving up → scrollTop increases.
  let vx = (oldest.x - newest.x) / dt;
  let vy = (oldest.y - newest.y) / dt;
  const speed = Math.hypot(vx, vy);
  if (speed > VELOCITY_MAX) {
    const s = VELOCITY_MAX / speed;
    vx *= s;
    vy *= s;
  }
  return { vx, vy };
}

function stopMomentum() {
  if (!momentum) return;
  cancelAnimationFrame(momentum.raf);
  momentum = null;
}

function clampScroll(el) {
  const maxL = Math.max(0, el.scrollWidth - el.clientWidth);
  const maxT = Math.max(0, el.scrollHeight - el.clientHeight);
  if (el.scrollLeft < 0) el.scrollLeft = 0;
  else if (el.scrollLeft > maxL) el.scrollLeft = maxL;
  if (el.scrollTop < 0) el.scrollTop = 0;
  else if (el.scrollTop > maxT) el.scrollTop = maxT;
  return {
    atEdgeX: el.scrollLeft <= 0 || el.scrollLeft >= maxL - 0.5,
    atEdgeY: el.scrollTop <= 0 || el.scrollTop >= maxT - 0.5,
  };
}

function tickMomentum(now) {
  if (!momentum) return;
  const m = momentum;
  const last = m.last ?? now;
  const dt = Math.min(32, Math.max(0, now - last));
  m.last = now;
  if (dt > 0) {
    m.scrollbox.scrollLeft += m.vx * dt;
    m.scrollbox.scrollTop += m.vy * dt;
    const { atEdgeX, atEdgeY } = clampScroll(m.scrollbox);
    if (atEdgeX) m.vx = 0;
    if (atEdgeY) m.vy = 0;
    // Frame-rate independent friction (~FRICTION at 60fps).
    const decay = Math.pow(FRICTION, dt / (1000 / 60));
    m.vx *= decay;
    m.vy *= decay;
  }
  if (Math.hypot(m.vx, m.vy) < VELOCITY_STOP) {
    stopMomentum();
    return;
  }
  m.raf = requestAnimationFrame(tickMomentum);
}

function startMomentum(scrollbox, vx, vy) {
  stopMomentum();
  if (Math.hypot(vx, vy) < VELOCITY_STOP) return;
  if (!canScroll(scrollbox)) return;
  momentum = {
    scrollbox,
    vx,
    vy,
    last: performance.now(),
    raf: 0,
  };
  momentum.raf = requestAnimationFrame(tickMomentum);
}

function endGesture(opts = {}) {
  if (!gesture) return;
  const { moved, scrollbox, samples } = gesture;
  const launch = opts.momentum !== false && moved;
  const { vx, vy } = launch ? velocityFromSamples(samples) : { vx: 0, vy: 0 };
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
  if (launch) startMomentum(scrollbox, vx, vy);
}

function onMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  const dx = e.clientX - gesture.x;
  const dy = e.clientY - gesture.y;
  if (!gesture.moved) {
    if (Math.hypot(dx, dy) < THRESHOLD_PX) return;
    gesture.moved = true;
    stopMomentum();
    gesture.scrollbox.classList.add("umc-drag-scrolling");
    try {
      gesture.scrollbox.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  e.preventDefault();
  pushSample(gesture, e.clientX, e.clientY, e.timeStamp || performance.now());
  gesture.scrollbox.scrollLeft = gesture.left - dx;
  gesture.scrollbox.scrollTop = gesture.top - dy;
}

function onUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.moved) {
    pushSample(gesture, e.clientX, e.clientY, e.timeStamp || performance.now());
  }
  endGesture({ momentum: true });
}

function onDragStart(e) {
  // Native <a>/img drag steals the gesture, always kill it while we may scroll.
  if (!apiRef) return;
  const scrollbox = findScrollbox(e.target, apiRef.enabled);
  if (scrollbox) e.preventDefault();
}

function onWheelCapture() {
  // Native wheel should cancel leftover flick.
  stopMomentum();
}

function onPointerDownCapture(e) {
  if (!apiRef) return;
  if (e.button !== 0) return;
  if (e.pointerType === "touch") return;
  if (gesture) endGesture({ momentum: false });
  stopMomentum();

  const scrollbox = findScrollbox(e.target, apiRef.enabled);
  if (!scrollbox) return;
  if (shouldSkipDrag(e.target, scrollbox, e.clientX, e.clientY)) return;

  gesture = {
    pointerId: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    left: scrollbox.scrollLeft,
    top: scrollbox.scrollTop,
    moved: false,
    scrollbox,
    samples: [
      { t: e.timeStamp || performance.now(), x: e.clientX, y: e.clientY },
    ],
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
  document.addEventListener("wheel", onWheelCapture, {
    capture: true,
    passive: true,
  });
}

function unbindDocument() {
  if (!docBound || typeof document === "undefined") return;
  docBound = false;
  endGesture({ momentum: false });
  stopMomentum();
  document.removeEventListener("pointerdown", onPointerDownCapture, true);
  document.removeEventListener("dragstart", onDragStart, true);
  document.removeEventListener("wheel", onWheelCapture, true);
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
