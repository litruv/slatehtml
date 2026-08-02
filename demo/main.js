import { configure } from "slatehtml";
import "slatehtml";
import "slatehtml-ui";
import { Prism } from "./prism-umc.js";
// Don't import prism's default (light) theme, gallery.css owns Catppuccin tokens.

configure({ dragScroll: true });

/**
 * Sidebar: section labels + links (Getting started, Components).
 * Component categories are hub pages with icon grids; one HTML file per widget.
 */
const NAV = [
  {
    label: "Getting started",
    items: [
      { id: "home", title: "Overview", file: "home.html" },
      { id: "installation", title: "Installation", file: "installation.html" },
      { id: "usage", title: "Usage", file: "usage.html" },
    ],
  },
  {
    label: "Components",
    items: [
      {
        id: "foundation",
        title: "Foundation",
        blurb: "Typography and UMG layout panels.",
        items: [
          { id: "typography", title: "Typography", icon: "type" },
          { id: "box", title: "Box", icon: "box" },
          { id: "overlay", title: "Overlay", icon: "layers" },
          { id: "scrollbox", title: "Scrollbox", icon: "scroll-text" },
          { id: "canvaspanel", title: "Canvaspanel", icon: "frame" },
          { id: "wrapbox", title: "Wrapbox", icon: "wrap-text" },
          { id: "gridpanel", title: "Gridpanel", icon: "layout-grid" },
          { id: "uniformgridpanel", title: "Uniformgridpanel", icon: "grid-2x2" },
          { id: "widgetswitcher", title: "Widgetswitcher", icon: "panels-top-left" },
          { id: "safezone", title: "Safezone", icon: "shield" },
          { id: "sizebox", title: "Sizebox", icon: "scaling" },
          { id: "scalebox", title: "Scalebox", icon: "zoom-in" },
        ],
      },
      {
        id: "leaf",
        title: "Leaf widgets",
        blurb: "Built-in panel leaf controls.",
        items: [
          { id: "leaf-button", title: "Button", icon: "mouse-pointer-click" },
          { id: "leaf-checkbox", title: "Checkbox", icon: "square-check" },
          { id: "progressbar", title: "Progress Bar", icon: "loader" },
          { id: "leaf-slider", title: "Slider", icon: "sliders-horizontal" },
          { id: "editabletext", title: "Editable Text", icon: "text-cursor-input" },
          { id: "leaf-image", title: "Image", icon: "image" },
        ],
      },
      {
        id: "inputs",
        title: "Inputs",
        blurb: "Form controls from slatehtml-ui.",
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
          { id: "autocomplete", title: "Autocomplete", icon: "search" },
          { id: "tabs", title: "Tabs", icon: "layout-panel-top" },
          { id: "transfer-list", title: "Transfer List", icon: "arrow-left-right" },
        ],
      },
      {
        id: "pickers",
        title: "Pickers",
        blurb: "Menus and combo-style pickers.",
        items: [
          { id: "dropdown", title: "Dropdown", icon: "chevron-down" },
          { id: "combobox", title: "Combobox", icon: "chevrons-up-down" },
        ],
      },
      {
        id: "display",
        title: "Display",
        blurb: "Icons, images, media, and overlays.",
        items: [
          { id: "icon", title: "Icon", icon: "smile" },
          { id: "breadcrumb", title: "Breadcrumb", icon: "chevrons-right" },
          { id: "image", title: "Image", icon: "image" },
          { id: "media", title: "Media", icon: "play" },
          { id: "popup-anchor", title: "Popup Anchor", icon: "anchor" },
          { id: "shadowbox", title: "Shadowbox", icon: "maximize-2" },
        ],
      },
    ],
  },
];

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

function buildNav() {
  if (!navRoot) return;
  navRoot.replaceChildren();
  navRoot.setAttribute("gap", "0");

  for (const section of NAV) {
    const label = document.createElement("div");
    label.className = "docs-nav-label";
    label.textContent = section.label;
    navRoot.append(label);

    const group = document.createElement("div");
    group.className = "docs-nav-group";
    for (const entry of section.items) {
      const link = document.createElement("a");
      link.className = "docs-nav-link";
      link.href = entry.id === "home" ? "#/" : `#/${entry.id}`;
      link.setAttribute("data-route", entry.id);
      link.textContent = entry.title;
      group.append(link);
    }
    navRoot.append(group);
  }
}

function routeFromHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "").split(/[?#]/)[0];
  const id = raw === "" ? "home" : raw;
  return ROUTES[id] ? id : "home";
}

async function loadPageHtml(id) {
  if (pageCache.has(id)) return pageCache.get(id);
  const file = ROUTES[id].file;
  const res = await fetch(new URL(`./pages/${file}`, import.meta.url));
  if (!res.ok) throw new Error(`Failed to load page ${file}: ${res.status}`);
  const html = await res.text();
  pageCache.set(id, html);
  return html;
}

function setActiveNav(id) {
  const hub = hubForRoute(id);
  const activeId = hub ? hub.id : id;
  for (const link of document.querySelectorAll(".docs-nav-link[data-route]")) {
    link.classList.toggle(
      "is-active",
      link.getAttribute("data-route") === activeId
    );
  }
}

function renderHub(hub) {
  const tiles = (hub.items || [])
    .map(
      (item) => `
      <a class="docs-hub-tile" href="#/${item.id}">
        <border kind="panel" padding="18" height="100%">
          <verticalbox gap="12" valign="center" halign="center" height="100%">
            <slate-icon name="${item.icon || "box"}" size="28"></slate-icon>
            <slate-text kind="label" text="${item.title}"></slate-text>
          </verticalbox>
        </border>
      </a>`
    )
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
  const shadow = document.querySelector("slate-shadowbox");

  root.addEventListener("clicked", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.closest("[data-demo-open-shadow]")) {
      shadow?.setAttribute("open", "");
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

/** Stamp edited UMC into the live mount (label / hints stay outside). */
function applySnippet(mount, source) {
  if (!mount) return;
  const html = normalizeSnippet(source);
  mount.innerHTML = html;
}

function demoSnippets(example) {
  return [...example.querySelectorAll(":scope > script[type='text/plain'][data-demo-snippet]")];
}

function defaultSnippet(scripts) {
  return scripts[0] || null;
}

/** Two-column demos: editable Prism `umc` + live mount + event log. */
function wireDemoExamples(root = document) {
  for (const example of root.querySelectorAll("[data-demo-example]")) {
    const scripts = demoSnippets(example);
    let active = defaultSnippet(scripts);
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
      const source = normalizeSnippet(active.textContent);
      paintCode(code, source);
      code.setAttribute("contenteditable", "true");
      code.setAttribute("spellcheck", "false");
      code.setAttribute("role", "textbox");
      code.setAttribute("aria-label", "Editable UMC example");
      code.dataset.plain = source;
      applySnippet(mount, source);

      const commit = () => {
        const next = readCodePlain(code);
        if (next === code.dataset.plain && !code.classList.contains("is-editing")) {
          paintCode(code, next);
          return;
        }
        code.dataset.plain = next;
        if (active) active.textContent = `\n${next}\n`;
        applySnippet(mount, next);
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
  } else {
    const html = await loadPageHtml(id);
    pageRoot.innerHTML = breadcrumbFor(id) + html;
  }
  document.title = `SlateHTML, ${route.title}`;
  setActiveNav(id);
  wirePageChrome(pageRoot);
  wireDemoExamples(pageRoot);
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
onRouteChange();
