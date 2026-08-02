/**
 * Shared options grammar: values, labels, avatars, separators, categories.
 */

import {
  parseOptions,
  selectableOptions,
  serializeOptions,
  isOption,
} from "../packages/slatehtml-ui/src/input/parse-options.js";

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

check("plain values", () => {
  const items = parseOptions("a, b");
  if (items.length !== 2 || !items.every(isOption)) throw new Error(JSON.stringify(items));
});

check("pipe label + avatar URL", () => {
  const [item] = parseOptions("host|Matrix|https://x");
  if (
    item.value !== "host" ||
    item.label !== "Matrix" ||
    item.avatar !== "https://x" ||
    item.icon
  ) {
    throw new Error(JSON.stringify(item));
  }
});

check("pipe label + lucide icon", () => {
  const [item] = parseOptions("text|Text|hash");
  if (item.avatar || item.icon !== "hash") throw new Error(JSON.stringify(item));
});

check("separator and category", () => {
  const items = parseOptions("# Text, general, ---, # Voice, voice|Voice");
  if (items.map((i) => i.type).join(",") !== "category,option,separator,category,option") {
    throw new Error(items.map((i) => i.type).join(","));
  }
  const opts = selectableOptions(items);
  if (opts.length !== 2 || opts[0].value !== "general" || opts[1].value !== "voice") {
    throw new Error(JSON.stringify(opts));
  }
});

check("serialize round-trip markers", () => {
  const items = parseOptions("# Rooms, a|A|https://x, b|B|hash, ---, c");
  const raw = serializeOptions(items);
  if (
    !raw.includes("# Rooms") ||
    !raw.includes("---") ||
    !raw.includes("a|A|https://x") ||
    !raw.includes("b|B|hash")
  ) {
    throw new Error(raw);
  }
});

if (failures.length) {
  console.error("\nparse-options tests failed:\n" + failures.map((f) => ` , ${f}`).join("\n"));
  process.exit(1);
}

console.log("\nAll parse-options tests passed.");
