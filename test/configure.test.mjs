/**
 * Framework configure() / getSettings().
 */

import { configure, getSettings } from "../widget.js";

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

const prev = getSettings();

check("defaults include dragScroll", () => {
  if (typeof prev.dragScroll !== "boolean") {
    throw new Error(`expected boolean dragScroll, got ${prev.dragScroll}`);
  }
});

check("configure({ dragScroll: true }) sticks", () => {
  const next = configure({ dragScroll: true });
  if (next.dragScroll !== true) throw new Error("expected dragScroll true");
  if (getSettings().dragScroll !== true) throw new Error("getSettings mismatch");
});

check("configure({ dragScroll: false }) sticks", () => {
  const next = configure({ dragScroll: false });
  if (next.dragScroll !== false) throw new Error("expected dragScroll false");
});

// Restore whatever the suite started with.
configure({ dragScroll: prev.dragScroll });

if (failures.length) {
  console.error("\nConfigure tests failed:\n" + failures.map((f) => ` , ${f}`).join("\n"));
  process.exit(1);
}

console.log("\nAll configure tests passed.");
