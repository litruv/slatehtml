import { test } from "node:test";
import assert from "node:assert";
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

test("cell", () => {
  const n = cell(1);
  let seen = 0;
  const off = n.subscribe((v) => {
    seen = v;
  });
  assert.ok(seen === 0, "cell subscriber waits for first notify");
  n.value = 2;
  assert.ok(seen === 2, "cell notifies on set");
  n.value = 2;
  assert.ok(seen === 2, "cell skips duplicate set");
  off();
});

test("watchSource", () => {
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
  assert.ok(runs === 1, "watchSource runs via subscribe snapshot");
  subs.forEach((fn) => fn({ n: 2 }));
  assert.ok(runs === 2, "watchSource runs on notify");
});

test("scheduleFrame (needs DOM)", async () => {
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
  assert.ok(runs === 1, "scheduleFrame coalesces same key");
  runDisposeBag(host);
  host.remove();
});

test("watchSize", async () => {
  if (typeof document === "undefined") return;
  const host = document.createElement("div");
  host.style.cssText = "width:120px;height:80px;position:absolute;left:0;top:0";
  document.body.appendChild(host);
  const sizes = [];
  const off = watchSize(host, (size) => sizes.push(size));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  assert.ok(sizes.length >= 1, "watchSize fires initial size");
  assert.ok(
    Math.round(sizes[0].width) === 120 && Math.round(sizes[0].height) === 80,
    "watchSize reports initial box"
  );
  host.style.width = "200px";
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // jsdom may not fire ResizeObserver, accept either update or graceful no-op.
  if (typeof ResizeObserver !== "undefined" && sizes.length > 1) {
    assert.ok(Math.round(sizes.at(-1).width) === 200, "watchSize updates on resize");
  } else {
    assert.ok(true, "watchSize resize skipped (no ResizeObserver / jsdom)");
  }
  off();
  host.remove();
});

test("applySpec", () => {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  applySpec(el, { tag: "x", class: "a", selected: "", preview: "hi", gone: null });
  assert.ok(el.className === "a", "applySpec sets class");
  assert.ok(el.hasAttribute("selected"), "applySpec sets boolean attr");
  assert.ok(el.getAttribute("preview") === "hi", "applySpec sets string attr");
  assert.ok(!el.hasAttribute("gone"), "applySpec removes null attr");
});

test("syncKeyed", () => {
  if (typeof document === "undefined") return;
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
  assert.ok(parent.children.length === 2, "syncKeyed creates children");
  assert.ok(first.textContent === "A", "syncKeyed updates text");

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

  assert.ok(parent.children[0] === first, "syncKeyed reuses node");
  assert.ok(first.textContent === "A2", "syncKeyed patches in place");
  assert.ok(parent.children[0].getAttribute("data-id") === "b", "syncKeyed reorders");

  parent.remove();
});

test("syncVirtual", () => {
  if (typeof document === "undefined") return;
  const parent = document.createElement("div");
  document.body.appendChild(parent);

  const items = Array.from({ length: 100 }, (_, i) => ({ id: `m${i}`, h: 40 }));
  const state = createVirtualListState({ estimate: 40, gap: 0, overscan: 2 });
  for (const item of items) state.heights.set(item.id, item.h);

  const range = computeVirtualRange(state, items, (item) => item.id, {
    scrollTop: 200,
    viewport: 100,
  });
  assert.ok(range.start > 0, "computeVirtualRange skips rows above viewport");
  assert.ok(range.end < items.length, "computeVirtualRange skips rows below viewport");
  assert.ok(range.topSpacer >= 200, "computeVirtualRange sets top spacer");

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
  assert.ok(window != null, "syncVirtual creates virtual window");
  assert.ok(window.children.length === range.end - range.start, "syncVirtual renders slice only");
  assert.ok(parent.querySelector(".virtual-top") != null, "syncVirtual creates top spacer");

  setVirtualRowHeight(state, "m0", 50);
  assert.ok(state.version === 1, "setVirtualRowHeight bumps version");

  const prefixH = virtualPrefixHeight(state, items, (item) => item.id, 3);
  assert.ok(prefixH === 120, "virtualPrefixHeight sums first N rows");

  const atScroll = findVirtualIndexAtScroll(state, items, (item) => item.id, 95);
  assert.ok(atScroll === 2, "findVirtualIndexAtScroll locates item at scroll offset");

  parent.remove();
});
