/**
 * SlateHTML layout / leaf tags.
 *
 * Authors write bare names (`verticalbox`, `textblock`, …).
 * Compiled / custom-element form is prefixed (`umc-verticalbox`, …).
 *
 * CommonJS so Vite (via createRequire), widget.js (bundled), and the
 * VS Code preview can share one list.
 */

const PREFIX = "umc-";

const BUILTIN_TAG_LIST = [
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
  "textblock",
  "image",
  "progressbar",
  "checkbox",
  "slider",
  "editabletext",
];

const BUILTIN_TAGS = new Set(BUILTIN_TAG_LIST);

const PREFIXED_TAGS = new Set(BUILTIN_TAG_LIST.map((t) => PREFIX + t));

/** Bare + prefixed, never auto-imported as UserWidgets. */
const BUILTIN_TAGS_ALL = new Set([...BUILTIN_TAGS, ...PREFIXED_TAGS]);

function isBuiltinTag(name) {
  if (!name) return false;
  const t = String(name).toLowerCase();
  return BUILTIN_TAGS.has(t) || PREFIXED_TAGS.has(t);
}

/** Strip `umc-` if present; return bare local name. */
function baseTag(name) {
  if (!name) return "";
  const t = String(name).toLowerCase();
  if (t.startsWith(PREFIX) && BUILTIN_TAGS.has(t.slice(PREFIX.length))) {
    return t.slice(PREFIX.length);
  }
  return t;
}

/** Map bare builtin → prefixed; leave custom / already-prefixed alone. */
function prefixBuiltinTag(name) {
  if (!name) return name;
  const t = String(name).toLowerCase();
  if (BUILTIN_TAGS.has(t)) return PREFIX + t;
  return t;
}

/**
 * True if `name` is a hyphenated custom element that is NOT a prefixed builtin.
 * Prefixed panels (`umc-verticalbox`) must not count as UserWidget boundaries
 * for data-umc ownership.
 */
function isUserWidgetTag(name) {
  if (!name) return false;
  const t = String(name).toLowerCase();
  if (!t.includes("-")) return false;
  return !PREFIXED_TAGS.has(t);
}

module.exports = {
  PREFIX,
  BUILTIN_TAG_LIST,
  BUILTIN_TAGS,
  PREFIXED_TAGS,
  BUILTIN_TAGS_ALL,
  isBuiltinTag,
  baseTag,
  prefixBuiltinTag,
  isUserWidgetTag,
};
