/**
 * collectSelf / api.self: owned ref attrs only (nested UserWidgets opaque).
 */
import { test } from "node:test";
import assert from "node:assert";
import { collectSelf, bump, e } from "../umc/runtime.js";

/** Minimal tree for ownsNode + querySelectorAll("[ref]"). */
function node(localName, { ref = "", text = "" } = {}, children = []) {
  const el = {
    localName,
    id: "",
    textContent: text,
    parentElement: null,
    children,
    getAttribute(name) {
      if (name === "ref") return ref;
      return null;
    },
    querySelectorAll(selector) {
      if (selector !== "[ref]") return [];
      const out = [];
      const walk = (n) => {
        if (n.getAttribute("ref")) out.push(n);
        for (const c of n.children) walk(c);
      };
      for (const c of this.children) walk(c);
      return out;
    },
  };
  for (const c of children) c.parentElement = el;
  return el;
}

const inner = node("span", { ref: "inner", text: "nested" });
const child = node("self-child", {}, [inner]); // hyphenated → UserWidget boundary
const show = node("button", { ref: "show" });
const toast = node("span", { ref: "toast", text: "hi" });
const dup1 = node("span", { ref: "dup", text: "first" });
const dup2 = node("span", { ref: "dup", text: "second" });
const host = node("self-host", {}, [show, toast, child, dup1, dup2]);

test("collectSelf", () => {
  const self = collectSelf(host);
  assert.ok(self.show === show, "self.show");
  assert.ok(self.toast === toast, "self.toast");
  assert.ok(self.inner == null, "nested UserWidget refs stay private");
  assert.ok(self.dup === dup1, "duplicate ref: first wins");
  assert.ok(Object.keys(self).sort().join(",") === "dup,show,toast", "only owned refs");
});

test("bump", () => {
  const flags = new Set();
  const target = {
    hasAttribute: (n) => flags.has(n),
    setAttribute: (n) => flags.add(n),
    removeAttribute: (n) => flags.delete(n),
  };
  bump(target);
  assert.ok(flags.has("open"), "bump sets open");
  bump(target);
  assert.ok(flags.has("open"), "bump again still open (rising edge)");
});

test("e", () => {
  assert.ok(e.clicked === "clicked", "e.clicked");
  assert.ok(e.closed === "closed", "e.closed");
  assert.ok(Object.isFrozen(e), "e is frozen");
});
