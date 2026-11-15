/**
 * Pure parts of modal-core: the truthy-attr rule and the trigger attr prefix rule.
 * Portal, scroll lock, and focus trap need a real document, which the test shim has not.
 */

import { test } from "node:test";
import { attrOn, applyTriggerAttrs } from "../packages/slatehtml-ui/src/modal-core.js";

globalThis.Element ??= class Element {}

class FakeEl extends Element {
  constructor(attrs = {}) {
    super();
    this._attrs = new Map(Object.entries(attrs));
  }
  hasAttribute(name) {
    return this._attrs.has(name);
  }
  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }
  setAttribute(name, value) {
    this._attrs.set(name, value);
  }
  get attributes() {
    return [...this._attrs.entries()].map(([name, value]) => ({ name, value }));
  }
}

test("attrOn: missing uses fallback, empty/true/1/on are true, false/0/off are false", () => {
  if (!attrOn(new FakeEl(), "close-escape", true)) throw new Error("missing should use fallback");
  if (attrOn(new FakeEl(), "close-escape", false)) throw new Error("missing should use fallback");
  for (const on of ["", "true", "1", "on"]) {
    if (!attrOn(new FakeEl({ "close-escape": on }), "close-escape")) throw new Error(`${on} should be true`);
  }
  for (const off of ["false", "0", "off"]) {
    if (attrOn(new FakeEl({ "close-escape": off }), "close-escape", true)) throw new Error(`${off} should be false`);
  }
  if (!attrOn(new FakeEl({ "close-escape": "maybe" }), "close-escape", true)) throw new Error("unknown should use fallback");
});

test("applyTriggerAttrs: copies <prefix>-<attr> and skips empty or foreign attrs", () => {
  const el = new FakeEl({ title: "own" });
  el._modalTrigger = "dialog";
  const trigger = new FakeEl({
    "dialog-title": "from trigger",
    "dialog-text": "",
    "other-attr": "x",
  });
  applyTriggerAttrs(el, trigger);
  if (el.getAttribute("title") !== "from trigger") throw new Error("title not copied");
  if (el.hasAttribute("text")) throw new Error("empty value should be skipped");
  if (el.hasAttribute("other-attr")) throw new Error("foreign attr copied");
  applyTriggerAttrs(el, null);
  if (el.getAttribute("title") !== "from trigger") throw new Error("null trigger changed attrs");
});
