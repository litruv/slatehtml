import "slatehtml";
import "slatehtml-ui";
import { e as umcEvents, registerShortcut } from "slatehtml/umc";
import { configure as configureUi, lucideSvg } from "slatehtml-ui/configure";
import { fontAwesomeSvg } from "slatehtml-ui/icons/fontawesome";
import { Prism } from "./prism-umc.js";
import { initDocsOptions, wireDocsOptions } from "./docs-options.js";
import { HUB_PREVIEWS } from "./hub-previews.js";
import "./gallery.css";
// Don't import prism's default (light) theme, gallery.css owns Catppuccin tokens.

initDocsOptions();

/** Lucide by default; `fas:` / `far:` / `fab:` (and aliases) → Font Awesome. */
configureUi({
  icons(name, attrs) {
    if (/^(fa[srb]?|solid|regular|brands):/i.test(String(name || ""))) {
      return fontAwesomeSvg(name, attrs);
    }
    return lucideSvg(name, attrs);
  },
});

/** Bundled at build time so GitHub Pages (and `vite build`) do not need a fetch of loose HTML. */
const PAGE_HTML = import.meta.glob("./pages/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
});

/**
 * Sidebar: Getting started + UMG-style palette hubs (Panel, Common, Input, …).
 * Hubs are preview grids; each tile shows a live mini component + opens its page.
 */
const NAV = [
  {
    label: "Getting started",
    items: [
      { id: "home", title: "Overview", file: "home.html" },
      { id: "installation", title: "Installation", file: "installation.html" },
      { id: "usage", title: "Usage", file: "usage.html" },
      { id: "settings", title: "Settings", file: "settings.html" },
    ],
  },
  {
    label: "Palette",
    items: [
      {
        id: "panel",
        title: "Panel",
        blurb: "Layout containers, boxes, grids, overlays, and stages.",
        items: [
          { id: "box", title: "Box & Border", icon: "box" },
          { id: "overlay", title: "Overlay & Canvas", icon: "layers" },
          { id: "scrollbox", title: "Scroll Box", icon: "scroll-text" },
          { id: "wrapbox", title: "Wrap Box", icon: "wrap-text" },
          { id: "gridpanel", title: "Grid Panel", icon: "layout-grid" },
          { id: "widgetswitcher", title: "Widget Switcher", icon: "panels-top-left" },
          { id: "sizebox", title: "Size Box", icon: "scaling" },
          { id: "scalebox", title: "Scale Box", icon: "zoom-in" },
        ],
      },
      {
        id: "common",
        title: "Common",
        blurb: "Text and built-in leaf controls.",
        items: [
          { id: "typography", title: "Text", icon: "type" },
          { id: "leaf-button", title: "Button", icon: "mouse-pointer-click" },
          { id: "leaf-checkbox", title: "Checkbox", icon: "square-check" },
          { id: "progressbar", title: "Progress Bar", icon: "loader" },
          { id: "leaf-slider", title: "Slider", icon: "sliders-horizontal" },
          { id: "editabletext", title: "Editable Text", icon: "text-cursor-input" },
          { id: "leaf-image", title: "Image", icon: "image" },
        ],
      },
      {
        id: "input",
        title: "Input",
        blurb: "Form controls, menus, and combo pickers from slatehtml-ui.",
        items: [
          { id: "button", title: "Button", icon: "rectangle-ellipsis" },
          { id: "toggle-button", title: "Toggle Button", icon: "toggle-left" },
          { id: "button-group", title: "Button Group", icon: "group" },
          { id: "checkbox", title: "Checkbox", icon: "square-check" },
          { id: "switch", title: "Switch", icon: "toggle-right" },
          { id: "radio-group", title: "Radio Group", icon: "circle-dot" },
          { id: "rating", title: "Rating", icon: "star" },
          { id: "slider", title: "Slider", icon: "sliders-horizontal" },
          { id: "text-field", title: "Text Field", icon: "text-cursor-input" },
          { id: "select", title: "Select", icon: "list-filter" },
          { id: "dropdown", title: "Dropdown", icon: "chevron-down" },
          { id: "combobox", title: "Combobox", icon: "chevrons-up-down" },
          { id: "autocomplete", title: "Autocomplete", icon: "search" },
          { id: "tabs", title: "Tabs", icon: "layout-panel-top" },
          { id: "transfer-list", title: "Transfer List", icon: "arrow-left-right" },
        ],
      },
      {
        id: "display",
        title: "Display",
        blurb: "Icons, chips, lists, tables, media, and navigation chrome.",
        items: [
          { id: "icon", title: "Icon", icon: "smile" },
          { id: "chip", title: "Chip", icon: "tags" },
          { id: "badge", title: "Badge", icon: "badge" },
          { id: "avatar", title: "Avatar", icon: "circle-user" },
          { id: "divider", title: "Divider", icon: "separator-horizontal" },
          { id: "list", title: "List", icon: "list" },
          { id: "table", title: "Table", icon: "table" },
          { id: "accordion", title: "Accordion", icon: "chevrons-down-up" },
          { id: "app-bar", title: "App Bar", icon: "panel-top" },
          { id: "title-bar", title: "Title Bar", icon: "app-window" },
          { id: "footer", title: "Footer", icon: "panel-bottom" },
          { id: "bottom-nav", title: "Bottom Nav", icon: "panel-bottom" },
          { id: "drawer", title: "Drawer", icon: "panel-left" },
          { id: "side-bar", title: "Side Bar", icon: "panel-left-close" },
          { id: "menu", title: "Menu", icon: "menu" },
          { id: "platform", title: "Platform", icon: "monitor" },
          { id: "breadcrumb", title: "Breadcrumb", icon: "chevrons-right" },
          { id: "pagination", title: "Pagination", icon: "ellipsis" },
          { id: "progress", title: "Progress", icon: "loader-circle" },
          { id: "image", title: "Image", icon: "image" },
          { id: "image-list", title: "Image List", icon: "layout-grid" },
          { id: "rich-link", title: "Rich Link", icon: "link" },
          { id: "media", title: "Media", icon: "play" },
          { id: "popup-anchor", title: "Popup Anchor", icon: "panel-top-open" },
          { id: "shadowbox", title: "Shadowbox", icon: "expand" },
        ],
      },
      {
        id: "feedback",
        title: "Feedback",
        blurb: "Tooltips, alerts, toasts, dialogs, and loading placeholders.",
        items: [
          { id: "tooltip", title: "Tooltip", icon: "message-square" },
          { id: "alert", title: "Alert", icon: "info" },
          { id: "snackbar", title: "Snackbar", icon: "message-circle" },
          { id: "dialog", title: "Dialog", icon: "app-window" },
          { id: "skeleton", title: "Skeleton", icon: "rectangle-ellipsis" },
        ],
      },
    ],
  },
];

/** Old routes → current (hub renames, merged pages). */
const HUB_REDIRECTS = {
  foundation: "panel",
  leaf: "common",
  inputs: "input",
  pickers: "input",
  uniformgridpanel: "gridpanel",
  canvaspanel: "overlay",
};

const ROUTES = {};
for (const section of NAV) {
  for (const entry of section.items) {
    if (entry.file) {
      ROUTES[entry.id] = {
        title: entry.title,
        file: entry.file,
        section: section.label,
      };
      continue;
    }
    ROUTES[entry.id] = {
      title: entry.title,
      hub: true,
      section: section.label,
    };
    for (const item of entry.items || []) {
      ROUTES[item.id] = {
        title: item.title,
        file: `${item.id}.html`,
        hub: entry.id,
      };
    }
  }
}
for (const [from, to] of Object.entries(HUB_REDIRECTS)) {
  ROUTES[from] = { redirect: to };
}

const pageRoot = document.querySelector("[data-docs-page]");
const navRoot = document.querySelector("[data-docs-nav]");
const pageCache = new Map();

function navEntry(id) {
  for (const section of NAV) {
    const found = section.items.find((entry) => entry.id === id);
    if (found) return found;
  }
  return null;
}

function hubForRoute(id) {
  const route = ROUTES[id];
  if (!route) return null;
  if (route.hub === true) return navEntry(id);
  if (typeof route.hub === "string") return navEntry(route.hub);
  return null;
}

function navIcon(entry) {
  if (entry.icon) return entry.icon;
  return (
    {
      home: "house",
      installation: "download",
      usage: "book-open",
      settings: "settings",
      panel: "box",
      common: "type",
      input: "rectangle-ellipsis",
      display: "layout-grid",
      feedback: "message-circle",
    }[entry.id] || ""
  );
}

function buildNavOptions() {
  const parts = [];
  for (const section of NAV) {
    parts.push(`# ${section.label}`);
    for (const entry of section.items) {
      const icon = navIcon(entry);
      parts.push(
        icon
          ? `${entry.id}|${entry.title}|${icon}`
          : `${entry.id}|${entry.title}`
      );
    }
  }
  return parts.join("\n");
}

function buildNav() {
  if (!navRoot) return;
  navRoot.replaceChildren();
  navRoot.setAttribute("gap", "0");

  const list = document.createElement("slate-list");
  list.className = "docs-nav-list";
  list.setAttribute("kind", "plain");
  list.setAttribute("dense", "");
  list.setAttribute("options", buildNavOptions());
  list.setAttribute("width", "100%");
  list.addEventListener("selectionchanged", (event) => {
    const id = event.detail?.value;
    if (!id || !ROUTES[id]) return;
    const next = id === "home" ? "#/" : `#/${id}`;
    if (location.hash !== next) location.hash = next;
    closeMobileSidebar();
  });
  list.addEventListener("activated", (event) => {
    const id = event.detail?.value;
    if (!id || !ROUTES[id]) return;
    const next = id === "home" ? "#/" : `#/${id}`;
    if (location.hash !== next) location.hash = next;
    else window.dispatchEvent(new HashChangeEvent("hashchange"));
    closeMobileSidebar();
  });
  navRoot.append(list);
}

function closeMobileSidebar() {
  const bar = document.getElementById("docs-sidebar");
  if (bar?.hasAttribute("open")) bar.removeAttribute("open");
}

function routeFromHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "").split(/[?#]/)[0];
  let id = raw === "" ? "home" : raw;
  const redirect = ROUTES[id]?.redirect;
  if (redirect) {
    id = redirect;
    const next = `#/${redirect}`;
    if (location.hash !== next) location.replace(next);
  }
  return ROUTES[id] ? id : "home";
}

async function loadPageHtml(id) {
  if (pageCache.has(id)) return pageCache.get(id);
  const file = ROUTES[id].file;
  const html = PAGE_HTML[`./pages/${file}`];
  if (typeof html !== "string") throw new Error(`Unknown page ${file}`);
  pageCache.set(id, html);
  return html;
}

function setActiveNav(id) {
  const hub = hubForRoute(id);
  const activeId = hub ? hub.id : id;
  const list = navRoot?.querySelector("slate-list.docs-nav-list");
  if (list && ROUTES[activeId]) list.setAttribute("selected", activeId);
}

function renderHub(hub) {
  const tiles = (hub.items || [])
    .map((item) => {
      const hasPreview = Boolean(HUB_PREVIEWS[item.id]);
      const bleed = item.id === "dialog" || item.id === "drawer";
      const face = hasPreview
        ? `<border class="docs-hub-preview${bleed ? " docs-hub-preview-bleed" : ""}" kind="well" height="88" padding="${bleed ? 0 : 10}">
              <scalebox class="docs-hub-preview-scale" stretch="down" width="100%" height="100%" fill>
                <horizontalbox class="docs-hub-preview-stage" data-hub-preview="${item.id}" gap="0" valign="center" halign="center"></horizontalbox>
              </scalebox>
            </border>`
        : `<slate-icon name="${item.icon || "box"}" size="28"></slate-icon>`;
      return `
      <a class="docs-hub-tile" href="#/${item.id}">
        <border kind="panel" padding="12" height="100%">
          <verticalbox gap="10" height="100%">
            ${face}
            <slate-text kind="label" text="${item.title}"></slate-text>
          </verticalbox>
        </border>
      </a>`;
    })
    .join("");
  return `
    <verticalbox gap="8">
      <slate-text kind="section" text="${hub.title}"></slate-text>
      <slate-text kind="hint" text="${hub.blurb || ""}"></slate-text>
    </verticalbox>
    <gridpanel class="docs-hub-grid" columns="3" gap="12" width="100%">
      ${tiles}
    </gridpanel>
  `;
}

/** Stamp live component miniatures into hub tiles. */
function wireHubPreviews(root = document) {
  for (const mount of root.querySelectorAll("[data-hub-preview]")) {
    const id = mount.getAttribute("data-hub-preview");
    const html = HUB_PREVIEWS[id];
    if (!html) continue;
    mount.innerHTML = html;
  }
}

function breadcrumbFor(id) {
  const route = ROUTES[id];
  if (!route || id === "home") return "";

  if (route.hub === true) {
    const hub = navEntry(id);
    if (!hub) return "";
    return `<slate-breadcrumb items="Overview|#/, ${hub.title}"></slate-breadcrumb>`;
  }

  const hub = hubForRoute(id);
  if (hub) {
    return `<slate-breadcrumb items="Overview|#/, ${hub.title}|#/${hub.id}, ${route.title}"></slate-breadcrumb>`;
  }

  return `<slate-breadcrumb items="Overview|#/, ${route.title}"></slate-breadcrumb>`;
}

function wirePageChrome(root) {
  if (!root || root._docsChromeBound) return;
  root._docsChromeBound = true;

  const pages = ["one", "two", "three"];

  root.addEventListener("clicked", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    const iconDefaults = t.closest("[data-docs-icon-defaults]");
    if (iconDefaults) {
      const mode = iconDefaults.getAttribute("data-docs-icon-defaults");
      if (mode === "large") configureUi({ iconSize: "22", iconStrokeWidth: "1.5" });
      else configureUi({ iconSize: "16", iconStrokeWidth: "2" });
      return;
    }

    const prev = t.closest("[data-demo-switcher-prev]");
    const next = t.closest("[data-demo-switcher-next]");
    if (!prev && !next) return;

    const stage = t.closest("[data-demo-stage], [data-demo-mount]") || root;
    const switcher = stage.querySelector("[data-demo-switcher]");
    if (!switcher) return;
    const cur = switcher.getAttribute("active") || pages[0];
    const i = pages.indexOf(cur);
    const delta = prev ? -1 : 1;
    const nextPage = pages[(i + delta + pages.length) % pages.length];
    switcher.setAttribute("active", nextPage);
  });
}

/** Nearest widget host under the stage (skip inner textblock / chrome). */
function eventSource(target, stage) {
  let el = target instanceof Element ? target : null;
  while (el && el !== stage) {
    const tag = el.localName || "";
    if (tag.includes("-") && !tag.startsWith("umc-")) return el;
    el = el.parentElement;
  }
  return target instanceof Element ? target : null;
}

/** Human label for which widget fired, tag + identifying attrs. */
function describeSource(el) {
  if (!(el instanceof Element)) return "?";
  const tag = el.localName || el.tagName?.toLowerCase() || "?";
  const bits = [];
  for (const name of ["text", "label", "value", "selected", "name", "title"]) {
    if (!el.hasAttribute(name)) continue;
    const v = el.getAttribute(name);
    bits.push(v === "" ? name : `${name}="${v}"`);
  }
  if (el.hasAttribute("pressed")) bits.push("pressed");
  if (el.hasAttribute("checked")) bits.push("checked");
  if (el.hasAttribute("disabled")) bits.push("disabled");
  return bits.length ? `<${tag} ${bits.join(" ")}>` : `<${tag}>`;
}

function normalizeSnippet(source) {
  return String(source || "")
    .replace(/^\n/, "")
    .replace(/\n[ \t]*$/, "")
    .replace(/\r\n/g, "\n");
}

function readCodePlain(code) {
  return normalizeSnippet(code.innerText || code.textContent || "");
}

function paintCode(code, source) {
  code.textContent = source;
  Prism.highlightElement(code);
}

/**
 * Mirror umc `api.self`: ref="toast" → self.toast (mount-local).
 * Gallery snippets aren't full widgets; `self` matches Construct(el, { self }).
 */
function demoSelf(root) {
  const self = Object.create(null);
  for (const node of root.querySelectorAll("[ref]")) {
    const id = node.getAttribute("ref");
    if (!id || Object.prototype.hasOwnProperty.call(self, id)) continue;
    self[id] = node;
  }
  return self;
}

/** Rising-edge attr helper (mirrors umc `api.bump`). */
function demoBump(target, name = "open") {
  if (!target?.setAttribute) return target;
  const attr = name || "open";
  if (target.hasAttribute(attr)) target.removeAttribute(attr);
  target.setAttribute(attr, "");
  return target;
}

/** Stamp edited UMC into the live mount (label / hints stay outside). */
function applySnippet(mount, source, runScript) {
  if (!mount) return;
  mount.innerHTML = normalizeSnippet(source);
  const js = normalizeSnippet(runScript || "");
  if (!js) return;
  const self = demoSelf(mount);
  const on = (target, type, handler, options) => {
    target?.addEventListener?.(type, handler, options);
  };
  try {
    // Demo-authored snippets only. Locals match Construct(el, { self, on, bump, e }).
    const run = new Function("self", "on", "bump", "e", "registerShortcut", js);
    run(self, on, demoBump, umcEvents, registerShortcut);
  } catch (err) {
    console.error("[demo script]", err);
  }
}

function demoSnippets(example) {
  return [...example.querySelectorAll(":scope > script[type='text/plain'][data-demo-snippet]")];
}

function demoScript(example) {
  return example.querySelector(":scope > script[type='text/plain'][data-demo-script]");
}

/** Merge HTML + optional wiring script as a mini `.umc` file for the code panel. */
function displaySource(htmlSource, scriptEl) {
  const html = normalizeSnippet(htmlSource);
  const js = scriptEl ? normalizeSnippet(scriptEl.textContent) : "";
  if (!js) return html;
  return `--- html ---\n${html}\n\n--- script ---\n${js}`;
}

/** Split an edited code buffer into mount HTML + runnable script. */
function parseDemoSource(source) {
  const text = normalizeSnippet(source);
  if (/^---\s*(?:html|template|script|js)\s*---/m.test(text)) {
    const sections = { html: "", script: "" };
    let cur = null;
    for (const line of text.split("\n")) {
      const m = line.match(/^---\s*(html|template|script|js)\s*---\s*$/i);
      if (m) {
        const name = m[1].toLowerCase();
        cur = name === "template" || name === "html" ? "html" : "script";
        continue;
      }
      if (!cur) continue;
      sections[cur] = sections[cur] ? `${sections[cur]}\n${line}` : line;
    }
    return {
      html: normalizeSnippet(sections.html),
      script: normalizeSnippet(sections.script),
    };
  }
  // Legacy: trailing <script> block
  const m = text.match(/^([\s\S]*?)\n\s*<script\b[^>]*>\n?([\s\S]*?)\n?\s*<\/script>\s*$/i);
  if (m) {
    return { html: normalizeSnippet(m[1]), script: normalizeSnippet(m[2]) };
  }
  return { html: text, script: "" };
}

function defaultSnippet(scripts) {
  return scripts[0] || null;
}

/** Two-column demos: editable Prism `umc` + live mount + event log. */
function wireDemoExamples(root = document) {
  for (const example of root.querySelectorAll("[data-demo-example]")) {
    const scripts = demoSnippets(example);
    let active = defaultSnippet(scripts);
    const scriptEl = demoScript(example);
    const code = example.querySelector("[data-demo-code]");
    const log = example.querySelector("[data-demo-events]");
    const stage = example.querySelector("[data-demo-stage]");
    const mount = example.querySelector("[data-demo-mount]");
    const eventNames = String(example.getAttribute("data-events") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const lines = [];

    if (active && code) {
      const htmlSource = normalizeSnippet(active.textContent);
      const source = displaySource(htmlSource, scriptEl);
      paintCode(code, source);
      code.setAttribute("contenteditable", "true");
      code.setAttribute("spellcheck", "false");
      code.setAttribute("role", "textbox");
      code.setAttribute("aria-label", "Editable UMC example");
      code.dataset.plain = source;
      applySnippet(mount, htmlSource, scriptEl?.textContent);

      const commit = () => {
        const next = readCodePlain(code);
        if (next === code.dataset.plain && !code.classList.contains("is-editing")) {
          paintCode(code, next);
          return;
        }
        code.dataset.plain = next;
        const { html: nextHtml, script: nextJs } = parseDemoSource(next);
        if (active) active.textContent = `\n${nextHtml}\n`;
        if (scriptEl) scriptEl.textContent = `\n${nextJs}\n`;
        applySnippet(mount, nextHtml, nextJs);
        paintCode(code, next);
        code.classList.remove("is-editing");
      };

      code.addEventListener("focus", () => {
        const plain = code.dataset.plain || readCodePlain(code);
        code.textContent = plain;
        code.classList.add("is-editing");
      });

      code.addEventListener("blur", () => commit());

      code.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          code.blur();
        }
      });
    }

    if (!log || !stage || !eventNames.length) continue;

    const push = (type, source, detail) => {
      let shown = detail;
      if (detail && typeof detail === "object") {
        const { originalEvent, type: _t, ...rest } = detail;
        shown = Object.keys(rest).length ? rest : null;
      }
      const body = shown == null ? "" : ` ${JSON.stringify(shown)}`;
      lines.unshift(`${describeSource(source)} ${type}${body}`);
      log.setAttribute("text", lines.slice(0, 10).join("\n"));
    };

    for (const type of eventNames) {
      stage.addEventListener(type, (e) => {
        if (!(e instanceof CustomEvent)) return;
        if (!stage.contains(e.target)) return;
        push(type, eventSource(e.target, stage), e.detail);
      });
    }
  }
}

async function renderRoute(id) {
  if (!pageRoot) return;
  const route = ROUTES[id] || ROUTES.home;
  if (route.hub === true) {
    const hub = navEntry(id);
    pageRoot.innerHTML = hub ? breadcrumbFor(id) + renderHub(hub) : "";
    wireHubPreviews(pageRoot);
  } else {
    const html = await loadPageHtml(id);
    pageRoot.innerHTML = breadcrumbFor(id) + html;
  }
  document.title = `SlateHTML, ${route.title}`;
  setActiveNav(id);
  wirePageChrome(pageRoot);
  wireDemoExamples(pageRoot);
  for (const code of pageRoot.querySelectorAll("pre > code[class*='language-']")) {
    if (code.closest("[data-demo-example]")) continue;
    Prism.highlightElement(code);
  }
  document.querySelector(".docs-content")?.scrollTo?.(0, 0);
}

let renderGen = 0;
async function onRouteChange() {
  const id = routeFromHash();
  const gen = ++renderGen;
  try {
    await renderRoute(id);
  } catch (err) {
    console.error(err);
    if (gen === renderGen && pageRoot) {
      pageRoot.innerHTML = `<border kind="panel" padding="16"><slate-text kind="body" text="Failed to load this page."></slate-text></border>`;
    }
  } finally {
    if (gen === renderGen) {
      document.documentElement.setAttribute("data-ready", "");
    }
  }
}

window.addEventListener("hashchange", () => {
  onRouteChange();
});

if (!location.hash || location.hash === "#") {
  location.replace("#/");
}

buildNav();
wireDocsOptions();
onRouteChange();
