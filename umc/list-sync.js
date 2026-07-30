/**
 * Keyed list reconciliation for dynamic UMC content.
 * Updates in place instead of replaceChildren() — avoids flicker on live data.
 */

import { create } from "./runtime.js";

function applyProp(el, key, value) {
  if (value == null || value === false) {
    if (key === "class") el.className = "";
    else el.removeAttribute(key);
    return;
  }
  if (key === "class") {
    el.className = value;
    return;
  }
  if (key === "style" && typeof value === "object") {
    for (const [prop, v] of Object.entries(value)) {
      if (v == null) continue;
      if (prop.startsWith("--")) el.style.setProperty(prop, String(v));
      else el.style[prop] = v;
    }
    return;
  }
  if (value === true) el.setAttribute(key, "");
  else el.setAttribute(key, String(value));
}

/** Copy attrs from a `{ tag, … }` spec onto an existing element. */
export function applySpec(el, spec, { skip = ["tag", "children"] } = {}) {
  if (!el || !spec || typeof spec !== "object") return el;
  for (const [key, value] of Object.entries(spec)) {
    if (skip.includes(key)) continue;
    applyProp(el, key, value);
  }
  return el;
}

/**
 * Reconcile `items` under `parent` by stable key.
 *
 *   syncKeyed(parent, items, {
 *     key: (item) => item.id,
 *     nodeKey: (node) => node.getAttribute("data-id"),
 *     create: (item) => create({ tag: "row", … }),
 *     update: (node, item, { isNew }) => applySpec(node, spec),
 *     children: (item) => item.children,          // optional nest
 *     childTarget: (node) => node.querySelector("[data-content]"),
 *   });
 */
export function syncKeyed(parent, items, handlers) {
  if (!(parent instanceof Element)) return;
  const list = items ?? [];
  const {
    key,
    nodeKey,
    create,
    update,
    children,
    childTarget,
    removeUnknown = true,
  } = handlers;

  if (typeof key !== "function" || typeof nodeKey !== "function") {
    throw new Error("syncKeyed: key and nodeKey are required");
  }
  if (typeof create !== "function" || typeof update !== "function") {
    throw new Error("syncKeyed: create and update are required");
  }

  if (removeUnknown) {
    for (const child of [...parent.children]) {
      if (!nodeKey(child)) child.remove();
    }
  }

  const existing = new Map();
  for (const child of parent.children) {
    const k = nodeKey(child);
    if (k) existing.set(k, child);
  }

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    const itemKey = key(item);
    let node = existing.get(itemKey);
    const isNew = !node;

    if (!node) {
      node = create(item, { isNew: true, index: i });
      if (!node) continue;
      parent.insertBefore(node, parent.children[i] ?? null);
    } else if (node !== parent.children[i]) {
      parent.insertBefore(node, parent.children[i] ?? null);
    }

    update(node, item, { isNew, index: i });

    if (children && childTarget) {
      const nested = children(item);
      const slot = childTarget(node, item);
      if (slot) {
        if (nested?.length) syncKeyed(slot, nested, handlers);
        else slot.replaceChildren();
      }
    }

    existing.delete(itemKey);
  }

  if (removeUnknown) {
    for (const stale of existing.values()) {
      if (stale.parentElement === parent) stale.remove();
    }
  }
}

/** State bag for {@link syncVirtual}. */
export function createVirtualListState({ estimate = 72, gap = 0, overscan = 5 } = {}) {
  return {
    estimate,
    gap,
    overscan,
    heights: new Map(),
    version: 0,
    range: { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 },
    _prefix: null,
    _prefixLen: -1,
    _prefixVersion: -1,
  };
}

function itemHeight(state, item, key) {
  const measured = state.heights.get(key(item));
  return measured > 0 ? measured : state.estimate;
}

function invalidatePrefix(state) {
  state._prefix = null;
  state._prefixLen = -1;
  state._prefixVersion = -1;
}

/** Record a measured row height (invalidates prefix cache). */
export function setVirtualRowHeight(state, itemKey, height) {
  if (!state || !itemKey) return false;
  const next = Math.ceil(height);
  if (next <= 0 || state.heights.get(itemKey) === next) return false;
  state.heights.set(itemKey, next);
  state.version += 1;
  invalidatePrefix(state);
  return true;
}

function buildPrefix(state, items, key) {
  if (
    state._prefix &&
    state._prefixLen === items.length &&
    state._prefixVersion === state.version
  ) {
    return state._prefix;
  }

  const prefix = new Array(items.length + 1);
  prefix[0] = 0;
  for (let i = 0; i < items.length; i += 1) {
    const h = itemHeight(state, items[i], key);
    prefix[i + 1] = prefix[i] + h + (i < items.length - 1 ? state.gap : 0);
  }

  state._prefix = prefix;
  state._prefixLen = items.length;
  state._prefixVersion = state.version;
  return prefix;
}

function offsetAt(state, items, key, index) {
  return buildPrefix(state, items, key)[index];
}

function totalHeight(state, items, key) {
  return buildPrefix(state, items, key)[items.length];
}

/** Combined height of the first `count` items (prefix sum at index). */
export function virtualPrefixHeight(state, items, key, count) {
  const list = items ?? [];
  if (!list.length || count <= 0) return 0;
  return buildPrefix(state, list, key)[Math.min(count, list.length)];
}

/** Total scrollable content height for all items. */
export function virtualListHeight(state, items, key) {
  const list = items ?? [];
  if (!list.length) return 0;
  return buildPrefix(state, list, key)[list.length];
}

function findStartIndex(state, items, key, scrollTop) {
  const n = items.length;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const end = offsetAt(state, items, key, mid) + itemHeight(state, items[mid], key);
    if (end <= scrollTop) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(0, lo - state.overscan);
}

/**
 * Index of the item containing `scrollTop` (no overscan).
 * Used to preserve scroll position across virtual window updates.
 */
export function findVirtualIndexAtScroll(state, items, key, scrollTop) {
  const list = items ?? [];
  const n = list.length;
  if (!n) return 0;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const end = offsetAt(state, list, key, mid) + itemHeight(state, list[mid], key);
    if (end <= scrollTop) lo = mid + 1;
    else hi = mid;
  }
  const index = lo > 0 ? lo - 1 : 0;
  return Math.min(n - 1, index);
}

/** Pixel offset of item `index` from the top of the list. */
export function virtualItemOffset(state, items, key, index) {
  const list = items ?? [];
  if (!list.length || index <= 0) return 0;
  return buildPrefix(state, list, key)[Math.min(index, list.length)];
}

function findEndIndex(state, items, key, scrollBottom) {
  const n = items.length;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsetAt(state, items, key, mid) < scrollBottom) lo = mid + 1;
    else hi = mid;
  }
  return Math.min(n, lo + state.overscan);
}

/**
 * Compute which items to render for the current scroll position.
 * @returns {{ start: number, end: number, topSpacer: number, bottomSpacer: number }}
 */
export function computeVirtualRange(state, items, key, metrics = {}) {
  const list = items ?? [];
  const n = list.length;
  if (!n) {
    return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 };
  }

  const { scrollTop = 0, viewport = 0, pinToEnd = false } = metrics;
  const prefix = buildPrefix(state, list, key);
  const total = prefix[n];

  if (pinToEnd) {
    let start = n;
    let visible = 0;
    const budget = Math.max(viewport, state.estimate) + state.overscan * state.estimate;
    while (start > 0 && visible < budget) {
      start -= 1;
      visible += itemHeight(state, list[start], key) + (start < n - 1 ? state.gap : 0);
    }
    start = Math.max(0, start - state.overscan);
    return {
      start,
      end: n,
      topSpacer: prefix[start],
      bottomSpacer: 0,
    };
  }

  const start = findStartIndex(state, list, key, scrollTop);
  const end = findEndIndex(state, list, key, scrollTop + viewport);
  return {
    start,
    end,
    topSpacer: prefix[start],
    bottomSpacer: Math.max(0, total - prefix[end]),
  };
}

function ensureVirtualChrome(parent, state) {
  let topSpacer = parent.querySelector(":scope > .virtual-top");
  let window = parent.querySelector(":scope > .virtual-window");
  let bottomSpacer = parent.querySelector(":scope > .virtual-bottom");

  if (!topSpacer) {
    topSpacer = create({ tag: "spacer", class: "virtual-top", height: "0" });
    parent.prepend(topSpacer);
  }

  if (!window) {
    window = create({
      tag: "verticalbox",
      class: "virtual-window",
      ...(state.gap ? { gap: String(state.gap) } : {}),
    });
    topSpacer.after(window);
  } else if (state.gap && window.getAttribute("gap") !== String(state.gap)) {
    window.setAttribute("gap", String(state.gap));
  }

  if (!bottomSpacer) {
    bottomSpacer = create({ tag: "spacer", class: "virtual-bottom", height: "0" });
    window.after(bottomSpacer);
  }

  return { topSpacer, window, bottomSpacer };
}

/**
 * Windowed keyed sync — only mounts rows in the visible range plus spacers.
 *
 *   syncVirtual(parent, items, state, handlers, {
 *     scrollTop, viewport,
 *   });
 */
export function syncVirtual(parent, items, state, handlers, metrics = {}) {
  if (!(parent instanceof Element) || !state) return null;
  const list = items ?? [];
  const { key, nodeKey, create, update } = handlers;
  if (typeof key !== "function" || typeof nodeKey !== "function") {
    throw new Error("syncVirtual: key and nodeKey are required");
  }
  if (typeof create !== "function" || typeof update !== "function") {
    throw new Error("syncVirtual: create and update are required");
  }

  const range = computeVirtualRange(state, list, key, metrics);
  state.range = range;

  const { topSpacer, window, bottomSpacer } = ensureVirtualChrome(parent, state);
  topSpacer.setAttribute("height", String(Math.max(0, Math.round(range.topSpacer))));
  bottomSpacer.setAttribute("height", String(Math.max(0, Math.round(range.bottomSpacer))));

  const slice = list.slice(range.start, range.end);
  syncKeyed(window, slice, {
    key,
    nodeKey,
    create: (item, ctx) => create(item, { ...ctx, virtualIndex: range.start + ctx.index }),
    update: (node, item, ctx) => update(node, item, { ...ctx, virtualIndex: range.start + ctx.index }),
  });

  return { ...range, window, topSpacer, bottomSpacer };
}
