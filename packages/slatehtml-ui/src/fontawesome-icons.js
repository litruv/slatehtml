/**
 * Font Awesome Free icons for slate-icon.
 *
 * Names are Font Awesome icon names (kebab-case), optional style prefix:
 *   user
 *   fas:user | far:user | fab:github
 *   solid:user | regular:user | brands:github
 *
 *   import { fontAwesomeSvg } from "slatehtml-ui/icons/fontawesome";
 *   import { configure } from "slatehtml-ui/configure";
 *   configure({ icons: fontAwesomeSvg });
 */
import { library, icon, findIconDefinition } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";

library.add(fas, far, fab);

const PREFIX = {
  fas: "fas",
  far: "far",
  fab: "fab",
  solid: "fas",
  regular: "far",
  brands: "fab",
  fa: "fas",
};

function parseName(raw) {
  let s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^fa-/, "");
  if (!s) return null;

  let prefix = "fas";
  let iconName = s;

  const colon = s.indexOf(":");
  const slash = s.indexOf("/");
  const sep = colon >= 0 ? colon : slash;
  if (sep >= 0) {
    const head = s.slice(0, sep);
    const tail = s.slice(sep + 1).replace(/^fa-/, "");
    if (PREFIX[head] && tail) {
      prefix = PREFIX[head];
      iconName = tail;
    }
  }

  iconName = iconName.replace(/^fa-/, "");
  return iconName ? { prefix, iconName } : null;
}

function fromAbstract(node) {
  if (!node || typeof document === "undefined") return null;
  const el = document.createElementNS(
    "http://www.w3.org/2000/svg",
    node.tag || "svg"
  );
  for (const [key, value] of Object.entries(node.attributes || {})) {
    if (value != null && value !== false) el.setAttribute(key, String(value));
  }
  for (const child of node.children || []) {
    const kid = fromAbstract(child);
    if (kid) el.appendChild(kid);
  }
  return el;
}

function svgFromRendered(rendered) {
  const live = rendered?.node?.[0];
  if (live) return live;
  if (rendered?.abstract?.[0]) return fromAbstract(rendered.abstract[0]);
  const html = rendered?.html?.[0];
  if (!html || typeof document === "undefined") return null;
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html).trim();
  return tpl.content.firstElementChild;
}

/** Build an SVG element for a Font Awesome icon name, or null. */
export function fontAwesomeSvg(name, attrs = {}) {
  const parsed = parseName(name);
  if (!parsed) return null;

  const def = findIconDefinition(parsed);
  if (!def) return null;

  const attributes = { "aria-hidden": "true" };
  if (attrs.width != null && attrs.width !== "") attributes.width = attrs.width;
  if (attrs.height != null && attrs.height !== "") attributes.height = attrs.height;
  if (attrs["aria-hidden"] != null) attributes["aria-hidden"] = attrs["aria-hidden"];

  const rendered = icon(def, { attributes });
  const svg = svgFromRendered(rendered);
  if (!svg) return null;

  // Mark fill style so slate-icon CSS does not force Lucide stroke rules.
  svg.setAttribute("data-icon-fill", "");
  return svg;
}

export function hasFontAwesomeIcon(name) {
  const parsed = parseName(name);
  return Boolean(parsed && findIconDefinition(parsed));
}
