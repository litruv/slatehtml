/**
 * Pure drop rules for slate-dock (no DOM).
 *
 *   dropZone(point, rect, band, minPx) → { zone: "strip" | "split", edge }
 *   splitOrientation(edge)             → dock orientation for that split
 *   dropIndex(rows, point)             → insertion index among strip rows
 */

/**
 * Point inside `rect`; the outer `band` fraction of the cell splits, the middle joins the strip.
 * `minPx` floors the band so a narrow cell still has a usable edge.
 */
export function dropZone(point, rect, band = 0.2, minPx = 24) {
  if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) {
    return { zone: "strip", edge: "" };
  }
  const edges = [
    ["top", (point.y - rect.top) / (rect.height || 1), rect.height || 1],
    ["bottom", (rect.bottom - point.y) / (rect.height || 1), rect.height || 1],
    ["left", (point.x - rect.left) / (rect.width || 1), rect.width || 1],
    ["right", (rect.right - point.x) / (rect.width || 1), rect.width || 1],
  ];
  let nearest = edges[0];
  for (const edge of edges) {
    if (edge[1] < nearest[1]) nearest = edge;
  }
  if (nearest[1] > band && nearest[1] * nearest[2] > minPx) return { zone: "strip", edge: "" };
  return { zone: "split", edge: nearest[0] };
}

export function splitOrientation(edge) {
  return edge === "left" || edge === "right" ? "horizontal" : "vertical";
}

/** rows are { left, right } boxes: index is the count of rows whose midpoint is left of the point. */
export function dropIndex(rows, point) {
  let index = 0;
  for (const row of rows) {
    if (point.x < (row.left + row.right) / 2) break;
    index += 1;
  }
  return index;
}
