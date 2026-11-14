import { test } from "node:test";
import assert from "node:assert";
import { parseUmc } from "../umc/parse.js";

// Run with: npm test

const inline = parseUmc(`
--- html ---
<div>hi</div>

--- style ---
.x { color: red }

--- script ---
export default defineUmc({ tag: "x" });

--- preview ---
<x label="demo"></x>
`);

const linked = parseUmc(`
--- html ---
@ ./a.html

--- style ---
@ ./a.css

--- script ---
@ ./a.js
`);

const parented = parseUmc(`
@parent textblock

--- style ---
self { color: red }

--- script ---
export default defineUmc({ tag: "slate-text" });
`);

const parentAngle = parseUmc(`@parent <border>\n--- script ---\nexport default defineUmc({ tag: "x" });\n`);

test("parse", () => {
  assert.ok(inline.html.value.includes("<div>hi</div>"));
  assert.ok(inline.style.value.includes("color: red"));
  assert.ok(inline.script.value.includes("defineUmc"));
  assert.ok(inline.preview.value.includes('<x label="demo">'));
  assert.ok(inline.parent === "");
  assert.ok(linked.preview.value === "");
  assert.ok(linked.html.kind === "link");
  assert.ok(linked.html.value === "./a.html");
  assert.ok(linked.style.value === "./a.css");
  assert.ok(linked.script.value === "./a.js");
  assert.ok(parented.parent === "textblock");
  assert.ok(parented.style.value.includes("color: red"));
  assert.ok(parentAngle.parent === "border");
});
