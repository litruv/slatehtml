import { test } from "node:test";
import assert from "node:assert";
import {
  parseShortcut,
  formatShortcut,
  registerShortcut,
  clearShortcuts,
  listShortcuts,
} from "../umc/shortcuts.js";

test("shortcuts", () => {
  clearShortcuts();

  const p = parseShortcut("mod+shift+s");
  assert.ok(p && p.mod && p.shift && p.key === "s", "parse mod+shift+s");

  const alt = parseShortcut("option+F");
  assert.ok(alt && alt.alt && alt.key === "f", "parse option+F");

  const glyph = parseShortcut("⌘⇧S");
  assert.ok(glyph && glyph.meta && glyph.shift && glyph.key === "s", "parse glyphs");

  assert.ok(formatShortcut("mod+C", true) === "⌘C", "format mac");
  assert.ok(formatShortcut("mod+C", false) === "Ctrl+C", "format pc");
  assert.ok(formatShortcut("mod+alt+I", true) === "⌘⌥I", "format mac alt");
  assert.ok(formatShortcut("mod+alt+I", false) === "Ctrl+Alt+I", "format pc alt");

  // matchShortcut needs a real KeyboardEvent, which node does not have: verify register/unregister only.
  const stop = registerShortcut("mod+K", () => {});
  assert.ok(listShortcuts().some((b) => b.spec === "mod+K"), "registered");
  stop();
  assert.ok(!listShortcuts().some((b) => b.spec === "mod+K"), "unregistered");
});
