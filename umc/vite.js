/**
 * Vite plugin: import "./widget.umc" → JS module registering a custom element.
 *
 * Supports:
 *   @parent textblock   optional, subclass a builtin (host *is* the leaf)
 *   --- html ---     inline markup, or `@ ./file.html`
 *   --- style ---    inline CSS, or `@ ./file.css`
 *   --- script ---   inline JS, or `@ ./file.js`
 *   --- preview ---  editor-only (ignored here)
 *
 * The script should `export default defineUmc({ ... })`.
 * The plugin injects `html` / `css` / `cssId` / `extends` (from `@parent`)
 * into that call, HTML and CSS are always string-inlined into the JS module
 * (no separate CSS emit).
 *
 * Custom tags in the HTML section are auto-imported (./tag.umc or under the
 * nearest widgets/ tree). Set `umc({ autoImport: false })` to opt out.
 *
 * In `--- style ---`, `self` compiles to the component tag
 * (`self[selected]` → `server-pill[selected]`).
 * Bare layout tags (`verticalbox`) compile to `umc-*` custom elements.
 *
 * Uses resolveId + load (not transform) so Vite never tries to parse .umc as JS.
 * Also transforms app HTML (bare → umc-*) and dualizes app CSS type selectors
 * so styles match both stamped umc-* hosts and bare tags (e.g. SPA-injected demos).
 *
 * Optional companion: `singleFile()`, collapses a Vite app build into one
 * self-contained `index.html` (JS + CSS inlined).
 *
 * Library packages (e.g. slatehtml-ui) should pass `runtime: "slatehtml/umc"`
 * so compiled widgets import the peer runtime instead of a file:// path. */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseUmc } from "./parse.js";

const require = createRequire(import.meta.url);
const {
  injectAutoImports,
  guessTag,
  rewriteSelfSelectors,
  prefixBuiltinTagsInHtml,
  prefixBuiltinTagsInCss,
  prefixBuiltinTagsInScript,
  dualizeBuiltinSelectors,
} = require("./auto-import.cjs");
const { assertUmcStyle } = require("./lint-style.cjs");

const RUNTIME = resolve(dirname(fileURLToPath(import.meta.url)), "runtime.js");
const RUNTIME_URL = pathToFileURL(RUNTIME).href;

function hash(s) {
  return createHash("sha1").update(s).digest("hex").slice(0, 10);
}

/** `server-pill.umc` → `server-pill` when defineUmc tag isn't available yet. */
function tagFromFilename(umcPath) {
  const base = umcPath.split(/[/\\]/).pop()?.replace(/\.umc$/i, "") ?? "";
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/i.test(base) ? base.toLowerCase() : null;
}

function resolveSection(section, umcPath) {
  if (!section || section.kind === "inline") {
    return { code: section?.value ?? "", file: null };
  }
  const file = resolve(dirname(umcPath), section.value);
  if (!existsSync(file)) {
    throw new Error(`[umc] missing linked file: ${section.value} (from ${umcPath})`);
  }
  return { code: readFileSync(file, "utf8"), file };
}

/**
 * `defineUmc` is provided by the loader, strip user imports of it so the
 * injected helper (with html/css) wins.
 */
function stripDefineUmcImport(script) {
  return script.replace(
    /^\s*import\s*\{([^}]*)\}\s*from\s*["']slatehtml\/umc["']\s*;?\s*$/gm,
    (_, names) => {
      const rest = names
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !/^defineUmc(\s+as\s+\w+)?$/.test(s));
      if (!rest.length) return "";
      return `import { ${rest.join(", ")} } from "slatehtml/umc";\n`;
    }
  );
}

function injectIntoScript(script, { html, css, cssId, extends: extendsTag, runtimeId, umcPath, autoImport }) {
  script = stripDefineUmcImport(script);

  // Collect child imports from (possibly prefixed) html, builtins are skipped.
  const withAutos = injectAutoImports(script, html, umcPath, autoImport);
  const autoImportLines = [];
  const bodyScript = withAutos.replace(
    /^[ \t]*import\s+["']\.[^"']+["']\s*;?[ \t]*\n?/gm,
    (line) => {
      autoImportLines.push(line.trim().replace(/;?\s*$/, ";"));
      return "";
    }
  );

  const extendsBare = extendsTag ? String(extendsTag).trim().toLowerCase() : "";
  const headerLines = [
    `import { defineUmc as __defineUmc } from ${JSON.stringify(runtimeId)};`,
    ...autoImportLines,
    `const __umcHtml = ${JSON.stringify(html)};`,
    `const __umcCss = ${JSON.stringify(css)};`,
    `const __umcCssId = ${JSON.stringify(cssId)};`,
  ];
  if (extendsBare) {
    headerLines.push(`const __umcExtends = ${JSON.stringify(extendsBare)};`);
  }
  headerLines.push(
    `const defineUmc = (def = {}) => __defineUmc({`,
    `  html: __umcHtml,`,
    `  css: __umcCss,`,
    `  cssId: __umcCssId,`,
    `  ...def,`,
    ...(extendsBare ? [`  extends: __umcExtends,`] : []),
    `});`,
    ""
  );
  const header = headerLines.join("\n");

  if (/\bdefineUmc\s*\(/.test(bodyScript) || /\bexport\s+default\s+defineUmc\b/.test(bodyScript)) {
    return `${header}${bodyScript}`;
  }

  if (/export\s+default\s*\{/.test(bodyScript)) {
    const wrapped = bodyScript.replace(
      /export\s+default\s*\{/,
      "export default defineUmc({"
    );
    const fixed = wrapped.replace(/export default defineUmc\(\{([\s\S]*)\}\s*;?\s*$/, (_, body) => {
      return `export default defineUmc({${body}});`;
    });
    return `${header}${fixed}`;
  }

  return `${header}${bodyScript}\n`;
}

function styleSectionLineOffset(source) {
  const lines = String(source ?? "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^---\s*(?:style|css)\s*---\s*$/i.test(lines[i])) {
      // lint line 1 == first content line == file line (i + 2)
      return i + 1;
    }
  }
  return 0;
}

function compileUmc(source, umcPath, autoImport = {}, runtimeId = RUNTIME_URL) {
  const sections = parseUmc(source);
  // preview is editor-only, intentionally unused
  const htmlSec = resolveSection(sections.html, umcPath);
  const styleSec = resolveSection(sections.style, umcPath);
  const scriptSec = resolveSection(sections.script, umcPath);

  const cssId = `umc-${hash(relative(process.cwd(), umcPath))}`;
  const rawScript =
    scriptSec.code.trim() || `export default defineUmc({ tag: "umc-anon-${cssId}" });`;
  const tag = guessTag(rawScript) || tagFromFilename(umcPath) || `umc-anon-${cssId}`;

  // Discover auto-imports from bare markup, then emit prefixed DOM/CSS/JS.
  const bareHtml = htmlSec.code;
  assertUmcStyle(styleSec.code, {
    file: styleSec.file || umcPath,
    lineOffset: styleSec.file ? 0 : styleSectionLineOffset(source),
  });
  const html = prefixBuiltinTagsInHtml(bareHtml);
  const css = prefixBuiltinTagsInCss(rewriteSelfSelectors(styleSec.code, tag));
  const script = prefixBuiltinTagsInScript(rawScript);

  return injectIntoScript(script, {
    html,
    css,
    cssId,
    extends: sections.parent || "",
    runtimeId,
    umcPath,
    autoImport,
    // Pass bare HTML for discovery if inject ever needs it, currently
    // prefixed html is fine because custom tags are unchanged.
  });
}

/** Rewrite bare tags in an HTML document (body + inline <style> / <script>). */
function transformHtmlDocument(html) {
  if (!html) return html;
  const src = String(html);
  const parts = [];
  let last = 0;
  const blockRe = /<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m;
  while ((m = blockRe.exec(src))) {
    parts.push(prefixBuiltinTagsInHtml(src.slice(last, m.index)));
    const block = m[0];
    if (/^<style\b/i.test(block)) {
      parts.push(
        block.replace(
          /^(<style\b[^>]*>)([\s\S]*)(<\/style>)$/i,
          (_, open, css, close) => open + prefixBuiltinTagsInCss(css) + close
        )
      );
    } else {
      parts.push(
        block.replace(
          /^(<script\b[^>]*>)([\s\S]*)(<\/script>)$/i,
          (_, open, js, close) => open + prefixBuiltinTagsInScript(js) + close
        )
      );
    }
    last = m.index + m[0].length;
  }
  parts.push(prefixBuiltinTagsInHtml(src.slice(last)));
  return parts.join("");
}

export function umc(options = {}) {
  const ext = options.extension ?? ".umc";
  const autoImport = {
    autoImport: options.autoImport !== false,
    roots: options.roots ?? [],
  };
  // Default: absolute file URL so Vite can resolve the runtime next to this
  // plugin. Library packages should pass `runtime: "slatehtml/umc"` so the
  // built bundle externalizes against the peer instead of inlining a path.
  const runtimeId = options.runtime ?? RUNTIME_URL;

  return {
    name: "slatehtml-umc",
    enforce: "pre",

    resolveId(id, importer) {
      const clean = String(id || "").split("?")[0];
      if (!clean.endsWith(ext)) return null;
      if (clean.startsWith("\0") || clean.includes("://")) return null;
      const resolved = importer
        ? resolve(dirname(importer.split("?")[0]), clean)
        : resolve(clean);
      return resolved;
    },

    load(id) {
      const path = id.split("?")[0];
      if (!path.endsWith(ext)) return null;
      if (!existsSync(path)) return null;
      const source = readFileSync(path, "utf8");
      return compileUmc(source, path, autoImport, runtimeId);
    },

    transform(code, id) {
      const path = id.split("?")[0];
      if (!path.endsWith(".css")) return null;
      // widget.css is already dualized (:is(bare, umc-bare)); leave it.
      if (/[/\\]widget\.css$/.test(path)) return null;
      // Dualize so app chrome matches both Vite-prefixed index.html hosts and
      // bare tags injected at runtime (docs pages, editable demo mounts).
      const next = dualizeBuiltinSelectors(code);
      if (next === code) return null;
      return { code: next, map: null };
    },

    transformIndexHtml(html) {
      return transformHtmlDocument(html);
    },
  };
}

/**
 * Collapse a Vite app build into a single self-contained HTML file.
 *
 *   plugins: [umc(), singleFile()]
 *
 * `.umc` HTML/CSS are already inside the JS modules; this also inlines the
 * remaining app CSS (`import "./x.css"`) and the entry script into `index.html`.
 */
export function singleFile() {
  return {
    name: "slatehtml-single-file",
    apply: "build",
    enforce: "post",

    config() {
      return {
        build: {
          cssCodeSplit: false,
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          modulePreload: false,
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        },
      };
    },

    generateBundle(_opts, bundle) {
      const htmlName = Object.keys(bundle).find(
        (name) => name.endsWith(".html") && bundle[name].type === "asset"
      );
      if (!htmlName) return;

      let html = String(bundle[htmlName].source);
      const drop = [];

      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === "chunk" && item.isEntry) {
          const re = new RegExp(
            `<script[^>]*\\bsrc=["'][^"']*${escapeRegExp(name)}["'][^>]*><\\/script>`,
            "i"
          );
          html = html.replace(re, () => `<script type="module">${item.code}</script>`);
          drop.push(name);
        } else if (item.type === "asset" && name.endsWith(".css")) {
          const re = new RegExp(
            `<link[^>]*\\bhref=["'][^"']*${escapeRegExp(name)}["'][^>]*>`,
            "i"
          );
          html = html.replace(re, () => `<style>${item.source}</style>`);
          drop.push(name);
        }
      }

      // Vite may leave modulepreload hints that point at deleted chunks.
      html = html.replace(/<link[^>]*rel=["']modulepreload["'][^>]*>\s*/gi, "");

      for (const name of drop) delete bundle[name];
      bundle[htmlName].source = html;
    },
  };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default umc;
