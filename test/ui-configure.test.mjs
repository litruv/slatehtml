/**
 * slatehtml-ui configure() / icon defaults.
 */
import {
  configure,
  getSettings,
  resolveIcon,
  lucideSvg,
} from "../packages/slatehtml-ui/src/configure.js";

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

function fakeSvg(mark) {
  return { nodeType: 1, mark, tagName: "SVG" };
}

const prev = getSettings();

check("defaults: Lucide provider, size 16 / stroke 2", () => {
  const s = getSettings();
  if (s.iconSize !== "16") throw new Error(`iconSize ${s.iconSize}`);
  if (s.iconStrokeWidth !== "2") throw new Error(`stroke ${s.iconStrokeWidth}`);
  if (s.icons !== lucideSvg) throw new Error("default icons should be lucideSvg");
});

check("configure iconSize / iconStrokeWidth", () => {
  configure({ iconSize: "20", iconStrokeWidth: "1.5" });
  if (getSettings().iconSize !== "20") throw new Error("iconSize not set");
  if (getSettings().iconStrokeWidth !== "1.5") throw new Error("stroke not set");
});

check("custom icons provider", () => {
  configure({
    icons: (name) => (name === "custom-dot" ? fakeSvg("custom") : null),
  });
  if (resolveIcon("custom-dot")?.mark !== "custom") throw new Error("custom missing");
  if (resolveIcon("search") != null) throw new Error("expected null without compose");
});

check("compose with lucideSvg reference", () => {
  let sawLucide = false;
  configure({
    icons: (name, attrs) => {
      if (name === "custom-dot") return fakeSvg("custom");
      sawLucide = true;
      // Don't call real lucideSvg in node (needs document); just prove the hook.
      return name === "search" ? fakeSvg("lucide-path") : lucideSvg(name, attrs);
    },
  });
  if (resolveIcon("custom-dot")?.mark !== "custom") throw new Error("custom");
  if (resolveIcon("search")?.mark !== "lucide-path") throw new Error("compose");
  if (!sawLucide) throw new Error("provider not invoked");
});

check("invalid icons resets to lucideSvg", () => {
  configure({ icons: "nope" });
  if (getSettings().icons !== lucideSvg) throw new Error("should fall back to lucideSvg");
});

// Restore defaults
configure({
  icons: prev.icons,
  iconSize: prev.iconSize,
  iconStrokeWidth: prev.iconStrokeWidth,
});

if (failures.length) {
  console.error("\nUI configure tests failed:\n" + failures.map((f) => ` , ${f}`).join("\n"));
  process.exit(1);
}

console.log("\nAll UI configure tests passed.");
