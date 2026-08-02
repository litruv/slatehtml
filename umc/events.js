/**
 * Public widget event names. Prefer these over string literals:
 *
 *   on(self.show, e.clicked, () => bump(self.toast))
 *   api.emit(e.closed, { reason: "dismiss" })
 *
 * Values match the published names widgets fire (not native DOM `click`).
 */
export const e = Object.freeze({
  // pointer / button
  clicked: "clicked",
  doubleclicked: "doubleclicked",
  pressed: "pressed",
  released: "released",

  // value / selection
  changed: "changed",
  valuechanged: "valuechanged",
  selectionchanged: "selectionchanged",
  committed: "committed",
  validitychanged: "validitychanged",

  // overlay / feedback
  opened: "opened",
  closed: "closed",
  confirmed: "confirmed",
  cancelled: "cancelled",
  action: "action",
  deleted: "deleted",

  // layout
  sizechanged: "sizechanged",

  // media
  play: "play",
  pause: "pause",
  ended: "ended",
  timeupdate: "timeupdate",
  expandrequested: "expandrequested",
});

export default e;
