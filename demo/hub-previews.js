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
  tabs: `<slate-tabs active="a" width="140" height="72">
  <border page="a" label="A" kind="well" padding="6"><textblock text="A"></textblock></border>
  <border page="b" label="B" kind="well" padding="6"><textblock text="B"></textblock></border>
</slate-tabs>`,
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
  divider: `<verticalbox gap="8" width="110" valign="center">
  <slate-icon name="separator-horizontal" size="22"></slate-icon>
  <slate-divider></slate-divider>
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
  accordion: `<slate-accordion open="one" width="132">
  <slate-accordion-item name="one" title="General">
    <textblock text="Basics"></textblock>
  </slate-accordion-item>
  <slate-accordion-item name="two" title="Alerts">
    <textblock text="Push"></textblock>
  </slate-accordion-item>
</slate-accordion>`,
  "app-bar": `<slate-app-bar title="Inbox" dense kind="elevated" width="140">
  <slot-leading><slate-icon name="menu" size="16"></slate-icon></slot-leading>
  <slate-icon name="search" size="14"></slate-icon>
</slate-app-bar>`,
  "title-bar": `<slate-title-bar title="SlateHTML" status="Online" dense width="140">
  <slot-leading><slate-icon name="app-window" size="14"></slate-icon></slot-leading>
</slate-title-bar>`,
  footer: `<slate-footer text="© SlateHTML" dense width="140">
  <slate-text kind="hint" text="Docs"></slate-text>
</slate-footer>`,
  "bottom-nav": `<slate-bottom-nav selected="home" width="140">
  <slate-bottom-nav-item value="home" text="Home" icon="house" selected></slate-bottom-nav-item>
  <slate-bottom-nav-item value="search" text="Search" icon="search"></slate-bottom-nav-item>
  <slate-bottom-nav-item value="me" text="Me" icon="user"></slate-bottom-nav-item>
</slate-bottom-nav>`,
  drawer: `<border class="docs-hub-drawer-fake" fill>
  <horizontalbox fill>
    <border class="docs-hub-drawer-panel" width="44" padding="6">
      <verticalbox gap="4">
        <textblock class="docs-hub-drawer-title" text="Menu"></textblock>
        <textblock class="docs-hub-drawer-row" text="Home"></textblock>
        <textblock class="docs-hub-drawer-row" text="Search"></textblock>
        <textblock class="docs-hub-drawer-row docs-hub-drawer-row-active" text="Profile"></textblock>
      </verticalbox>
    </border>
  </horizontalbox>
</border>`,
  "side-bar": `<horizontalbox gap="0" width="120" height="56">
  <border kind="well" padding="4" width="36" height="56">
    <verticalbox gap="3" padding="4">
      <border kind="chip" height="6"></border>
      <border kind="chip" height="6"></border>
      <border kind="chip" height="6"></border>
    </verticalbox>
  </border>
  <border kind="panel" fill padding="6">
    <slate-text kind="hint" text="…"></slate-text>
  </border>
</horizontalbox>`,
  breadcrumb: `<slate-breadcrumb items="Home, Docs, Button"></slate-breadcrumb>`,
  pagination: `<slate-pagination count="5" page="2"></slate-pagination>`,
  menu: `<slate-menu options="cut|Cut|scissors, copy|Copy|copy">
  <border kind="well" padding="10" width="100">
    <slate-text kind="hint" text="Right-click"></slate-text>
  </border>
</slate-menu>`,
  platform: `<slate-platform>
  <mac><slate-text kind="hint" text="macOS"></slate-text></mac>
  <windows><slate-text kind="hint" text="Windows"></slate-text></windows>
  <linux><slate-text kind="hint" text="Linux"></slate-text></linux>
</slate-platform>`,
  avatar: `<horizontalbox gap="16" valign="center">
  <slate-avatar-group variant="circular" max="3" size="28" spacing="8">
    <slate-avatar src="https://i.pravatar.cc/56?img=3" alt="A"></slate-avatar>
    <slate-avatar src="https://i.pravatar.cc/56?img=4" alt="B"></slate-avatar>
    <slate-avatar text="C"></slate-avatar>
    <slate-avatar text="D"></slate-avatar>
  </slate-avatar-group>
</horizontalbox>`,
  progress: `<horizontalbox gap="10" valign="center" width="120">
  <slate-progress variant="circular" value="65" size="28"></slate-progress>
  <slate-progress value="65" thickness="5"></slate-progress>
</horizontalbox>`,
  "rich-link": `<slate-rich-link
  href="https://example.com"
  title="Example"
  description="Docs domain"
  site="example.com"
  compact
></slate-rich-link>`,
  image: `<slate-image src="https://picsum.photos/seed/hub-img/96/56" width="96" height="56"></slate-image>`,
  "image-list": `<slate-image-list variant="quilted" cols="4" row-height="28" gap="2" width="120">
  <slate-image-list-item src="https://picsum.photos/seed/hub-il1/80/80" cols="2" rows="2"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/hub-il2/40/40"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/hub-il3/40/40"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/hub-il4/80/40" cols="2"></slate-image-list-item>
</slate-image-list>`,
  media: `<border kind="panel" padding="0" width="96" height="56">
  <overlay fill>
    <border kind="well" anchors="fill"></border>
    <slate-icon name="play" size="20" halign="center" valign="center"></slate-icon>
  </overlay>
</border>`,
  "popup-anchor": `<popup-anchor>
  <border kind="chip" padding="8 10">
    <horizontalbox gap="6" valign="center">
      <slate-icon name="panel-top-open" size="18"></slate-icon>
      <textblock text="Menu"></textblock>
    </horizontalbox>
  </border>
</popup-anchor>`,
  shadowbox: `<border kind="panel" padding="0" width="96" height="56">
  <overlay fill>
    <slate-image src="https://picsum.photos/seed/hub-sb/96/56" width="96" height="56" anchors="fill"></slate-image>
    <slate-icon name="expand" size="20" halign="center" valign="center"></slate-icon>
  </overlay>
</border>`,

  // Feedback
  tooltip: `<slate-tooltip text="Save">
  <slate-button text="Hover"></slate-button>
</slate-tooltip>`,
  alert: `<slate-alert kind="success" text="Saved"></slate-alert>`,
  snackbar: `<border kind="panel" class="docs-hub-snack-fake" padding="8 12" width="140">
  <horizontalbox gap="8" valign="center">
    <textblock text="Copied" fill></textblock>
    <textblock text="Undo"></textblock>
  </horizontalbox>
</border>`,
  dialog: `<border class="docs-hub-dialog-fake" fill padding="10 14">
  <border class="docs-hub-dialog-card" fill padding="6 8">
    <verticalbox gap="4" fill>
      <textblock class="docs-hub-dialog-title" text="Delete file?"></textblock>
      <textblock class="docs-hub-dialog-body" text="Can't undo." fill></textblock>
      <horizontalbox gap="4" halign="right" width="100%">
        <border class="docs-hub-dialog-btn" padding="2 6"><textblock text="Cancel"></textblock></border>
        <border class="docs-hub-dialog-btn docs-hub-dialog-btn-accent" padding="2 6"><textblock text="Delete"></textblock></border>
      </horizontalbox>
    </verticalbox>
  </border>
</border>`,
  skeleton: `<verticalbox gap="6" width="120">
  <slate-skeleton height="14"></slate-skeleton>
  <slate-skeleton height="14"></slate-skeleton>
  <slate-skeleton height="28"></slate-skeleton>
</verticalbox>`,
};
