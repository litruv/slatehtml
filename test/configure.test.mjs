/**
 * Framework configure() / getSettings().
 */

import { describe, test, after } from "node:test";
import { configure, getSettings } from "../widget.js";

describe("configure", () => {
  const prev = getSettings();

  test("defaults include dragScroll", () => {
    if (typeof prev.dragScroll !== "boolean") {
      throw new Error(`expected boolean dragScroll, got ${prev.dragScroll}`);
    }
  });

  test("configure({ dragScroll: true }) sticks", () => {
    const next = configure({ dragScroll: true });
    if (next.dragScroll !== true) throw new Error("expected dragScroll true");
    if (getSettings().dragScroll !== true) throw new Error("getSettings mismatch");
  });

  test("configure({ dragScroll: false }) sticks", () => {
    const next = configure({ dragScroll: false });
    if (next.dragScroll !== false) throw new Error("expected dragScroll false");
  });

  // Restore whatever the suite started with.
  after(() => configure({ dragScroll: prev.dragScroll }));
});
