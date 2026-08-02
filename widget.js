/**
 * UMG-style panel attributes → CSS.
 *
 * Shared: width, height, min-width, max-width, min-height, max-height, padding, gap
 * Boxes: fill (on children), fill="2" for flex-grow weight
 * Canvas children: top, left, right, bottom, anchors
 *   anchors: "top-left" | "left top" | "top left" | "fill" | "h-fill" | "v-fill"
 *            or "minX,minY,maxX,maxY" in 0-1 (UE style)
 * Grid: columns="3"; masonry / uniform modes (equal 1fr rows×cols)
 * uniformgridpanel: same as gridpanel uniform (UMG alias tag)
 * Scalebox: scales the first child to fit
 * Widget switcher: active + child page / data-page
 * Background blur: blur="12"
 *
 * Authors write bare tags (`verticalbox`); compiled output uses `umc-*`
 * custom elements. Bare names still work via the MutationObserver path.
 */

import {
  PREFIX,
  BUILTIN_TAG_LIST,
  BUILTIN_TAGS,
  PREFIXED_TAGS,
  baseTag,
} from "./umc/builtin-tags.js";
import { boxSize, scheduleFrame } from "./umc/reactivity.js";
import { bindDragScroll, rebindDragScroll } from "./drag-scroll.js";

/** Framework settings, mutate via `configure({ … })`. */
const settings = {
  /** Click-drag to scroll scrollboxes (mouse/pen). */
  dragScroll: false,
};

/**
 * Update framework settings. Returns a shallow copy of the active settings.
 *
 *   import { configure } from "slatehtml";
 *   configure({ dragScroll: true });
 *
 * Per scrollbox: `drag-scroll` / `drag-scroll="false"` overrides the global flag.
 */
function configure(partial = {}) {
  if (partial && typeof partial === "object") {
    if ("dragScroll" in partial) settings.dragScroll = Boolean(partial.dragScroll);
  }
  if (typeof document !== "undefined") {
    rebindDragScroll(document, { enabled: dragScrollEnabled });
  }
  return getSettings();
}

function getSettings() {
  return { ...settings };
}

function dragScrollEnabled(el) {
  if (el.hasAttribute("drag-scroll")) {
    const v = el.getAttribute("drag-scroll");
    if (v === "false" || v === "0" || v === "off") return false;
    return true;
  }
  return settings.dragScroll;
}

const SIZE_ATTRS = [
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
];

const OBSERVED_ATTRS = [
  ...SIZE_ATTRS,
  "padding",
  "gap",
  "fill",
  "top",
  "left",
  "right",
  "bottom",
  "anchors",
  "columns",
  "rows",
  "masonry",
  "uniform",
  "stretch",
  "halign",
  "valign",
  "text",
  "brush",
  "tint",
  "percent",
  "background",
  "border-color",
  "brush-color",
  "checked",
  "disabled",
  "readonly",
  "multiline",
  "orientation",
  "active",
  "blur",
  "drag-scroll",
];

const LENGTH = /^-?[\d.]+$/;

/** Unitless numbers → px; multi-value (`4 16`, `0 16 24`) gets px per token. */
function cssLength(value) {
  if (value == null || value === "") return null;
  const v = String(value).trim();
  if (
    v === "auto" ||
    v === "none" ||
    v === "fit-content" ||
    v === "max-content" ||
    v === "min-content"
  ) {
    return v;
  }
  return v
    .split(/\s+/)
    .map((part) => (LENGTH.test(part) ? `${part}px` : part))
    .join(" ");
}

function applySizeAttrs(el) {
  for (const name of SIZE_ATTRS) {
    if (!el.hasAttribute(name)) continue;
    const cssName = name;
    const value = cssLength(el.getAttribute(name));
    if (value != null) el.style.setProperty(cssName, value);
  }

  if (el.hasAttribute("padding")) {
    const value = cssLength(el.getAttribute("padding"));
    if (value != null) {
      el.style.setProperty("--widget-padding", value);
      el.style.padding = value;
    }
  }

  if (el.hasAttribute("gap")) {
    const value = cssLength(el.getAttribute("gap"));
    if (value != null) {
      el.style.setProperty("--widget-gap", value);
      el.style.gap = value;
    }
  }
}

function clampPercent(value) {
  const p = Number(value);
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

function setPercent(el, value) {
  const p = clampPercent(value);
  el.setAttribute("percent", String(Math.round(p)));
  el.style.setProperty("--widget-percent", String(p));
  el.setAttribute("aria-valuenow", String(Math.round(p)));
  el.dispatchEvent(new CustomEvent("percentchanged", { bubbles: true, detail: { percent: p } }));
}

function applyLeafAttrs(el) {
  const tag = leafRole(el);

  if ((tag === "textblock" || tag === "editabletext") && el.hasAttribute("text")) {
    // Don't clobber editabletext while the user is typing
    if (!(tag === "editabletext" && el === document.activeElement)) {
      if (el.textContent !== el.getAttribute("text")) {
        el.textContent = el.getAttribute("text");
      }
    }
  }

  // Keep contentEditable in sync when `readonly` is toggled after first bind.
  if (tag === "editabletext") {
    el.contentEditable = el.hasAttribute("readonly") ? "false" : "true";
  }

  if (tag === "image") {
    if (el.hasAttribute("brush")) {
      const brush = el.getAttribute("brush");
      el.style.setProperty(
        "--widget-brush",
        brush.startsWith("url(") || brush.startsWith("linear-") || brush.startsWith("radial-")
          ? brush
          : `url(${JSON.stringify(brush)})`
      );
    } else {
      el.style.removeProperty("--widget-brush");
    }
    if (el.hasAttribute("tint")) {
      el.style.setProperty("--widget-background", el.getAttribute("tint"));
    }
  }

  if (tag === "progressbar" || tag === "slider") {
    if (el.hasAttribute("percent")) {
      el.style.setProperty("--widget-percent", String(clampPercent(el.getAttribute("percent"))));
    }
  }

  if (tag === "checkbox") {
    el.setAttribute("aria-checked", el.hasAttribute("checked") ? "true" : "false");
  }

  if (el.hasAttribute("background")) {
    el.style.setProperty("--widget-background", el.getAttribute("background"));
  }
  if (el.hasAttribute("border-color") || el.hasAttribute("brush-color")) {
    const c = el.getAttribute("border-color") || el.getAttribute("brush-color");
    el.style.setProperty("--widget-border", `1px solid ${c}`);
  }
}

/**
 * Builtin panel/leaf role for an element.
 * Honors `@parent` / `extends` via `__umcExtends` or `data-umc-extends`
 * so e.g. `<slate-tabs @parent widgetswitcher>` gets switcher behavior.
 */
function panelRole(el) {
  if (!(el instanceof Element)) return "";
  const ext = el.__umcExtends || el.getAttribute?.("data-umc-extends");
  if (ext) return baseTag(ext);
  return baseTag(el.localName);
}

/** Builtin leaf role, honors `extends: "textblock"` widgets via __umcExtends. */
function leafRole(el) {
  const tag = baseTag(el.localName);
  if (
    tag === "textblock" ||
    tag === "editabletext" ||
    tag === "image" ||
    tag === "progressbar" ||
    tag === "slider" ||
    tag === "checkbox"
  ) {
    return tag;
  }
  return panelRole(el);
}

function bindLeafInteractions(el) {
  if (!(el instanceof Element) || el._widgetBound) return;
  const tag = leafRole(el);

  if (tag === "checkbox") {
    el._widgetBound = true;
    el.setAttribute("role", "checkbox");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.setAttribute("aria-checked", el.hasAttribute("checked") ? "true" : "false");

    const toggle = () => {
      if (el.hasAttribute("disabled")) return;
      if (el.hasAttribute("checked")) el.removeAttribute("checked");
      else el.setAttribute("checked", "");
      el.setAttribute("aria-checked", el.hasAttribute("checked") ? "true" : "false");
      el.dispatchEvent(new CustomEvent("changed", {
        bubbles: true,
        detail: { checked: el.hasAttribute("checked") },
      }));
    };

    el.addEventListener("click", toggle);
    el.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    });
    return;
  }

  if (tag === "slider") {
    el._widgetBound = true;
    el.setAttribute("role", "slider");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "100");
    setPercent(el, el.getAttribute("percent") ?? 0);

    const percentFromPointer = (clientX) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width) return 0;
      return ((clientX - rect.left) / rect.width) * 100;
    };

    const onMove = (e) => setPercent(el, percentFromPointer(e.clientX));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    el.addEventListener("pointerdown", (e) => {
      if (el.hasAttribute("disabled")) return;
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      setPercent(el, percentFromPointer(e.clientX));
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    el.addEventListener("keydown", (e) => {
      if (el.hasAttribute("disabled")) return;
      const cur = clampPercent(el.getAttribute("percent") ?? 0);
      const step = e.shiftKey ? 10 : 5;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setPercent(el, cur - step);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        setPercent(el, cur + step);
      } else if (e.key === "Home") {
        e.preventDefault();
        setPercent(el, 0);
      } else if (e.key === "End") {
        e.preventDefault();
        setPercent(el, 100);
      }
    });
    return;
  }

  if (tag === "editabletext") {
    el._widgetBound = true;
    el.setAttribute("role", "textbox");
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.contentEditable = el.hasAttribute("readonly") ? "false" : "true";
    el.spellcheck = false;
    if (el.hasAttribute("text") && !el.textContent) {
      el.textContent = el.getAttribute("text");
    }

    el.addEventListener("input", () => {
      el.setAttribute("text", el.textContent ?? "");
      el.dispatchEvent(new CustomEvent("textchanged", {
        bubbles: true,
        detail: { text: el.textContent ?? "" },
      }));
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !el.hasAttribute("multiline")) {
        e.preventDefault();
        el.blur(); // blur handler emits `committed`
      }
    });

    el.addEventListener("blur", () => {
      el.setAttribute("text", el.textContent ?? "");
      el.dispatchEvent(new CustomEvent("committed", {
        bubbles: true,
        detail: { text: el.textContent ?? "" },
      }));
    });
  }
}

function applyFill(el) {
  if (!el.hasAttribute("fill")) return;
  const raw = el.getAttribute("fill");
  const weight = raw === "" || raw == null ? 1 : Number(raw);
  if (!Number.isFinite(weight) || weight < 0) return;
  // Shorthand so stylesheet `flex:` rules can't partially override weights.
  // Don't set minWidth/minHeight inline, that stomps attribute/CSS min-sizes
  // (e.g. canvaspanel min-height="340", overlay[kind=stage] min-height).
  el.style.flex = `${weight} 1 0%`;
}

function parseAnchors(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  const named = {
    "top-left": [0, 0, 0, 0],
    "top": [0.5, 0, 0.5, 0],
    "top-right": [1, 0, 1, 0],
    "left": [0, 0.5, 0, 0.5],
    "center": [0.5, 0.5, 0.5, 0.5],
    "right": [1, 0.5, 1, 0.5],
    "bottom-left": [0, 1, 0, 1],
    "bottom": [0.5, 1, 0.5, 1],
    "bottom-right": [1, 1, 1, 1],
    "h-fill": [0, 0.5, 1, 0.5],
    "v-fill": [0.5, 0, 0.5, 1],
    "fill": [0, 0, 1, 1],
    "stretch": [0, 0, 1, 1],
  };

  if (named[s]) return named[s];

  // space-separated aliases: "left top" / "top left", or corner pairs for edge stretch
  const parts = s.split(/[\s_]+/).filter(Boolean);
  if (parts.length === 2) {
    const [a, b] = parts;
    if (a === "top-left" && b === "top-right") return [0, 0, 1, 0];
    if (a === "bottom-left" && b === "bottom-right") return [0, 1, 1, 1];
    if (a === "top-left" && b === "bottom-left") return [0, 0, 0, 1];
    if (a === "top-right" && b === "bottom-right") return [1, 0, 1, 1];
    // Accept either edge order: "left top" and "top left" → top-left
    if (named[`${a}-${b}`]) return named[`${a}-${b}`];
    if (named[`${b}-${a}`]) return named[`${b}-${a}`];
  }
  if (parts.length === 1 && named[parts[0]]) return named[parts[0]];

  // UE-style: minX,minY,maxX,maxY
  const nums = s.split(",").map((n) => Number(n.trim()));
  if (nums.length === 4 && nums.every(Number.isFinite)) return nums;

  return null;
}

function isDisplayContents(el) {
  if (!(el instanceof Element)) return false;
  try {
    return getComputedStyle(el).display === "contents";
  } catch {
    return false;
  }
}

/**
 * Canvas slot = under a canvaspanel, walking through display:contents hosts
 * (UserWidgets that forward layout attrs to their stamped root).
 */
function canvasLayoutParent(el) {
  let p = el.parentElement;
  while (p) {
    if (panelRole(p) === "canvaspanel") return p;
    if (isDisplayContents(p)) {
      p = p.parentElement;
      continue;
    }
    return null;
  }
  return null;
}

function applyCanvasChild(el) {
  if (!canvasLayoutParent(el)) return;
  // Contents hosts don't generate a box, position their stamped root instead.
  if (isDisplayContents(el)) return;

  const hasAttrs =
    el.hasAttribute("anchors") ||
    el.hasAttribute("top") ||
    el.hasAttribute("left") ||
    el.hasAttribute("right") ||
    el.hasAttribute("bottom");
  const directCanvasChild =
    el.parentElement && panelRole(el.parentElement) === "canvaspanel";
  // Forwarded roots (under display:contents) must carry canvas attrs.
  if (!directCanvasChild && !hasAttrs) return;

  const anchors = parseAnchors(el.getAttribute("anchors"));
  const top = el.hasAttribute("top") ? cssLength(el.getAttribute("top")) : null;
  const left = el.hasAttribute("left") ? cssLength(el.getAttribute("left")) : null;
  const right = el.hasAttribute("right") ? cssLength(el.getAttribute("right")) : null;
  const bottom = el.hasAttribute("bottom")
    ? cssLength(el.getAttribute("bottom"))
    : null;

  // Canvas children are absolutely positioned (also covers contents-forwarded roots).
  // Direct slots match canvaspanel > *; forwarded roots (modals) sit above.
  el.style.position = "absolute";
  el.style.zIndex = directCanvasChild ? "1" : "2";
  el.style.top = "";
  el.style.left = "";
  el.style.right = "";
  el.style.bottom = "";
  el.style.transform = "";

  if (anchors) {
    const [minX, minY, maxX, maxY] = anchors;
    const stretchX = minX !== maxX;
    const stretchY = minY !== maxY;

    if (stretchX) {
      el.style.left = left ?? "0px";
      el.style.right = right ?? "0px";
      if (!el.hasAttribute("width")) el.style.width = "auto";
    } else if (minX >= 1 && right != null && left == null) {
      // Pin to right edge with `right` inset (UE-style bottom-right / right).
      el.style.left = "auto";
      el.style.right = right;
      if (!el.hasAttribute("width")) el.style.width = "auto";
    } else {
      el.style.left = `calc(${minX * 100}% + ${left ?? "0px"})`;
      el.style.right = "auto";
      if (!el.hasAttribute("width")) el.style.width = "auto";
    }

    if (stretchY) {
      el.style.top = top ?? "0px";
      el.style.bottom = bottom ?? "0px";
      if (!el.hasAttribute("height")) el.style.height = "auto";
    } else if (minY >= 1 && bottom != null && top == null) {
      // Pin to bottom edge with `bottom` inset.
      el.style.top = "auto";
      el.style.bottom = bottom;
      if (!el.hasAttribute("height")) el.style.height = "auto";
    } else {
      el.style.top = `calc(${minY * 100}% + ${top ?? "0px"})`;
      el.style.bottom = "auto";
      if (!el.hasAttribute("height")) el.style.height = "auto";
    }

    // Translate only when pinning via left/top percentage (not right/bottom pins).
    // Skip 0% translates, they're no-ops but still create a containing block for
    // position:fixed descendants (e.g. popup-anchor menus).
    const pinRight = !stretchX && minX >= 1 && right != null && left == null;
    const pinBottom = !stretchY && minY >= 1 && bottom != null && top == null;
    const tx =
      stretchX || pinRight || minX === 0 ? null : `translateX(-${minX * 100}%)`;
    const ty =
      stretchY || pinBottom || minY === 0 ? null : `translateY(-${minY * 100}%)`;
    el.style.transform = [tx, ty].filter(Boolean).join(" ");
    return;
  }

  // Manual pin mode: any set edge pins that side
  if (top != null) el.style.top = top;
  if (left != null) el.style.left = left;
  if (right != null) el.style.right = right;
  if (bottom != null) el.style.bottom = bottom;

  if (top == null && bottom == null) el.style.top = "0px";
  if (left == null && right == null) el.style.left = "0px";
}

function applyGrid(el) {
  if (panelRole(el) !== "gridpanel") return;
  if (el.hasAttribute("masonry")) {
    if (el.hasAttribute("columns")) {
      el.style.setProperty("--widget-columns", el.getAttribute("columns"));
    }
    el.style.removeProperty("--widget-rows");
    el.style.gridTemplateRows = "";
    return;
  }
  if (el.hasAttribute("uniform")) {
    const columns = el.getAttribute("columns") || "2";
    const rows = el.getAttribute("rows") || "2";
    el.style.setProperty("--widget-columns", columns);
    el.style.setProperty("--widget-rows", rows);
    el.style.gridTemplateRows = "";
    return;
  }
  if (el.hasAttribute("columns")) {
    el.style.setProperty("--widget-columns", el.getAttribute("columns"));
  }
  el.style.removeProperty("--widget-rows");
  if (el.hasAttribute("rows")) {
    const rows = el.getAttribute("rows");
    el.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  } else {
    el.style.gridTemplateRows = "";
  }
}

function applyUniformGrid(el) {
  if (panelRole(el) !== "uniformgridpanel") return;
  const columns = el.getAttribute("columns") || "2";
  const rows = el.getAttribute("rows") || "2";
  el.style.setProperty("--widget-columns", columns);
  el.style.setProperty("--widget-rows", rows);
}

function switcherPageId(node) {
  return node.getAttribute?.("page") || node.getAttribute?.("data-page") || "";
}

function applyWidgetSwitcher(el) {
  if (panelRole(el) !== "widgetswitcher") return;
  const active = el.getAttribute("active") || "";
  for (const child of el.children) {
    const id = switcherPageId(child);
    // No page= → chrome (e.g. slate-tabs strip), leave visibility alone.
    if (id === "") continue;
    child.toggleAttribute("hidden", id !== active);
  }
  if (!el._switcherObs) {
    el._switcherObs = new MutationObserver(() => applyWidgetSwitcher(el));
    el._switcherObs.observe(el, { childList: true });
  }
}

function applyBackgroundBlur(el) {
  if (panelRole(el) !== "backgroundblur") return;
  const blur = el.getAttribute("blur");
  if (blur != null && blur !== "") {
    const value = LENGTH.test(String(blur).trim()) ? `${blur}px` : blur;
    el.style.setProperty("--widget-blur", value);
  } else {
    el.style.removeProperty("--widget-blur");
  }
}

function applyScaleBox(el) {
  if (panelRole(el) !== "scalebox") return;
  const child = el.firstElementChild;
  if (!child) return;

  const fit = () => {
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    // Prefer unscaled layout size (ignore prior transform).
    const bw =
      child.offsetWidth ||
      Number.parseFloat(child.getAttribute("width")) ||
      0;
    const bh =
      child.offsetHeight ||
      Number.parseFloat(child.getAttribute("height")) ||
      0;
    if (!cw || !bw || !bh) {
      child.style.transform = "";
      if ((el.getAttribute("stretch") || "").toLowerCase().includes("down")) {
        el.style.removeProperty("height");
      }
      return;
    }
    const sx = cw / bw;
    const sy = ch / bh;
    const mode = (el.getAttribute("stretch") || "fit").toLowerCase();

    // Down-only to fit available width (chat embeds when the roll is narrow).
    if (mode === "down-x" || mode === "scale-down-x") {
      const s = Math.min(1, sx);
      child.style.transformOrigin = "top left";
      child.style.transform = s === 1 ? "" : `scale(${s})`;
      el.style.height = `${Math.max(1, Math.round(bh * s))}px`;
      return;
    }

    // Down-only to fit both axes.
    if (mode === "down" || mode === "scale-down") {
      const s = Math.min(1, sx, sy || sx);
      child.style.transformOrigin = "top left";
      child.style.transform = s === 1 ? "" : `scale(${s})`;
      el.style.height = `${Math.max(1, Math.round(bh * s))}px`;
      return;
    }

    el.style.removeProperty("height");
    let s = 1;
    if (mode === "fill") s = Math.max(sx, sy || sx);
    else if (mode === "stretch") {
      child.style.transformOrigin = "";
      child.style.transform = `scale(${sx}, ${sy || 1})`;
      return;
    } else if (ch) s = Math.min(sx, sy);
    else s = sx;
    child.style.transformOrigin = "";
    child.style.transform = s === 1 ? "" : `scale(${s})`;
  };

  fit();
  if (!el._scaleObs) {
    el._scaleObs = new ResizeObserver(fit);
    el._scaleObs.observe(el);
    el._scaleObs.observe(child);
  }
}

/** Layout panels that emit `sizechanged` (not leaf widgets). */
const SIZE_EVENT_TAGS = new Set([
  "horizontalbox",
  "verticalbox",
  "wrapbox",
  "overlay",
  "canvaspanel",
  "scrollbox",
  "sizebox",
  "spacer",
  "gridpanel",
  "uniformgridpanel",
  "scalebox",
  "border",
  "widgetswitcher",
  "namedslot",
  "retainerbox",
  "invalidationbox",
  "backgroundblur",
]);

let panelSizeRO = null;
const panelSizeLast = new WeakMap();

function panelSizeObserver() {
  if (typeof ResizeObserver === "undefined") return null;
  if (panelSizeRO) return panelSizeRO;
  panelSizeRO = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target;
      if (!(el instanceof Element) || !el.isConnected) continue;
      scheduleFrame(el, "panel-size", () => {
        const size = boxSize(el);
        const width = Math.round(size.width * 100) / 100;
        const height = Math.round(size.height * 100) / 100;
        const prev = panelSizeLast.get(el);
        if (prev && prev.width === width && prev.height === height) return;
        panelSizeLast.set(el, { width, height });
        el.dispatchEvent(
          new CustomEvent("sizechanged", {
            bubbles: true,
            detail: { width, height },
          })
        );
      });
    }
  });
  return panelSizeRO;
}

/** Observe layout panels and fire `sizechanged` when their box changes. */
function bindPanelSize(el) {
  if (!(el instanceof Element)) return;
  if (!SIZE_EVENT_TAGS.has(panelRole(el))) return;
  if (el._sizeObserved) return;
  el._sizeObserved = true;
  panelSizeObserver()?.observe(el);
}

function enhance(el) {
  if (!(el instanceof Element)) return;
  applySizeAttrs(el);
  applyFill(el);
  applyLeafAttrs(el);
  bindLeafInteractions(el);
  bindPanelSize(el);
  applyCanvasChild(el);
  applyGrid(el);
  applyUniformGrid(el);
  applyWidgetSwitcher(el);
  applyBackgroundBlur(el);
  applyScaleBox(el);
  if (panelRole(el) === "scrollbox") {
    bindDragScroll(el, { enabled: dragScrollEnabled });
  }
}

function enhanceTree(root) {
  const walk = (node) => {
    if (node.nodeType === 1) {
      enhance(node);
      for (const child of node.children) walk(child);
    }
  };
  walk(root);
}

/** Bare + prefixed localNames that participate in layout enhancement. */
const PANEL_TAGS = new Set([...BUILTIN_TAGS, ...PREFIXED_TAGS]);

function registerPrefixedElements() {
  if (typeof customElements === "undefined") return;

  class UmcPanelElement extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED_ATTRS;
    }

    connectedCallback() {
      enhance(this);
      for (const child of this.children) enhance(child);
    }

    attributeChangedCallback() {
      if (!this.isConnected) return;
      enhance(this);
      if (panelRole(this) === "canvaspanel") {
        for (const child of this.children) {
          applyCanvasChild(child);
          if (isDisplayContents(child)) {
            for (const root of child.children) applyCanvasChild(root);
          }
        }
      }
      for (const child of this.children) enhance(child);
    }
  }

  for (const bare of BUILTIN_TAG_LIST) {
    const tag = PREFIX + bare;
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends UmcPanelElement {});
    }
  }
}

function boot() {
  registerPrefixedElements();
  enhanceTree(document.documentElement);

  /** Coalesce attribute-driven enhance into one rAF (stamping sets many attrs). */
  const attrQueue = new Set();
  let attrRaf = 0;
  const flushAttrs = () => {
    attrRaf = 0;
    const nodes = [...attrQueue];
    attrQueue.clear();
    for (const el of nodes) {
      if (!(el instanceof Element) || !el.isConnected) continue;
      enhance(el);
      applyCanvasChild(el);
      if (
        el.hasAttribute("hidden") ||
        el.hasAttribute("open") ||
        isDisplayContents(el)
      ) {
        for (const root of el.children) applyCanvasChild(root);
      }
      if (panelRole(el.parentElement) === "canvaspanel") {
        applyCanvasChild(el);
        if (isDisplayContents(el)) {
          for (const root of el.children) applyCanvasChild(root);
        }
      }
      if (PANEL_TAGS.has(el.localName)) {
        for (const child of el.children) enhance(child);
      }
    }
  };

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.target instanceof Element) {
        attrQueue.add(m.target);
        if (!attrRaf) attrRaf = requestAnimationFrame(flushAttrs);
        continue;
      }
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) enhanceTree(node);
      }
    }
  });

  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [...OBSERVED_ATTRS, "hidden", "open"],
  });
}

let booted = false;

function start() {
  if (booted || typeof document === "undefined") return;
  booted = true;
  // Register before first paint when possible.
  registerPrefixedElements();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

// Auto-start in the browser when this module is imported.
start();

export {
  enhance,
  enhanceTree,
  boot,
  start,
  baseTag,
  PREFIX,
  parseAnchors,
  configure,
  getSettings,
};
