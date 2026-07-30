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

const ok =
  inline.html.value.includes("<div>hi</div>") &&
  inline.style.value.includes("color: red") &&
  inline.script.value.includes("defineUmc") &&
  inline.preview.value.includes('<x label="demo">') &&
  linked.preview.value === "" &&
  linked.html.kind === "link" &&
  linked.html.value === "./a.html" &&
  linked.style.value === "./a.css" &&
  linked.script.value === "./a.js";

console.log(ok ? "parse PASS" : "parse FAIL");
process.exit(ok ? 0 : 1);
