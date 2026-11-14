/**
 * Font Awesome icon provider for slate-icon.
 */
import { test } from "node:test";

// Minimal document so icon() / createElementNS can build SVG in Node.
if (typeof globalThis.document === "undefined") {
  const NS = "http://www.w3.org/2000/svg";
  class MiniEl {
    constructor(ns, tag) {
      this.namespaceURI = ns;
      this.tagName = String(tag || "").toUpperCase();
      this.attributes = new Map();
      this.children = [];
      this.nodeType = 1;
    }
    setAttribute(k, v) {
      this.attributes.set(k, String(v));
    }
    getAttribute(k) {
      return this.attributes.has(k) ? this.attributes.get(k) : null;
    }
    hasAttribute(k) {
      return this.attributes.has(k);
    }
    appendChild(c) {
      this.children.push(c);
      return c;
    }
  }
  globalThis.document = {
    createElementNS(ns, tag) {
      return new MiniEl(ns || NS, tag);
    },
    createElement(tag) {
      return new MiniEl(null, tag);
    },
  };
}

const { fontAwesomeSvg, hasFontAwesomeIcon } = await import(
  "../packages/slatehtml-ui/src/fontawesome-icons.js"
);

test("resolves solid aliases", () => {
  if (!hasFontAwesomeIcon("user")) throw new Error("user");
  if (!hasFontAwesomeIcon("search")) throw new Error("search alias");
  if (!hasFontAwesomeIcon("fas:gear")) throw new Error("fas:gear");
  if (!hasFontAwesomeIcon("solid:house")) throw new Error("solid:house");
});

test("resolves regular / brands prefixes", () => {
  if (!hasFontAwesomeIcon("far:user")) throw new Error("far:user");
  if (!hasFontAwesomeIcon("fab:github")) throw new Error("fab:github");
  if (!hasFontAwesomeIcon("brands:github")) throw new Error("brands:github");
});

test("unknown name → null / false", () => {
  if (hasFontAwesomeIcon("not-a-real-icon-zzz")) throw new Error("should miss");
  if (fontAwesomeSvg("not-a-real-icon-zzz") != null) throw new Error("svg");
});

test("fontAwesomeSvg returns an SVG element", () => {
  const svg = fontAwesomeSvg("user", { width: 18, height: 18 });
  if (!svg || svg.tagName?.toLowerCase() !== "svg") {
    throw new Error(`expected svg, got ${svg?.tagName}`);
  }
  if (!svg.hasAttribute("data-icon-fill")) throw new Error("missing fill mark");
  if (svg.getAttribute("width") !== "18") throw new Error("width");
});
