/**
 * Field registry for `slate-form`: which controls contribute a value, and how.
 * A field participates when it has `name` and its tag is listed here.
 */
const FIELDS = {
  "slate-text-field": { attr: "value", kind: "string" },
  "slate-select": { attr: "selected", kind: "string" },
  "slate-dropdown": { attr: "selected", kind: "string" },
  "slate-combobox": { attr: "selected", kind: "string" },
  "slate-radio-group": { attr: "selected", kind: "string" },
  "slate-checkbox": { attr: "checked", kind: "boolean" },
  "slate-switch": { attr: "checked", kind: "boolean" },
  "slate-toggle-button": { attr: "pressed", kind: "boolean" },
  "slate-rating": { attr: "value", kind: "number" },
  "slate-slider": { attr: "percent", kind: "number" },
};

/** Controls that keep their own Enter (open or accept a menu). */
export const ENTER_THEIRS = new Set([
  "slate-select",
  "slate-combobox",
  "slate-autocomplete",
  "slate-dropdown",
]);

export function isFormField(node) {
  return Boolean(node && FIELDS[String(node.localName || "").toLowerCase()]);
}

/** Named fields in document order. */
function formFields(root) {
  if (!root || typeof root.querySelectorAll !== "function") return [];
  return [...root.querySelectorAll("[name]")].filter(isFormField);
}

/** Named fields that can take focus, in document order. */
export function focusableFields(root) {
  return formFields(root).filter((field) => !field.hasAttribute("disabled"));
}

export function fieldValue(field) {
  const spec = FIELDS[String(field?.localName || "").toLowerCase()];
  if (!spec) return null;
  const raw = field.getAttribute(spec.attr);
  if (raw == null) return spec.kind === "boolean" ? false : null;
  if (spec.kind === "boolean") return true; // boolean attrs read as "" when present
  if (spec.kind === "number") return Number(raw);
  return raw;
}

export function formValues(root) {
  const values = {};
  for (const field of formFields(root)) {
    values[field.getAttribute("name")] = fieldValue(field);
  }
  return values;
}

/** Fields whose own rules fail. Fields without `checkValidity` always pass. */
export function invalidFields(root) {
  return formFields(root).filter(
    (field) => typeof field.checkValidity === "function" && !field.checkValidity()
  );
}

/** Focusable node for a field: the host when it is in the tab order, else its inner control. */
export function focusTarget(field) {
  if (!field) return null;
  if (typeof field.focus === "function" && field.hasAttribute("tabindex")) return field;
  return field.querySelector('[tabindex="0"]') || field;
}
