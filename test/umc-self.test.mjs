/**
 * collectSelf / api.self: owned ref attrs only (nested UserWidgets opaque).
 */
import { collectSelf, bump, e } from "../umc/runtime.js";

function assert(cond, label) {
  if (!cond) throw new Error(label);
  console.log(`  ok   ${label}`);
}

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

const self = collectSelf(host);
assert(self.show === show, "self.show");
assert(self.toast === toast, "self.toast");
assert(self.inner == null, "nested UserWidget refs stay private");
assert(self.dup === dup1, "duplicate ref: first wins");
assert(Object.keys(self).sort().join(",") === "dup,show,toast", "only owned refs");

{
  const flags = new Set();
  const target = {
    hasAttribute: (n) => flags.has(n),
    setAttribute: (n) => flags.add(n),
    removeAttribute: (n) => flags.delete(n),
  };
  bump(target);
  assert(flags.has("open"), "bump sets open");
  bump(target);
  assert(flags.has("open"), "bump again still open (rising edge)");
}

assert(e.clicked === "clicked", "e.clicked");
assert(e.closed === "closed", "e.closed");
assert(Object.isFrozen(e), "e is frozen");

console.log("umc-self: all checks passed");
