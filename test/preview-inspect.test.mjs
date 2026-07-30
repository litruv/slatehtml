/**
 * Unit tests for preview source-line inspection helpers.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import previewModule from "../editors/vscode-umc/preview.js";

const root = resolve(import.meta.dirname, "..");
const uiSrc = resolve(root, "packages/slatehtml-ui/src");
const matrixRoot = resolve(root, "../matrix");

const {
  parseUmcSource,
  previewLineRange,
  annotateHtmlWithSourceLines,
  buildPreviewHtml,
} = previewModule;

const failures = [];

function check(label, fn) {
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
    console.log(`  FAIL ${label}`);
  }
}

const sample = `--- html ---
<verticalbox></verticalbox>

--- style ---
self { color: red; }

--- script ---
export default defineUmc({ tag: "demo-widget" });

--- preview ---
<verticalbox gap="8" padding="12">
  <slate-button text="One"></slate-button>
  <slate-button text="Two"></slate-button>
</verticalbox>
`;

check("parseUmcSource records preview line range", () => {
  const sections = parseUmcSource(sample);
  if (sections.preview.startLine !== 11) {
    throw new Error(`expected startLine 11, got ${sections.preview.startLine}`);
  }
  if (sections.preview.endLine !== 15) {
    throw new Error(`expected endLine 15, got ${sections.preview.endLine}`);
  }
});

check("previewLineRange returns 1-based inclusive bounds", () => {
  const range = previewLineRange(sample);
  if (!range || range.start !== 11 || range.end !== 15) {
    throw new Error(`unexpected range: ${JSON.stringify(range)}`);
  }
});

check("annotateHtmlWithSourceLines stamps opening tags", () => {
  const html = `<verticalbox gap="8">
  <slate-button text="One"></slate-button>
</verticalbox>`;
  const out = annotateHtmlWithSourceLines(html, 11);
  if (!out.includes('data-umc-line="11"')) throw new Error("missing line 11 on verticalbox");
  if (!out.includes('data-umc-line="12"')) throw new Error("missing line 12 on slate-button");
});

check("buildPreviewHtml includes data-umc-line in stage markup", () => {
  const html = buildPreviewHtml({
    file: resolve(uiSrc, "slate-button.umc"),
    source: sample,
    resolveUri: (f) => f,
    roots: [root, uiSrc],
    previewBridgeUri: "preview-bridge.js",
  });
  if (!html.includes('data-umc-line="11"')) {
    throw new Error("preview stage missing data-umc-line attributes");
  }
  if (!html.includes("UMC_PREVIEW")) {
    throw new Error("preview missing UMC_PREVIEW config");
  }
  if (!html.includes("preview-bridge.js")) {
    throw new Error("preview missing preview-bridge.js script");
  }
});

check("buildComponentRegistry maps widget tags to source files", () => {
  const scopeFile = resolve(matrixRoot, "widgets/matrix/matrix-scope.umc");
  const source = readFileSync(scopeFile, "utf8");
  const html = buildPreviewHtml({
    file: scopeFile,
    source,
    resolveUri: (f) => f,
    roots: [matrixRoot, uiSrc, root],
    previewBridgeUri: "preview-bridge.js",
  });
  if (!html.includes("slate-scope-picker")) {
    throw new Error("expected slate-scope-picker in preview graph");
  }
  const match = html.match(/components: (\{[\s\S]*?\}),\s*focus:/);
  if (!match) throw new Error("missing UMC_COMPONENTS in preview html");
  const registry = JSON.parse(match[1]);
  const picker = registry["slate-scope-picker"];
  if (!picker?.file?.endsWith("slate-scope-picker.umc")) {
    throw new Error(`unexpected picker registry: ${JSON.stringify(picker)}`);
  }
  if (!picker.htmlLine) throw new Error("expected htmlLine for slate-scope-picker");
  const importMap = html.match(/<script type="importmap"[^>]*>(\{[\s\S]*?\})<\/script>/);
  if (!importMap) throw new Error("missing import map in preview html");
  const imports = JSON.parse(importMap[1]).imports;
  if (!imports["matrix-encrypt-attachment"]?.startsWith("data:text/javascript")) {
    throw new Error("expected matrix-encrypt-attachment preview stub in import map");
  }
});

if (failures.length) {
  console.log("\nFAIL");
  for (const f of failures) console.log(` - ${f}`);
  process.exit(1);
}

console.log("\nPASS");
