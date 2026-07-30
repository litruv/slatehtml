/**
 * UMC style lint: forbid flex/grid/positioning CSS in --- style ---.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { lintUmcStyle, assertUmcStyle } = require("../umc/lint-style.cjs");

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

check("allows appearance + display:contents/none/block", () => {
  const errors = lintUmcStyle(`
self {
  display: contents;
  color: red;
  --widget-background: #111;
}
.x[hidden] { display: none; }
.y { display: block; }
`);
  if (errors.length) throw new Error(JSON.stringify(errors));
});

check("flags display:flex / inline-flex / grid", () => {
  const errors = lintUmcStyle(`
self { display: flex; }
.a { display: inline-flex; }
.b { display: grid; }
`);
  if (errors.length !== 3) throw new Error(`expected 3 got ${errors.length}: ${JSON.stringify(errors)}`);
});

check("flags flex / align / position / z-index / inset edges", () => {
  const errors = lintUmcStyle(`
.x {
  flex: 1;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  gap: 8px;
}
`);
  if (errors.length < 8) throw new Error(`expected >=8 got ${errors.length}: ${JSON.stringify(errors)}`);
});

check("umc-layout-ok on the same line allows the declaration", () => {
  const errors = lintUmcStyle(`
self {
  display: inline-flex; /* umc-layout-ok */
  position: relative; /* umc-layout-ok */
  color: red;
}
.bad { flex: 1; }
`);
  if (errors.length !== 1 || errors[0].prop !== "flex") {
    throw new Error(JSON.stringify(errors));
  }
});

check("ignores custom properties and background-position", () => {
  const errors = lintUmcStyle(`
.x {
  --flex: 1;
  background-position: center;
  object-position: center;
}
`);
  if (errors.length) throw new Error(JSON.stringify(errors));
});

check("assertUmcStyle throws a build-style error", () => {
  let threw = false;
  try {
    assertUmcStyle(".x { position: fixed; }", { file: "widget.umc", lineOffset: 10 });
  } catch (err) {
    threw = true;
    if (!String(err.message).includes("[umc]")) throw err;
    if (!String(err.message).includes("widget.umc:11:")) throw err;
  }
  if (!threw) throw new Error("expected throw");
});

if (failures.length) {
  console.error("\nUMC style lint tests failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log("\nAll UMC style lint tests passed.");
