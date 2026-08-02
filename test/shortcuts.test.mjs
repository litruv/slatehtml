import {
  parseShortcut,
  matchShortcut,
  formatShortcut,
  registerShortcut,
  clearShortcuts,
  listShortcuts,
} from "../umc/shortcuts.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed");
}

clearShortcuts();

const p = parseShortcut("mod+shift+s");
assert(p && p.mod && p.shift && p.key === "s", "parse mod+shift+s");

const alt = parseShortcut("option+F");
assert(alt && alt.alt && alt.key === "f", "parse option+F");

const glyph = parseShortcut("⌘⇧S");
assert(glyph && glyph.meta && glyph.shift && glyph.key === "s", "parse glyphs");

assert(formatShortcut("mod+C", true) === "⌘C", "format mac");
assert(formatShortcut("mod+C", false) === "Ctrl+C", "format pc");
assert(formatShortcut("mod+alt+I", true) === "⌘⌥I", "format mac alt");
assert(formatShortcut("mod+alt+I", false) === "Ctrl+Alt+I", "format pc alt");

// Fake KeyboardEvent-like for match (no DOM KeyboardEvent in node without polyfill)
class FakeKey {
  constructor(init) {
    Object.assign(this, init);
  }
}
// matchShortcut checks instanceof KeyboardEvent — skip in node, test parse only
// or use a soft match helper. For now verify register doesn't throw.
let fired = 0;
const stop = registerShortcut("mod+K", () => {
  fired += 1;
});
assert(listShortcuts().some((b) => b.spec === "mod+K"), "registered");
stop();
assert(!listShortcuts().some((b) => b.spec === "mod+K"), "unregistered");

console.log("shortcuts.test.mjs: ok");
