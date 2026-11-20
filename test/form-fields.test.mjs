/**
 * slate-form field registry: which controls contribute a value, and which node takes focus.
 */

import { test } from "node:test";
import {
  fieldValue,
  focusTarget,
  focusableFields,
  formValues,
  invalidFields,
  isFormField,
} from "../packages/slatehtml-ui/src/input/form-fields.js";

class FakeField {
  constructor(localName, attrs = {}) {
    this.localName = localName;
    this._attrs = new Map(Object.entries(attrs));
    this.focused = false;
  }
  hasAttribute(name) {
    return this._attrs.has(name);
  }
  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }
  querySelector() {
    return this.inner || null;
  }
  focus() {
    this.focused = true;
  }
}

function root(fields) {
  return { querySelectorAll: () => fields };
}

test("only registered tags are fields", () => {
  if (!isFormField({ localName: "slate-text-field" })) throw new Error("text field should be a field");
  if (isFormField({ localName: "textblock" })) throw new Error("textblock should not be a field");
  if (isFormField(null)) throw new Error("null should not be a field");
});

test("value kinds: string, boolean, number, missing", () => {
  const text = new FakeField("slate-text-field", { name: "name", value: "" });
  if (fieldValue(text) !== "") throw new Error(JSON.stringify(fieldValue(text)));

  const checked = new FakeField("slate-checkbox", { name: "on", checked: "" });
  if (fieldValue(checked) !== true) throw new Error("checked attr should be true");
  const unchecked = new FakeField("slate-checkbox", { name: "on" });
  if (fieldValue(unchecked) !== false) throw new Error("missing boolean attr should be false");

  const rating = new FakeField("slate-rating", { name: "score", value: "4" });
  if (fieldValue(rating) !== 4) throw new Error("rating should read as a number");

  const select = new FakeField("slate-select", { name: "pick", selected: "b" });
  if (fieldValue(select) !== "b") throw new Error(JSON.stringify(fieldValue(select)));
});

test("formValues collects named fields in document order and skips others", () => {
  const fields = [
    new FakeField("slate-text-field", { name: "name", value: "Ada" }),
    new FakeField("textblock", { name: "not-a-field" }),
    new FakeField("slate-checkbox", { name: "updates", checked: "" }),
  ];
  const values = formValues(root(fields));
  if (JSON.stringify(values) !== JSON.stringify({ name: "Ada", updates: true })) {
    throw new Error(JSON.stringify(values));
  }
});

test("focusableFields skips disabled fields", () => {
  const fields = [
    new FakeField("slate-text-field", { name: "a" }),
    new FakeField("slate-text-field", { name: "b", disabled: "" }),
  ];
  const order = focusableFields(root(fields));
  if (order.length !== 1 || order[0] !== fields[0]) throw new Error(JSON.stringify(order.map((f) => f.getAttribute("name"))));
});

test("invalidFields uses each field's own checkValidity", () => {
  const ok = new FakeField("slate-text-field", { name: "ok" });
  ok.checkValidity = () => true;
  const bad = new FakeField("slate-text-field", { name: "bad" });
  bad.checkValidity = () => false;
  const noRules = new FakeField("slate-checkbox", { name: "plain" });
  const invalid = invalidFields(root([ok, bad, noRules]));
  if (invalid.length !== 1 || invalid[0] !== bad) throw new Error(JSON.stringify(invalid.map((f) => f.localName)));
});

test("focusTarget: host when it holds the tab stop, inner control otherwise", () => {
  const group = new FakeField("slate-radio-group", { name: "g", tabindex: "0" });
  if (focusTarget(group) !== group) throw new Error("focusable host should be the target");

  const inner = new FakeField("editabletext", { tabindex: "0" });
  const field = new FakeField("slate-text-field", { name: "name" });
  field.inner = inner;
  if (focusTarget(field) !== inner) throw new Error("inner control should be the target");

  if (focusTarget(null) !== null) throw new Error("null should stay null");
});
