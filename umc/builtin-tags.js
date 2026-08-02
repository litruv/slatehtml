/**
 * SlateHTML layout / leaf tags (ESM).
 * Keep in sync with builtin-tags.cjs.
 */

export const PREFIX = "umc-";

export const BUILTIN_TAG_LIST = [
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

export const BUILTIN_TAGS = new Set(BUILTIN_TAG_LIST);

export const PREFIXED_TAGS = new Set(BUILTIN_TAG_LIST.map((t) => PREFIX + t));

export const BUILTIN_TAGS_ALL = new Set([...BUILTIN_TAGS, ...PREFIXED_TAGS]);

export function isBuiltinTag(name) {
  if (!name) return false;
  const t = String(name).toLowerCase();
  return BUILTIN_TAGS.has(t) || PREFIXED_TAGS.has(t);
}

export function baseTag(name) {
  if (!name) return "";
  const t = String(name).toLowerCase();
  if (t.startsWith(PREFIX) && BUILTIN_TAGS.has(t.slice(PREFIX.length))) {
    return t.slice(PREFIX.length);
  }
  return t;
}

export function prefixBuiltinTag(name) {
  if (!name) return name;
  const t = String(name).toLowerCase();
  if (BUILTIN_TAGS.has(t)) return PREFIX + t;
  return t;
}

export function isUserWidgetTag(name) {
  if (!name) return false;
  const t = String(name).toLowerCase();
  if (!t.includes("-")) return false;
  return !PREFIXED_TAGS.has(t);
}
