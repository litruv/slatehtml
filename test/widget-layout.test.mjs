/**
 * Layout attribute parsing tests.
 */

import { parseAnchors } from "../widget.js";

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

check("top-left top-right stretches along the top edge", () => {
  const anchors = parseAnchors("top-left top-right");
  if (!anchors || anchors.join(",") !== "0,0,1,0") {
    throw new Error(`expected 0,0,1,0 got ${anchors}`);
  }
});

check("bottom-left bottom-right stretches along the bottom edge", () => {
  const anchors = parseAnchors("bottom-left bottom-right");
  if (!anchors || anchors.join(",") !== "0,1,1,1") {
    throw new Error(`expected 0,1,1,1 got ${anchors}`);
  }
});

check("bottom-right is a corner pin", () => {
  const anchors = parseAnchors("bottom-right");
  if (!anchors || anchors.join(",") !== "1,1,1,1") {
    throw new Error(`expected 1,1,1,1 got ${anchors}`);
  }
});

check("left top and top left both pin top-left", () => {
  for (const raw of ["left top", "top left", "top-left"]) {
    const anchors = parseAnchors(raw);
    if (!anchors || anchors.join(",") !== "0,0,0,0") {
      throw new Error(`${raw}: expected 0,0,0,0 got ${anchors}`);
    }
  }
});

check("right bottom pins bottom-right", () => {
  const anchors = parseAnchors("right bottom");
  if (!anchors || anchors.join(",") !== "1,1,1,1") {
    throw new Error(`expected 1,1,1,1 got ${anchors}`);
  }
});

if (failures.length) {
  console.error("\nWidget layout tests failed:\n" + failures.map((f) => ` , ${f}`).join("\n"));
  process.exit(1);
}

console.log("\nAll widget layout tests passed.");
