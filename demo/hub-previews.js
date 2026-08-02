/**
 * Live mini-markup for Palette hub tiles (id → HTML stamped into each tile).
 * Keep these tiny and self-contained — no scripts, no fixed overlays.
 */
export const HUB_PREVIEWS = {
  // Panel
  box: `<border kind="panel" padding="8" width="120">
  <verticalbox gap="6">
    <border kind="well" padding="6" height="18"></border>
    <horizontalbox gap="6">
      <border kind="well" padding="6" fill height="28"></border>
      <border kind="well" padding="6" fill height="28"></border>
    </horizontalbox>
  </verticalbox>
</border>`,
  overlay: `<overlay width="120" height="56">
  <border kind="well" anchors="fill" padding="0"></border>
  <border kind="panel" padding="6" halign="center" valign="center">
    <textblock text="Overlay"></textblock>
  </border>
</overlay>`,
  scrollbox: `<scrollbox width="120" height="56" padding="6">
  <verticalbox gap="4">
    <border kind="well" padding="4" height="14"></border>
    <border kind="well" padding="4" height="14"></border>
    <border kind="well" padding="4" height="14"></border>
    <border kind="well" padding="4" height="14"></border>
  </verticalbox>
</scrollbox>`,
  wrapbox: `<wrapbox width="120" gap="4">
  <border kind="well" padding="6" width="36" height="22"></border>
  <border kind="well" padding="6" width="36" height="22"></border>
  <border kind="well" padding="6" width="36" height="22"></border>
  <border kind="well" padding="6" width="36" height="22"></border>
</wrapbox>`,
  gridpanel: `<gridpanel columns="2" gap="4" width="100">
  <border kind="well" padding="6" height="22"></border>
  <border kind="well" padding="6" height="22"></border>
  <border kind="well" padding="6" height="22"></border>
  <border kind="well" padding="6" height="22"></border>
</gridpanel>`,
  widgetswitcher: `<border kind="panel" padding="8" width="120">
  <horizontalbox gap="6" valign="center">
    <border kind="well" padding="4 8"><textblock text="A"></textblock></border>
    <textblock text="Pane"></textblock>
  </horizontalbox>
</border>`,
  sizebox: `<sizebox width="80" height="40">
  <border kind="panel" padding="8" fill>
    <textblock text="Sized"></textblock>
  </border>
</sizebox>`,
  scalebox: `<scalebox width="100" height="48">
  <border kind="panel" padding="10">
    <textblock text="Scaled"></textblock>
  </border>
</scalebox>`,

  // Common
  typography: `<verticalbox gap="2">
  <slate-text kind="title" text="Title"></slate-text>
  <slate-text kind="body" text="Body copy"></slate-text>
</verticalbox>`,
  "leaf-button": `<button type="button">Button</button>`,
  "leaf-checkbox": `<label><input type="checkbox" checked> Check</label>`,
  progressbar: `<progressbar percent="62" width="120"></progressbar>`,
  "leaf-slider": `<slider value="0.55" width="120"></slider>`,
  editabletext: `<editabletext text="Edit me" width="120"></editabletext>`,
  "leaf-image": `<image src="https://picsum.photos/seed/hub-leaf/96/56" width="96" height="56"></image>`,

  // Input
  button: `<slate-button text="Button"></slate-button>`,
  "toggle-button": `<slate-toggle-button text="Bold" pressed></slate-toggle-button>`,
  "button-group": `<slate-button-group>
  <slate-toggle-button text="A" pressed></slate-toggle-button>
  <slate-toggle-button text="B"></slate-toggle-button>
</slate-button-group>`,
  checkbox: `<slate-checkbox label="Remember" checked></slate-checkbox>`,
  switch: `<slate-switch label="On" checked></slate-switch>`,
  "radio-group": `<slate-radio-group options="a|One, b|Two" selected="a"></slate-radio-group>`,
  rating: `<slate-rating value="3"></slate-rating>`,
  slider: `<slate-slider value="0.6" width="120"></slate-slider>`,
  "text-field": `<slate-text-field label="Email" value="hi@x.dev" width="140"></slate-text-field>`,
  select: `<slate-select options="a|Alpha, b|Beta" selected="a" width="120"></slate-select>`,
  dropdown: `<slate-dropdown options="a|Alpha, b|Beta" selected="a" width="120"></slate-dropdown>`,
  combobox: `<slate-combobox options="Red, Green, Blue" value="Green" width="120"></slate-combobox>`,
  autocomplete: `<slate-autocomplete options="Apple, Apricot, Banana" value="Ap" width="120"></slate-autocomplete>`,
  tabs: `<slate-tabs options="one|One, two|Two" selected="one" width="140"></slate-tabs>`,
  "transfer-list": `<horizontalbox gap="6" valign="center">
  <border kind="well" padding="6" width="48" height="40"></border>
  <textblock text="↔"></textblock>
  <border kind="well" padding="6" width="48" height="40"></border>
</horizontalbox>`,

  // Display
  icon: `<horizontalbox gap="8" valign="center">
  <slate-icon name="search" size="22"></slate-icon>
  <slate-icon name="bell" size="22"></slate-icon>
  <slate-icon name="star" size="22"></slate-icon>
</horizontalbox>`,
  chip: `<horizontalbox gap="6">
  <slate-chip text="Design"></slate-chip>
  <slate-chip text="UMC" kind="outlined"></slate-chip>
</horizontalbox>`,
  badge: `<slate-badge text="3">
  <slate-icon name="bell" size="22"></slate-icon>
</slate-badge>`,
  divider: `<verticalbox gap="6" width="120">
  <border kind="well" padding="4" height="10"></border>
  <slate-divider></slate-divider>
  <border kind="well" padding="4" height="10"></border>
</verticalbox>`,
  list: `<slate-list
  kind="plain"
  dense
  options="inbox|Inbox|inbox, star|Starred|star, send|Sent|send"
  selected="inbox"
  width="132"
></slate-list>`,
  table: `<slate-table dense striped width="140">
  <slate-row kind="header">
    <slate-column text="Name"></slate-column>
    <slate-column text="Role"></slate-column>
  </slate-row>
  <slate-row value="0"><slate-column text="Ada"></slate-column><slate-column text="Admin"></slate-column></slate-row>
  <slate-row value="1" stripe><slate-column text="Linus"></slate-column><slate-column text="Dev"></slate-column></slate-row>
</slate-table>`,
  tooltip: `<slate-tooltip text="Save">
  <slate-button text="Hover"></slate-button>
</slate-tooltip>`,
  breadcrumb: `<slate-breadcrumb items="Home, Docs, Button"></slate-breadcrumb>`,
  image: `<slate-image src="https://picsum.photos/seed/hub-img/96/56" width="96" height="56"></slate-image>`,
  media: `<border kind="panel" padding="0" width="96" height="56">
  <overlay fill>
    <border kind="well" anchors="fill"></border>
    <slate-icon name="play" size="20" halign="center" valign="center"></slate-icon>
  </overlay>
</border>`,
  "popup-anchor": `<popup-anchor>
  <slate-button text="Menu"></slate-button>
</popup-anchor>`,
  shadowbox: `<shadowbox-button src="https://picsum.photos/seed/hub-sb/80/48" text="Open"></shadowbox-button>`,

  // Feedback
  alert: `<slate-alert kind="success" text="Saved"></slate-alert>`,
  snackbar: `<border kind="panel" class="docs-hub-snack-fake" padding="8 12" width="140">
  <horizontalbox gap="8" valign="center">
    <textblock text="Copied" fill></textblock>
    <textblock text="Undo"></textblock>
  </horizontalbox>
</border>`,
  dialog: `<border class="docs-hub-dialog-fake" width="148" height="72" padding="0">
  <overlay fill>
    <border class="docs-hub-dialog-scrim" anchors="fill"></border>
    <border class="docs-hub-dialog-card" kind="panel" padding="8" halign="center" valign="center" width="118">
      <verticalbox gap="6" width="100%">
        <textblock class="docs-hub-dialog-title" text="Delete file?"></textblock>
        <textblock class="docs-hub-dialog-body" text="Can't undo."></textblock>
        <horizontalbox gap="4" halign="right" width="100%">
          <border class="docs-hub-dialog-btn" padding="2 6"><textblock text="Cancel"></textblock></border>
          <border class="docs-hub-dialog-btn docs-hub-dialog-btn-accent" padding="2 6"><textblock text="Delete"></textblock></border>
        </horizontalbox>
      </verticalbox>
    </border>
  </overlay>
</border>`,
  skeleton: `<verticalbox gap="6" width="120">
  <slate-skeleton height="14"></slate-skeleton>
  <slate-skeleton height="14"></slate-skeleton>
  <slate-skeleton height="28"></slate-skeleton>
</verticalbox>`,
};
