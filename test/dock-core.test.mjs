/**
 * Pure parts of dock-core: band zone, split orientation, strip drop index.
 */

import { test } from "node:test";
import { dropIndex, dropZone, splitOrientation, splitWeights } from "../packages/slatehtml-ui/src/dock-core.js";

const cell = { left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 };

test("dropZone: outer band splits at the nearest edge, middle joins the strip", () => {
  const top = dropZone({ x: 100, y: 10 }, cell);
  if (top.zone !== "split" || top.edge !== "top") throw new Error(JSON.stringify(top));
  const right = dropZone({ x: 190, y: 50 }, cell);
  if (right.zone !== "split" || right.edge !== "right") throw new Error(JSON.stringify(right));
  const middle = dropZone({ x: 100, y: 50 }, cell);
  if (middle.zone !== "strip") throw new Error(JSON.stringify(middle));
  // Band is per axis: 50px is 25% of the width but 50% of the height.
  const wide = dropZone({ x: 50, y: 50 }, cell);
  if (wide.zone !== "strip") throw new Error(JSON.stringify(wide));
  const narrow = dropZone({ x: 100, y: 19 }, cell);
  if (narrow.zone !== "split" || narrow.edge !== "top") throw new Error(JSON.stringify(narrow));
  const outside = dropZone({ x: 300, y: 50 }, cell);
  if (outside.zone !== "strip") throw new Error(JSON.stringify(outside));
  // Nearest edge wins in a corner.
  const corner = dropZone({ x: 10, y: 30 }, cell);
  if (corner.zone !== "split" || corner.edge !== "left") throw new Error(JSON.stringify(corner));
  const nearTop = dropZone({ x: 30, y: 10 }, cell);
  if (nearTop.zone !== "split" || nearTop.edge !== "top") throw new Error(JSON.stringify(nearTop));
});

test("dropZone: the band is floored at minPx so a narrow cell still has an edge", () => {
  const narrow = { left: 0, top: 0, right: 60, bottom: 100, width: 60, height: 100 };
  const floor = dropZone({ x: 20, y: 50 }, narrow);
  if (floor.zone !== "split" || floor.edge !== "left") throw new Error(JSON.stringify(floor));
  const past = dropZone({ x: 30, y: 50 }, narrow);
  if (past.zone !== "strip") throw new Error(JSON.stringify(past));
  const noFloor = dropZone({ x: 20, y: 50 }, narrow, 0.2, 0);
  if (noFloor.zone !== "strip") throw new Error(JSON.stringify(noFloor));
});

test("splitOrientation: left/right are horizontal, top/bottom vertical", () => {
  if (splitOrientation("left") !== "horizontal") throw new Error("left");
  if (splitOrientation("right") !== "horizontal") throw new Error("right");
  if (splitOrientation("top") !== "vertical") throw new Error("top");
  if (splitOrientation("bottom") !== "vertical") throw new Error("bottom");
});

test("splitWeights: the pair keeps its combined weight", () => {
  const even = splitWeights(100, 200, 6);
  if (even[0] !== 3 || even[1] !== 3) throw new Error(JSON.stringify(even));
  // Cell floor at MIN_CELL_PX: a 40px cell in a 600px pair.
  const floor = splitWeights(40, 600, 8.8);
  if (floor[0] !== 0.59 || floor[1] !== 8.21) throw new Error(JSON.stringify(floor));
  // Rounding on the first weight must not lose the pair total.
  const odd = splitWeights(101, 300, 1);
  if (Math.round((odd[0] + odd[1]) * 100) !== 100) throw new Error(JSON.stringify(odd));
  if (splitWeights(0, 0, 2)[0] !== 1) throw new Error("zero total");
});

test("dropIndex: rows split at their midpoints", () => {
  const rows = [
    { value: "a", left: 0, right: 40 },
    { value: "b", left: 40, right: 80 },
  ];
  if (dropIndex(rows, { x: 10 }) !== 0) throw new Error("before first row");
  if (dropIndex(rows, { x: 50 }) !== 1) throw new Error("second row");
  if (dropIndex(rows, { x: 200 }) !== 2) throw new Error("after last row");
  if (dropIndex([], { x: 10 }) !== 0) throw new Error("empty strip");
});
