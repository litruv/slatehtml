/**
 * Layout attribute parsing tests.
 */

import { test } from "node:test";
import { parseAnchors } from "../widget.js";

test("top-left top-right stretches along the top edge", () => {
  const anchors = parseAnchors("top-left top-right");
  if (!anchors || anchors.join(",") !== "0,0,1,0") {
    throw new Error(`expected 0,0,1,0 got ${anchors}`);
  }
});

test("bottom-left bottom-right stretches along the bottom edge", () => {
  const anchors = parseAnchors("bottom-left bottom-right");
  if (!anchors || anchors.join(",") !== "0,1,1,1") {
    throw new Error(`expected 0,1,1,1 got ${anchors}`);
  }
});

test("bottom-right is a corner pin", () => {
  const anchors = parseAnchors("bottom-right");
  if (!anchors || anchors.join(",") !== "1,1,1,1") {
    throw new Error(`expected 1,1,1,1 got ${anchors}`);
  }
});

test("left top and top left both pin top-left", () => {
  for (const raw of ["left top", "top left", "top-left"]) {
    const anchors = parseAnchors(raw);
    if (!anchors || anchors.join(",") !== "0,0,0,0") {
      throw new Error(`${raw}: expected 0,0,0,0 got ${anchors}`);
    }
  }
});

test("right bottom pins bottom-right", () => {
  const anchors = parseAnchors("right bottom");
  if (!anchors || anchors.join(",") !== "1,1,1,1") {
    throw new Error(`expected 1,1,1,1 got ${anchors}`);
  }
});
