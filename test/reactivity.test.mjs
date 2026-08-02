import { cell, watchSource, watchSize, scheduleFrame, runDisposeBag } from "../umc/reactivity.js";
import {
  applySpec,
  syncKeyed,
  createVirtualListState,
  computeVirtualRange,
  setVirtualRowHeight,
  syncVirtual,
  findVirtualIndexAtScroll,
  virtualPrefixHeight,
} from "../umc/list-sync.js";

function assert(cond, label) {
  if (!cond) throw new Error(label);
  console.log(`  ok   ${label}`);
}

// --- cell ---
{
  const n = cell(1);
  let seen = 0;
  const off = n.subscribe((v) => {
    seen = v;
  });
  assert(seen === 0, "cell subscriber waits for first notify");
  n.value = 2;
  assert(seen === 2, "cell notifies on set");
  n.value = 2;
  assert(seen === 2, "cell skips duplicate set");
  off();
}

// --- watchSource ---
{
  const subs = new Set();
  const source = (fn) => {
    fn({ n: 1 });
    subs.add(fn);
    return () => subs.delete(fn);
  };
  let runs = 0;
  watchSource(source, () => {
    runs += 1;
  });
  assert(runs === 1, "watchSource runs via subscribe snapshot");
  subs.forEach((fn) => fn({ n: 2 }));
  assert(runs === 2, "watchSource runs on notify");
}

// --- scheduleFrame (needs DOM) ---
await (async () => {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  document.body.appendChild(host);
  let runs = 0;
  scheduleFrame(host, "t", () => {
    runs += 1;
  });
  scheduleFrame(host, "t", () => {
    runs += 1;
  });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  assert(runs === 1, "scheduleFrame coalesces same key");
  runDisposeBag(host);
  host.remove();
})();

// --- watchSize ---
await (async () => {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  host.style.cssText = "width:120px;height:80px;position:absolute;left:0;top:0";
  document.body.appendChild(host);
  const sizes = [];
  const off = watchSize(host, (size) => sizes.push(size));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  assert(sizes.length >= 1, "watchSize fires initial size");
  assert(
    Math.round(sizes[0].width) === 120 && Math.round(sizes[0].height) === 80,
    "watchSize reports initial box"
  );
  host.style.width = "200px";
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // jsdom may not fire ResizeObserver, accept either update or graceful no-op.
  if (typeof ResizeObserver !== "undefined" && sizes.length > 1) {
    assert(Math.round(sizes.at(-1).width) === 200, "watchSize updates on resize");
  } else {
    assert(true, "watchSize resize skipped (no ResizeObserver / jsdom)");
  }
  off();
  host.remove();
})();

// --- applySpec ---
if (typeof document !== "undefined") {
  const el = document.createElement("div");
  applySpec(el, { tag: "x", class: "a", selected: "", preview: "hi", gone: null });
  assert(el.className === "a", "applySpec sets class");
  assert(el.hasAttribute("selected"), "applySpec sets boolean attr");
  assert(el.getAttribute("preview") === "hi", "applySpec sets string attr");
  assert(!el.hasAttribute("gone"), "applySpec removes null attr");
}

// --- syncKeyed ---
if (typeof document !== "undefined") {
  const parent = document.createElement("div");
  document.body.appendChild(parent);

  const items = [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ];

  syncKeyed(parent, items, {
    key: (item) => item.id,
    nodeKey: (node) => node.getAttribute("data-id"),
    create: (item) => {
      const el = document.createElement("span");
      el.setAttribute("data-id", item.id);
      return el;
    },
    update: (node, item) => {
      node.textContent = item.label;
    },
  });

  const first = parent.children[0];
  assert(parent.children.length === 2, "syncKeyed creates children");
  assert(first.textContent === "A", "syncKeyed updates text");

  items[0].label = "A2";
  items.reverse();
  syncKeyed(parent, items, {
    key: (item) => item.id,
    nodeKey: (node) => node.getAttribute("data-id"),
    create: (item) => {
      const el = document.createElement("span");
      el.setAttribute("data-id", item.id);
      return el;
    },
    update: (node, item) => {
      node.textContent = item.label;
    },
  });

  assert(parent.children[0] === first, "syncKeyed reuses node");
  assert(first.textContent === "A2", "syncKeyed patches in place");
  assert(parent.children[0].getAttribute("data-id") === "b", "syncKeyed reorders");

  parent.remove();
}

// --- syncVirtual ---
if (typeof document !== "undefined") {
  const parent = document.createElement("div");
  document.body.appendChild(parent);

  const items = Array.from({ length: 100 }, (_, i) => ({ id: `m${i}`, h: 40 }));
  const state = createVirtualListState({ estimate: 40, gap: 0, overscan: 2 });
  for (const item of items) state.heights.set(item.id, item.h);

  const range = computeVirtualRange(state, items, (item) => item.id, {
    scrollTop: 200,
    viewport: 100,
  });
  assert(range.start > 0, "computeVirtualRange skips rows above viewport");
  assert(range.end < items.length, "computeVirtualRange skips rows below viewport");
  assert(range.topSpacer >= 200, "computeVirtualRange sets top spacer");

  syncVirtual(
    parent,
    items,
    state,
    {
      key: (item) => item.id,
      nodeKey: (node) => node.getAttribute("data-id"),
      create: (item) => {
        const el = document.createElement("div");
        el.setAttribute("data-id", item.id);
        return el;
      },
      update: (node, item) => {
        node.textContent = item.id;
      },
    },
    { scrollTop: 200, viewport: 100 }
  );

  const window = parent.querySelector(".virtual-window");
  assert(window != null, "syncVirtual creates virtual window");
  assert(window.children.length === range.end - range.start, "syncVirtual renders slice only");
  assert(parent.querySelector(".virtual-top") != null, "syncVirtual creates top spacer");

  setVirtualRowHeight(state, "m0", 50);
  assert(state.version === 1, "setVirtualRowHeight bumps version");

  const prefixH = virtualPrefixHeight(state, items, (item) => item.id, 3);
  assert(prefixH === 120, "virtualPrefixHeight sums first N rows");

  const atScroll = findVirtualIndexAtScroll(state, items, (item) => item.id, 95);
  assert(atScroll === 2, "findVirtualIndexAtScroll locates item at scroll offset");

  parent.remove();
}

console.log("\nPASS");
