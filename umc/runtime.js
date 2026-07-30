/**
 * Runtime helpers for .umc components.
 *
 * In a .umc script section, `defineUmc` is already in scope (injected by the
 * Vite loader). Do not import it.
 *
 * Declarative bind:
 *
 *   <textblock data-umc="title"></textblock>
 *   export default defineUmc({
 *     tag: "title-bar",
 *     attrs: { title: "Slate", status: "Online" },
 *   });
 *
 * Unreal-style UserWidget lifecycle (PascalCase or camelCase):
 *
 *   Initialize / OnInitialized — once, first time the widget enters the tree
 *   PreConstruct               — each attach, before the template is stamped
 *   Construct                  — each attach, after stamp + data-umc bind
 *   SynchronizeProperties      — after Construct, and whenever attrs change
 *   Destruct / Destroyed       — when removed from the tree
 *   Tick(el, api, dt)          — every animation frame while attached (dt in seconds)
 */

import { isUserWidgetTag, prefixBuiltinTag } from "./builtin-tags.js";
import {
  cancelScheduledFrame,
  disposeBag,
  runDisposeBag,
  scheduleFrame,
  watchSource,
} from "./reactivity.js";

const styleIds = new Set();

/** Inject component CSS once per id. */
export function injectUmcStyles(id, css) {
  if (typeof document === "undefined" || !css || styleIds.has(id)) return;
  styleIds.add(id);
  const el = document.createElement("style");
  el.setAttribute("data-umc", id);
  el.textContent = css;
  document.head.appendChild(el);
}

/**
 * Default host box model: disappear from layout (`display: contents`) so the
 * stamped panel is the real flex/grid item — same as nesting panels in root
 * `index.html`. Widgets that *are* the chrome (e.g. slate-button) override
 * `display` on `self` in their own CSS.
 */
export function hostShellCss(tag) {
  return `${tag}{display:contents}`;
}

/** Slot attrs on the host belong on the stamped root when the host is contents. */
const HOST_LAYOUT_ATTRS = [
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "padding",
  "gap",
  "fill",
  "halign",
  "valign",
  "anchors",
  "top",
  "left",
  "right",
  "bottom",
];

export function forwardHostLayout(host) {
  if (!(host instanceof Element)) return host;
  const root = host.firstElementChild;
  if (!root) return host;
  // Hosts that paint their own box (override display on self) keep attrs.
  if (typeof getComputedStyle === "function") {
    if (getComputedStyle(host).display !== "contents") return host;
  }
  for (const name of HOST_LAYOUT_ATTRS) {
    if (!host.hasAttribute(name)) continue;
    root.setAttribute(name, host.getAttribute(name));
  }
  return host;
}

/** Stamp HTML into a host (light DOM). */
export function stamp(host, html) {
  if (html == null) html = "";
  if (typeof html === "string") host.innerHTML = html;
  else if (html instanceof Node) host.replaceChildren(html);
  return forwardHostLayout(host);
}

/**
 * Components render into light DOM, so querySelectorAll sees a nested
 * component's internals too. A UserWidget ancestor (hyphenated, not a
 * prefixed layout builtin like `umc-verticalbox`) marks that boundary.
 */
function ownsNode(host, node) {
  for (let p = node.parentElement; p && p !== host; p = p.parentElement) {
    if (isUserWidgetTag(p.localName)) return false;
  }
  return true;
}

/**
 * Sync host attributes into `[data-umc="…"]` descendants of this host's own
 * template. Each match gets `text="<attr value>"` (override with data-umc-prop).
 */
export function bind(host, defaults = {}) {
  for (const node of host.querySelectorAll("[data-umc]")) {
    const key = node.getAttribute("data-umc");
    if (!key || !ownsNode(host, node)) continue;
    const prop = node.getAttribute("data-umc-prop") || "text";
    const value = host.hasAttribute(key)
      ? host.getAttribute(key)
      : (defaults[key] ?? "");
    if (prop === "textContent") node.textContent = value ?? "";
    else node.setAttribute(prop, value ?? "");
  }
  return host;
}

function normalizeAttrs(attrs) {
  if (!attrs) return { names: [], defaults: {} };
  if (Array.isArray(attrs)) return { names: attrs.slice(), defaults: {} };
  return { names: Object.keys(attrs), defaults: { ...attrs } };
}

export function readAttrs(el, names = [], defaults = {}) {
  const out = {};
  for (const name of names) {
    out[name] = el.hasAttribute(name) ? el.getAttribute(name) : (defaults[name] ?? null);
  }
  return out;
}

/** Pick the first function on def matching any of the given names. */
function hook(def, ...names) {
  for (const name of names) {
    if (typeof def[name] === "function") return def[name];
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Content API — add anything to any widget.
 *
 *   el.add({ tag: "textblock", text: "hi" });   // build + append
 *   el.add(someNode, "plain text", [a, b]);      // nodes / text / arrays
 *   el.set(...items);                            // replace content
 *   el.clear();                                  // empty content
 *
 * Appends into the widget's content region: the first `[data-content]`
 * descendant it owns, else a `getContentTarget()` result, else the host.
 * ------------------------------------------------------------------ */

/**
 * Build a DOM node from a spec.
 *   - Node            → returned as-is
 *   - string / number → text node
 *   - array           → DocumentFragment of built children
 *   - { tag, ...props, children } → element (same prop rules as dom.js:
 *       class→className, style object→assign, onX→listener, true→bool attr,
 *       null/false/undefined→skip, text→`text` attr, else setAttribute)
 */
function applyStyle(el, style) {
  for (const [prop, value] of Object.entries(style)) {
    if (value == null) continue;
    // Custom properties are invisible to Object.assign on a CSSStyleDeclaration.
    if (prop.startsWith("--")) el.style.setProperty(prop, String(value));
    else el.style[prop] = value;
  }
}

export function create(spec) {
  if (spec == null || spec === false || spec === true) return null;
  if (spec instanceof Node) return spec;
  if (typeof spec === "string" || typeof spec === "number") {
    return document.createTextNode(String(spec));
  }
  if (Array.isArray(spec)) {
    const frag = document.createDocumentFragment();
    for (const item of spec) {
      const node = create(item);
      if (node) frag.appendChild(node);
    }
    return frag;
  }

  const { tag, children, ...props } = spec;
  if (!tag) throw new Error("create: spec object needs a `tag`");
  const el = document.createElement(prefixBuiltinTag(tag));

  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "style" && typeof value === "object") applyStyle(el, value);
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, String(value));
  }

  if (children != null) {
    const node = create(children);
    if (node) el.appendChild(node);
  }
  return el;
}

/** Resolve where a host's content should go. */
export function contentTarget(host) {
  if (host.__contentTarget instanceof Element) return host.__contentTarget;
  if (typeof host.getContentTarget === "function") {
    const t = host.getContentTarget();
    if (t instanceof Element) return t;
  }
  for (const node of host.querySelectorAll("[data-content]")) {
    if (ownsNode(host, node)) return node;
  }
  return host;
}

/** Append built items to a host's content region; returns the added element(s). */
export function addContent(host, items) {
  const target = contentTarget(host);
  const added = [];
  for (const item of items) {
    const node = create(item);
    if (!node) continue;
    if (node.nodeType === 11 /* fragment */) added.push(...node.children);
    else added.push(node);
    target.appendChild(node);
  }
  return added.length === 1 ? added[0] : added;
}

/** Methods mixed into every widget (UMC elements + WidgetElement). */
const widgetApi = {
  add(...items) {
    return addContent(this, items);
  },
  set(...items) {
    contentTarget(this).replaceChildren();
    return addContent(this, items);
  },
  clear() {
    contentTarget(this).replaceChildren();
    return this;
  },
  /** Fire a bubbling CustomEvent from this widget. */
  emit(type, detail, options) {
    return emit(this, type, detail, options);
  },
};

/**
 * Dispatch a bubbling CustomEvent from a widget host.
 * Parents (or anything with a reference) listen with addEventListener.
 *
 *   btn.emit("clicked", { text: "OK" });
 *   btn.addEventListener("clicked", (e) => console.log(e.detail));
 */
export function emit(host, type, detail = null, options = {}) {
  const event = new CustomEvent(type, {
    bubbles: options.bubbles !== false,
    composed: options.composed !== false,
    cancelable: options.cancelable === true,
    detail,
  });
  host.dispatchEvent(event);
  return event;
}

/**
 * Normalize `events` from a defineUmc def.
 *
 *   events: ["click"]                       → { click: "click" }
 *   events: { click: "clicked", … }         → as-is
 *   events: { click: { as: "clicked" } }    → { click: "clicked" }
 */
function normalizeEvents(events) {
  if (!events) return {};
  if (Array.isArray(events)) {
    return Object.fromEntries(events.map((name) => [name, name]));
  }
  const out = {};
  for (const [src, value] of Object.entries(events)) {
    if (typeof value === "string") out[src] = value;
    else if (value && typeof value === "object" && value.as) out[src] = value.as;
    else if (value) out[src] = src;
  }
  return out;
}

/**
 * Hook native DOM events on a host and re-emit them as the widget's public
 * event names. Optional OnX / onX hooks on the def run when that event fires.
 *
 * Installed once per element lifetime.
 */
function installEvents(host, eventMap, def) {
  if (host.__umcEventsInstalled || !Object.keys(eventMap).length) return;
  host.__umcEventsInstalled = true;

  for (const [src, published] of Object.entries(eventMap)) {
    const Pascal = published.replace(/(^|[_-])(\w)/g, (_, __, c) => c.toUpperCase());
    const handler = hook(def, `On${Pascal}`, `on${Pascal}`, Pascal);

    host.addEventListener(src, (native) => {
      // Don't re-emit our own CustomEvents when src === published.
      if (native instanceof CustomEvent && native.type === published) return;
      if (host.hasAttribute("disabled")) return;

      const detail = {
        originalEvent: native,
        type: published,
      };
      emit(host, published, detail, { cancelable: true });
      if (handler) {
        handler.call(host, host, makeApi(host, host.__umcHtml ?? "", host.__umcDefaults ?? {}), native);
      }
    });
  }
}

/** Attach the content API to any element instance (for non-WidgetElement hosts). */
export function installWidgetApi(el) {
  for (const [name, fn] of Object.entries(widgetApi)) {
    if (typeof el[name] !== "function") el[name] = fn.bind(el);
  }
  return el;
}

/** Base class for hand-written widgets that want the same add/set/clear API. */
export class WidgetElement extends HTMLElement {}
Object.assign(WidgetElement.prototype, widgetApi);

/**
 * Register a custom element from a .umc definition.
 *
 * Lifecycle mirrors UMG UserWidget. Prefer PascalCase; camelCase aliases work.
 *
 * Events (optional):
 *
 *   events: {
 *     click: "clicked",
 *     dblclick: "doubleclicked",
 *     mousedown: "pressed",
 *     mouseup: "released",
 *   }
 *
 * Native DOM events on the host are re-emitted under the published names.
 * Parents listen with a reference:
 *
 *   btn.addEventListener("clicked", (e) => …)
 *   // or hyperscript: { onClicked: (e) => … }
 *
 * Matching OnClicked / onClicked hooks on the def also run.
 */
export function defineUmc(def) {
  if (!def?.tag) throw new Error("defineUmc: missing tag");

  injectUmcStyles(`${def.tag}__shell`, hostShellCss(def.tag));
  if (def.css) injectUmcStyles(def.cssId ?? def.tag, def.css);

  const { names, defaults } = normalizeAttrs(def.attrs);
  const html = def.html ?? "";
  const eventMap = normalizeEvents(def.events);

  const Initialize = hook(def, "Initialize", "initialize", "OnInitialized", "onInitialized");
  const PreConstruct = hook(def, "PreConstruct", "preConstruct");
  const Construct = hook(def, "Construct", "construct", "connected");
  const SynchronizeProperties = hook(
    def,
    "SynchronizeProperties",
    "synchronizeProperties",
    "OnAttributesChanged",
    "onAttributesChanged"
  );
  const Destruct = hook(
    def,
    "Destruct",
    "destruct",
    "Destroyed",
    "destroyed",
    "OnDestroyed",
    "onDestroyed",
    "disconnected"
  );
  const Tick = hook(def, "Tick", "tick");
  // Legacy full-control path (re-run on connect + attr change)
  const legacyRender = hook(def, "render");

  class UmcElement extends HTMLElement {
    static get observedAttributes() {
      return [...new Set([...names, ...HOST_LAYOUT_ATTRS])];
    }

    connectedCallback() {
      this.__umcHtml = html;
      this.__umcDefaults = defaults;
      const api = makeApi(this, html, defaults);

      if (!this.__umcInitialized) {
        this.__umcInitialized = true;
        installEvents(this, eventMap, def);
        Initialize?.call(this, this, api);
      }

      PreConstruct?.call(this, this, api, { isDesignTime: false });

      if (legacyRender) {
        legacyRender.call(this, this, api);
      } else {
        if (html) stamp(this, html);
        bind(this, defaults);
        Construct?.call(this, this, api);
        SynchronizeProperties?.call(this, this, api);
        forwardHostLayout(this);
      }

      startTick(this, Tick, () => makeApi(this, html, defaults));
    }

    disconnectedCallback() {
      stopTick(this);
      const api = makeApi(this, html, defaults);
      Destruct?.call(this, this, api);
      runDisposeBag(this);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (!this.isConnected || oldValue === newValue) return;
      const api = makeApi(this, html, defaults);

      if (legacyRender) {
        legacyRender.call(this, this, api);
        return;
      }

      // Keep the tree; refresh bindings (like SynchronizeProperties in UMG)
      bind(this, defaults);
      SynchronizeProperties?.call(this, this, api);
      forwardHostLayout(this);
    }
  }

  // Every UMC component gets the content + emit API.
  Object.assign(UmcElement.prototype, widgetApi);

  if (!customElements.get(def.tag)) {
    customElements.define(def.tag, UmcElement);
  }

  return UmcElement;
}

function makeApi(el, html, defaults) {
  return {
    html,
    defaults,
    stamp: (markup = html) => stamp(el, markup),
    bind: (extra = {}) => bind(el, { ...defaults, ...extra }),
    sync: (extra = {}) => {
      stamp(el, html);
      return bind(el, { ...defaults, ...extra });
    },
    attr: (name, fallback = null) =>
      el.hasAttribute(name) ? el.getAttribute(name) : (defaults[name] ?? fallback),
    attrs: (list) => readAttrs(el, list ?? Object.keys(defaults), defaults),
    emit: (type, detail, options) => emit(el, type, detail, options),
    /** Register teardown — runs on Destroyed / disconnect. */
    dispose(fn) {
      if (typeof fn === "function") disposeBag(el).push(fn);
    },
    /** External source → fn; auto-disposes with the widget. */
    watch(subscribe, fn) {
      const off = watchSource(subscribe, fn);
      disposeBag(el).push(off);
      return off;
    },
    /** Coalesce paints to one rAF per key. */
    schedule(key, fn) {
      scheduleFrame(el, key, fn);
    },
    cancelSchedule(key) {
      cancelScheduledFrame(el, key);
    },
  };
}

function startTick(el, Tick, apiFactory) {
  stopTick(el);
  if (!Tick || typeof requestAnimationFrame !== "function") return;

  let last = performance.now();
  const step = (now) => {
    if (!el.isConnected) {
      stopTick(el);
      return;
    }
    const dt = Math.max(0, (now - last) / 1000);
    last = now;
    Tick.call(el, el, apiFactory(), dt);
    el.__umcTick = requestAnimationFrame(step);
  };
  el.__umcTick = requestAnimationFrame(step);
}

function stopTick(el) {
  if (el.__umcTick != null) {
    cancelAnimationFrame(el.__umcTick);
    el.__umcTick = null;
  }
}

export { parseUmc } from "./parse.js";
