/**
 * Generate Material-style demo pages: stacked examples (preview + code each).
 * Run: node demo/scripts/generate-demo-pages.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../pages");

function exampleBlock({ title, events, mount, code, script, gap }) {
  const mountTag = mount;
  const html = code.trim();
  const js = script ? script.trim() : "";
  const mountGap = gap != null ? gap : 10;
  // Keep JS in a sibling text/plain script so a nested </script> cannot
  // prematurely close data-demo-snippet. demo/main.js merges them for display.
  const scriptBlock = js
    ? `
            <script type="text/plain" data-demo-script>
${js}
            </script>`
    : "";
  const ev = events ? ` data-events="${events}"` : "";
  const eventsPanel = events
    ? `
                <slate-text kind="label" text="Events"></slate-text>
                <scrollbox class="demo-events-scroll" max-height="140">
                  <textblock class="demo-events" kind="mono" data-demo-events text="Interact to see events…"></textblock>
                </scrollbox>`
    : "";
  return `          <wrapbox class="demo-example" width="100%" max-width="100%" gap="14" valign="stretch" data-demo-example${ev}>
            <border kind="panel" class="demo-live" padding="16">
              <verticalbox gap="10" data-demo-stage>
                <slate-text kind="label" text="${title}"></slate-text>
                <scalebox class="demo-live-scale" stretch="down-x" width="100%">
                  <${mountTag} gap="${mountGap}" valign="center" data-demo-mount>
${html.split("\n").map((l) => `                    ${l}`).join("\n")}
                  </${mountTag}>
                </scalebox>
              </verticalbox>
            </border>
            <border kind="well" class="demo-meta" padding="12">
              <verticalbox gap="10" fill>
                <scrollbox class="demo-code-box" max-height="220" padding="10 12">
                  <pre><code class="language-umc" data-demo-code></code></pre>
                </scrollbox>${eventsPanel}
              </verticalbox>
            </border>
            <script type="text/plain" data-demo-snippet>
${html}
            </script>${scriptBlock}
          </wrapbox>`;
}

function page({ title, hint, events = "", mount = "verticalbox", label, variants }) {
  const blocks = variants
    .map((v) =>
      exampleBlock({
        title: v.name,
        events,
        mount: v.mount || mount,
        gap: v.gap,
        code: v.code,
        script: v.script,
      })
    )
    .join("\n\n");

  return `        <verticalbox gap="8">
          <slate-text kind="section" text="${title}"></slate-text>
          <slate-text kind="hint" text="${hint}"></slate-text>
        </verticalbox>

        <verticalbox gap="22" data-demo-examples>
${blocks}
        </verticalbox>
`;
}

const pages = {
  // --- Inputs ---
  "button.html": page({
    title: "Button",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "clicked,pressed,released",
    mount: "horizontalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-button text="Button"></slate-button>
<slate-button text="Disabled" disabled></slate-button>`,
      },
      {
        name: "Row",
        code: `<slate-button text="Save"></slate-button>
<slate-button text="Cancel"></slate-button>
<slate-button text="…" disabled></slate-button>`,
      },
      {
        name: "Disabled",
        code: `<slate-button text="Can't click" disabled></slate-button>`,
      },
    ],
  }),

  "toggle-button.html": page({
    title: "Toggle Button",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "changed,clicked",
    mount: "horizontalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-toggle-button text="Bold" pressed></slate-toggle-button>
<slate-toggle-button text="Italic"></slate-toggle-button>`,
      },
      {
        name: "Exclusive look",
        code: `<slate-toggle-button text="Left" pressed></slate-toggle-button>
<slate-toggle-button text="Center"></slate-toggle-button>
<slate-toggle-button text="Right"></slate-toggle-button>`,
      },
      {
        name: "Disabled",
        code: `<slate-toggle-button text="On" pressed disabled></slate-toggle-button>
<slate-toggle-button text="Off" disabled></slate-toggle-button>`,
      },
    ],
  }),

  "button-group.html": page({
    title: "Button Group",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "clicked,changed",
    mount: "verticalbox",
    variants: [
      {
        name: "Buttons",
        code: `<slate-button-group>
  <slate-button text="Left"></slate-button>
  <slate-button text="Center"></slate-button>
  <slate-button text="Right"></slate-button>
</slate-button-group>`,
      },
      {
        name: "Toggles",
        code: `<slate-button-group>
  <slate-toggle-button text="Day" pressed></slate-toggle-button>
  <slate-toggle-button text="Week"></slate-toggle-button>
  <slate-toggle-button text="Month"></slate-toggle-button>
</slate-button-group>`,
      },
      {
        name: "Mixed",
        code: `<slate-button-group>
  <slate-button text="Cut"></slate-button>
  <slate-button text="Copy"></slate-button>
  <slate-button text="Paste" disabled></slate-button>
</slate-button-group>`,
      },
    ],
  }),

  "checkbox.html": page({
    title: "Checkbox",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "changed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-checkbox label="Remember me" checked></slate-checkbox>
<slate-checkbox label="Email updates"></slate-checkbox>`,
      },
      {
        name: "Disabled",
        code: `<slate-checkbox label="Required (on)" checked disabled></slate-checkbox>
<slate-checkbox label="Required (off)" disabled></slate-checkbox>`,
      },
      {
        name: "List",
        code: `<slate-checkbox label="Wi‑Fi" checked></slate-checkbox>
<slate-checkbox label="Bluetooth" checked></slate-checkbox>
<slate-checkbox label="Airplane mode"></slate-checkbox>`,
      },
    ],
  }),

  "switch.html": page({
    title: "Switch",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "changed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-switch label="Notifications" checked></slate-switch>
<slate-switch label="Dark mode"></slate-switch>`,
      },
      {
        name: "Disabled",
        code: `<slate-switch label="Forced on" checked disabled></slate-switch>
<slate-switch label="Forced off" disabled></slate-switch>`,
      },
      {
        name: "Settings",
        code: `<slate-switch label="Auto-update" checked></slate-switch>
<slate-switch label="Beta channel"></slate-switch>
<slate-switch label="Telemetry" checked></slate-switch>`,
      },
    ],
  }),

  "radio-group.html": page({
    title: "Radio Group",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "selectionchanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-radio-group
  label="Priority"
  options="low, med, high"
  selected="med"
></slate-radio-group>`,
      },
      {
        name: "Labeled values",
        code: `<slate-radio-group
  label="Plan"
  options="free|Free, pro|Pro, team|Team"
  selected="pro"
></slate-radio-group>`,
      },
      {
        name: "Disabled",
        code: `<slate-radio-group
  label="Locked"
  options="a, b, c"
  selected="b"
  disabled
></slate-radio-group>`,
      },
    ],
  }),

  "rating.html": page({
    title: "Rating",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "changed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-rating value="3"></slate-rating>`,
      },
      {
        name: "Max 10",
        code: `<slate-rating value="7" max="10"></slate-rating>`,
      },
      {
        name: "Disabled",
        code: `<slate-rating value="4" disabled></slate-rating>`,
      },
    ],
  }),

  "slider.html": page({
    title: "Slider",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "changed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-slider label="Volume" value="40"></slate-slider>`,
      },
      {
        name: "Range",
        code: `<slate-slider label="Zoom" value="1.5" min="0.5" max="3" step="0.1"></slate-slider>`,
      },
      {
        name: "Disabled",
        code: `<slate-slider label="Locked" value="60" disabled></slate-slider>`,
      },
    ],
  }),

  "select.html": page({
    title: "Select",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "selectionchanged,opened,closed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-select
  options="general, random, dev-log"
  selected="random"
></slate-select>`,
      },
      {
        name: "Rich",
        code: `<slate-select
  selected="text"
  options="# Channels, text|Text|hash, voice|Voice|volume-2, ---, matrix.org|Matrix|https://matrix.org/favicon.ico"
></slate-select>`,
      },
      {
        name: "Placeholder",
        code: `<slate-select
  options="red, green, blue"
  placeholder="Pick a color…"
></slate-select>`,
      },
      {
        name: "Disabled",
        code: `<slate-select
  options="a, b, c"
  selected="b"
  disabled
></slate-select>`,
      },
    ],
  }),

  "autocomplete.html": page({
    title: "Autocomplete",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "selectionchanged,valuechanged,opened,closed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-autocomplete
  options="apple, apricot, banana, blueberry, cherry"
  value=""
></slate-autocomplete>`,
      },
      {
        name: "Fuzzy",
        code: `<slate-autocomplete
  match="fuzzy"
  options="New York, Los Angeles, Chicago, Houston, Phoenix"
></slate-autocomplete>`,
      },
      {
        name: "Disabled",
        code: `<slate-autocomplete
  options="one, two, three"
  value="two"
  disabled
></slate-autocomplete>`,
      },
    ],
  }),

  "tabs.html": page({
    title: "Tabs",
    hint: "Extends widgetswitcher (@parent). Children are normal pages (page=\"…\", optional label).",
    events: "selectionchanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-tabs active="email" height="140">
  <border page="basic" label="Basic" kind="panel" padding="12">
    <slate-text kind="body" text="Profile basics."></slate-text>
  </border>
  <border page="email" label="Email" kind="panel" padding="12">
    <slate-text-field label="Email" type="email" value="hi@example.com"></slate-text-field>
  </border>
  <border page="bio" label="Bio" kind="panel" padding="12">
    <slate-text kind="body" text="Optional biography panel."></slate-text>
  </border>
</slate-tabs>`,
      },
      {
        name: "Tabs attr",
        code: `<slate-tabs tabs="day|Day, week|Week, month|Month" active="week" height="120">
  <border page="day" kind="panel" padding="12">
    <slate-text text="Day view"></slate-text>
  </border>
  <border page="week" kind="panel" padding="12">
    <slate-text text="Week view"></slate-text>
  </border>
  <border page="month" kind="panel" padding="12">
    <slate-text text="Month view"></slate-text>
  </border>
</slate-tabs>`,
      },
    ],
  }),

  "transfer-list.html": page({
    title: "Transfer List",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "changed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-transfer-list
  choices="react, vue, svelte, solid"
  chosen="lit"
></slate-transfer-list>`,
      },
      {
        name: "Labeled",
        code: `<slate-transfer-list
  choices-label="Available"
  chosen-label="Selected"
  choices="alpha|Alpha, beta|Beta, gamma|Gamma"
  chosen="delta|Delta"
></slate-transfer-list>`,
      },
      {
        name: "Disabled",
        code: `<slate-transfer-list
  choices="a, b"
  chosen="c"
  disabled
></slate-transfer-list>`,
      },
    ],
  }),

  // --- Input (menus / combos) ---
  "dropdown.html": page({
    title: "Dropdown",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "selectionchanged,opened,closed",
    mount: "horizontalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-dropdown
  options="online, idle, dnd"
  selected="online"
></slate-dropdown>`,
      },
      {
        name: "Rich",
        code: `<slate-dropdown
  selected="text"
  options="# Channels, text|Text|hash, voice|Voice|volume-2, ---, matrix.org|Matrix|https://matrix.org/favicon.ico"
></slate-dropdown>`,
      },
      {
        name: "Disabled",
        code: `<slate-dropdown
  options="online, idle, dnd"
  selected="online"
  disabled
></slate-dropdown>`,
      },
    ],
  }),

  "combobox.html": page({
    title: "Combobox",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "selectionchanged,valuechanged,opened,closed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-combobox
  options="general, random, help"
  value=""
></slate-combobox>`,
      },
      {
        name: "Recent",
        code: `<slate-combobox
  recent="general, random"
  options="help, off-topic, mods"
  value="general"
></slate-combobox>`,
      },
      {
        name: "Disabled",
        code: `<slate-combobox
  options="a, b, c"
  value="b"
  disabled
></slate-combobox>`,
      },
    ],
  }),

  // --- Display ---
  "chip.html": page({
    title: "Chip",
    hint: "Compact labels. Optional icon, selected, deletable, clickable.",
    events: "clicked,deleted",
    mount: "horizontalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-chip text="Default"></slate-chip>
<slate-chip text="Soft" kind="soft"></slate-chip>
<slate-chip text="Outlined" kind="outlined"></slate-chip>
<slate-chip text="Selected" selected></slate-chip>`,
      },
      {
        name: "Icon",
        code: `<slate-chip text="Docs" icon="book"></slate-chip>
<slate-chip text="Search" icon="search" kind="outlined"></slate-chip>
<slate-chip text="Starred" icon="star" selected></slate-chip>`,
      },
      {
        name: "Clickable",
        code: `<slate-chip text="Filter" icon="list-filter" clickable></slate-chip>
<slate-chip text="Tag" clickable kind="soft"></slate-chip>`,
      },
      {
        name: "Deletable",
        code: `<slate-chip text="Draft" deletable></slate-chip>
<slate-chip text="Review" icon="eye" deletable></slate-chip>`,
      },
      {
        name: "Disabled",
        code: `<slate-chip text="Locked" disabled></slate-chip>
<slate-chip text="Locked" icon="lock" deletable disabled></slate-chip>`,
      },
    ],
  }),

  "badge.html": page({
    title: "Badge",
    hint: "Count or dot mark over an icon / control. Use max for 99+ style caps.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Count",
        code: `<slate-badge text="3">
  <slate-icon name="bell" size="20"></slate-icon>
</slate-badge>
<slate-badge text="12">
  <slate-icon name="mail" size="20"></slate-icon>
</slate-badge>`,
      },
      {
        name: "Max",
        code: `<slate-badge text="120" max="99">
  <slate-button text="Inbox"></slate-button>
</slate-badge>
<slate-badge text="8" max="9" kind="warn">
  <slate-icon name="message-square" size="20"></slate-icon>
</slate-badge>`,
      },
      {
        name: "Dot",
        code: `<slate-badge dot>
  <slate-icon name="mail" size="20"></slate-icon>
</slate-badge>
<slate-badge dot kind="warn">
  <slate-button text="Status"></slate-button>
</slate-badge>`,
      },
      {
        name: "Kinds",
        code: `<slate-badge text="2">
  <slate-icon name="bell" size="20"></slate-icon>
</slate-badge>
<slate-badge text="2" kind="muted">
  <slate-icon name="bell" size="20"></slate-icon>
</slate-badge>
<slate-badge text="2" kind="warn">
  <slate-icon name="bell" size="20"></slate-icon>
</slate-badge>`,
      },
      {
        name: "Invisible",
        code: `<slate-badge text="3" invisible>
  <slate-icon name="bell" size="20"></slate-icon>
</slate-badge>`,
      },
    ],
  }),

  "divider.html": page({
    title: "Divider",
    hint: "Hairline rule. Use orientation=\"vertical\" in a row. kind: strong, muted.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Horizontal",
        code: `<slate-text kind="body" text="Above"></slate-text>
<slate-divider></slate-divider>
<slate-text kind="body" text="Below"></slate-text>`,
      },
      {
        name: "Vertical",
        code: `<horizontalbox gap="10" valign="center">
  <slate-text kind="body" text="Left"></slate-text>
  <slate-divider orientation="vertical"></slate-divider>
  <slate-text kind="body" text="Right"></slate-text>
</horizontalbox>`,
      },
      {
        name: "Kinds",
        code: `<slate-divider></slate-divider>
<slate-divider kind="strong"></slate-divider>
<slate-divider kind="muted"></slate-divider>`,
      },
    ],
  }),

  "list.html": page({
    title: "List",
    hint: "List view. options: value|Label|icon|secondary. --- separator, # Category. Events: selectionchanged, activated (Enter).",
    events: "selectionchanged,activated",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-list
  options="inbox|Inbox|inbox, starred|Starred|star, sent|Sent|send"
  selected="inbox"
  width="280"
></slate-list>`,
      },
      {
        name: "Sections",
        code: `<slate-list
  options="# Mail, inbox|Inbox|inbox|3 new, starred|Starred|star, ---, # People, ada|Ada|user|Admin, linus|Linus|user|Dev"
  selected="ada"
  width="280"
></slate-list>`,
      },
      {
        name: "Dense + plain",
        code: `<slate-list
  kind="plain"
  dense
  options="one|One, two|Two, three|Three"
  selected="two"
  width="240"
></slate-list>`,
      },
      {
        name: "List items",
        code: `<slate-list selected="docs" width="280">
  <slate-list-item value="docs" text="Documentation" icon="book" selected></slate-list-item>
  <slate-list-item value="api" text="API reference" secondary="slatehtml/umc" icon="code"></slate-list-item>
  <slate-list-item value="gallery" text="Gallery" meta="Live" icon="layout-grid"></slate-list-item>
</slate-list>`,
      },
    ],
  }),

  "table.html": page({
    title: "Table",
    hint: "slate-row + slate-column; header kind inherits. Set width on header columns to size the column (copied to body). Shorthand: columns=\"Name|140, Email, Role|72\".",
    events: "selectionchanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Rows + columns",
        code: `<slate-table selectable selected="ada" width="100%">
  <slate-row kind="header">
    <slate-column text="Name"></slate-column>
    <slate-column text="Email"></slate-column>
    <slate-column text="Role"></slate-column>
  </slate-row>
  <slate-row value="ada">
    <slate-column text="Ada"></slate-column>
    <slate-column text="ada@x.dev"></slate-column>
    <slate-column text="Admin"></slate-column>
  </slate-row>
  <slate-row value="linus">
    <slate-column text="Linus"></slate-column>
    <slate-column text="linus@x.dev"></slate-column>
    <slate-column text="Dev"></slate-column>
  </slate-row>
  <slate-row value="grace">
    <slate-column text="Grace"></slate-column>
    <slate-column text="grace@x.dev"></slate-column>
    <slate-column text="Ops"></slate-column>
  </slate-row>
</slate-table>`,
      },
      {
        name: "Column widths",
        code: `<slate-table selectable selected="ada" width="100%">
  <slate-row kind="header">
    <slate-column text="Name" width="120"></slate-column>
    <slate-column text="Email"></slate-column>
    <slate-column text="Role" width="72"></slate-column>
  </slate-row>
  <slate-row value="ada">
    <slate-column text="Ada"></slate-column>
    <slate-column text="ada@x.dev"></slate-column>
    <slate-column text="Admin"></slate-column>
  </slate-row>
  <slate-row value="linus">
    <slate-column text="Linus"></slate-column>
    <slate-column text="linus@x.dev"></slate-column>
    <slate-column text="Dev"></slate-column>
  </slate-row>
</slate-table>`,
      },
      {
        name: "Shorthand attrs",
        code: `<slate-table
  columns="Name|120, Role|72, Status"
  rows="ada|Ada|Admin|Active, linus|Linus|Dev|Away, grace|Grace|Ops|Active"
  selectable
  selected="ada"
  width="100%"
></slate-table>`,
      },
      {
        name: "Striped + dense",
        code: `<slate-table
  columns="File, Size|64, Modified|88"
  rows="readme.md|4 KB|Today, umc.md|18 KB|Yesterday, layout.md|12 KB|Mon"
  striped
  dense
  width="100%"
></slate-table>`,
      },
    ],
  }),

  "tooltip.html": page({
    title: "Tooltip",
    hint: "Hover or focus. placement: top, bottom, left, right. offset 0–100 maps to 15%–85% on the near edge — moves the tail and shifts the bubble so the tip stays on the control. tail=\"off\" hides the caret.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-tooltip text="Save changes">
  <slate-button text="Save"></slate-button>
</slate-tooltip>`,
      },
      {
        name: "Placements",
        code: `<slate-tooltip text="Top" placement="top">
  <slate-button text="Top"></slate-button>
</slate-tooltip>
<slate-tooltip text="Bottom" placement="bottom">
  <slate-button text="Bottom"></slate-button>
</slate-tooltip>
<slate-tooltip text="Left" placement="left">
  <slate-button text="Left"></slate-button>
</slate-tooltip>
<slate-tooltip text="Right" placement="right">
  <slate-button text="Right"></slate-button>
</slate-tooltip>`,
      },
      {
        name: "Tail offset",
        code: `<slate-tooltip text="Tail at start" offset="0">
  <slate-button text="0"></slate-button>
</slate-tooltip>
<slate-tooltip text="Centered" offset="50">
  <slate-button text="50"></slate-button>
</slate-tooltip>
<slate-tooltip text="Tail at end" offset="100">
  <slate-button text="100"></slate-button>
</slate-tooltip>
<slate-tooltip text="No caret" tail="off">
  <slate-button text="No tail"></slate-button>
</slate-tooltip>`,
      },
      {
        name: "On icon",
        code: `<slate-tooltip text="Notifications">
  <slate-icon name="bell" size="18"></slate-icon>
</slate-tooltip>`,
      },
    ],
  }),

  "alert.html": page({
    title: "Alert",
    hint: "Inline feedback. kind: success, warn, error. Optional title + closable.",
    events: "closed",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-alert text="Something needs your attention."></slate-alert>`,
      },
      {
        name: "Kinds",
        code: `<slate-alert kind="success" text="Profile updated."></slate-alert>
<slate-alert kind="warn" text="Disk space is low."></slate-alert>
<slate-alert kind="error" text="Could not reach the server."></slate-alert>`,
      },
      {
        name: "Title + closable",
        code: `<slate-alert
  kind="warn"
  title="Slow network"
  text="Uploads may take longer than usual."
  closable
></slate-alert>`,
      },
    ],
  }),

  "snackbar.html": page({
    title: "Snackbar",
    hint: "Declarative: snackbar=\"id\". Or Construct(el, { self, on, bump, e }) with ref=\"toast\" → on(self.show, e.clicked, () => bump(self.toast)). Timed toasts show a countdown bar.",
    events: "closed,action",
    mount: "horizontalbox",
    variants: [
      {
        name: "Show",
        code: `<slate-button snackbar="demo-snack" text="Show toast"></slate-button>
<slate-snackbar id="demo-snack" text="Copied to clipboard"></slate-snackbar>`,
      },
      {
        name: "Timed",
        code: `<slate-button ref="show" text="Show 6s toast"></slate-button>
<slate-snackbar ref="toast" text="This fades out with a countdown bar" duration="6000"></slate-snackbar>`,
        script: `on(self.show, e.clicked, () => bump(self.toast));`,
      },
      {
        name: "With action",
        code: `<slate-button ref="archive" text="Archive"></slate-button>
<slate-snackbar ref="toast" text="Message archived" action="Undo" duration="5000"></slate-snackbar>`,
        script: `on(self.archive, e.clicked, () => bump(self.toast));`,
      },
      {
        name: "Stack",
        code: `<slate-button ref="showA" text="Toast A"></slate-button>
<slate-button ref="showB" text="Toast B"></slate-button>
<slate-button ref="showC" text="Toast C"></slate-button>
<slate-snackbar ref="toastA" text="First notification" duration="0"></slate-snackbar>
<slate-snackbar ref="toastB" text="Second notification" action="Undo" duration="0"></slate-snackbar>
<slate-snackbar ref="toastC" text="Third notification" duration="0"></slate-snackbar>`,
        script: `on(self.showA, e.clicked, () => bump(self.toastA));
on(self.showB, e.clicked, () => bump(self.toastB));
on(self.showC, e.clicked, () => bump(self.toastC));`,
      },
    ],
  }),

  "dialog.html": page({
    title: "Dialog",
    hint: "Declarative: dialog=\"id\". Or Construct(el, { self, on, bump, e }) with ref + bump(self.dlg). Footer buttons use dialog-action=\"cancel\"|\"confirm\" → cancelled / confirmed (+ closed).",
    events: "opened,closed,confirmed,cancelled",
    mount: "horizontalbox",
    variants: [
      {
        name: "Open",
        code: `<slate-button dialog="demo-dialog" text="Open dialog"></slate-button>
<slate-dialog
  id="demo-dialog"
  title="Delete file?"
  text="This cannot be undone."
>
  <slate-button text="Cancel" dialog-action="cancel"></slate-button>
  <slate-button text="Delete" dialog-action="confirm"></slate-button>
</slate-dialog>`,
      },
      {
        name: "From script",
        code: `<slate-button ref="show" text="Open dialog"></slate-button>
<slate-dialog
  ref="dlg"
  title="Delete file?"
  text="This cannot be undone."
>
  <slate-button text="Cancel" dialog-action="cancel"></slate-button>
  <slate-button text="Delete" dialog-action="confirm"></slate-button>
</slate-dialog>`,
        script: `on(self.show, e.clicked, () => bump(self.dlg));
on(self.dlg, e.confirmed, () => console.log("confirmed"));
on(self.dlg, e.cancelled, () => console.log("cancelled"));`,
      },
      {
        name: "Trigger settings",
        code: `<slate-button
  dialog="demo-dialog-2"
  dialog-title="Leave page?"
  dialog-text="Unsaved changes will be lost."
  text="Navigate away"
></slate-button>
<slate-dialog id="demo-dialog-2" title="Leave page?" text="Unsaved changes will be lost.">
  <slate-button text="Stay" dialog-action="cancel"></slate-button>
  <slate-button text="Leave" dialog-action="confirm"></slate-button>
</slate-dialog>`,
      },
    ],
  }),

  "skeleton.html": page({
    title: "Skeleton",
    hint: "Loading placeholders. kind: circle, button. Optional width / height.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Lines",
        code: `<slate-skeleton></slate-skeleton>
<slate-skeleton width="80%"></slate-skeleton>
<slate-skeleton width="55%"></slate-skeleton>`,
      },
      {
        name: "Avatar row",
        code: `<horizontalbox gap="10" valign="center" width="100%">
  <slate-skeleton kind="circle"></slate-skeleton>
  <verticalbox gap="6" fill>
    <slate-skeleton></slate-skeleton>
    <slate-skeleton width="70%"></slate-skeleton>
  </verticalbox>
</horizontalbox>`,
      },
      {
        name: "Block + button",
        code: `<slate-skeleton height="72"></slate-skeleton>
<slate-skeleton kind="button"></slate-skeleton>`,
      },
    ],
  }),

  "icon.html": page({
    title: "Icon",
    hint: "Lucide by default. Prefix fas:/far:/fab: for Font Awesome (docs compose both).",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Lucide",
        code: `<slate-icon name="search" size="18"></slate-icon>
<slate-icon name="settings" size="18"></slate-icon>
<slate-icon name="bell" size="18"></slate-icon>`,
      },
      {
        name: "Lucide · Sizes",
        code: `<slate-icon name="star" size="14"></slate-icon>
<slate-icon name="star" size="20"></slate-icon>
<slate-icon name="star" size="28"></slate-icon>`,
      },
      {
        name: "Lucide · Stroke",
        code: `<slate-icon name="heart" size="22" stroke-width="1"></slate-icon>
<slate-icon name="heart" size="22" stroke-width="2"></slate-icon>
<slate-icon name="heart" size="22" stroke-width="2.5"></slate-icon>`,
      },
      {
        name: "Font Awesome · Solid",
        code: `<slate-icon name="fas:magnifying-glass" size="18"></slate-icon>
<slate-icon name="fas:gear" size="18"></slate-icon>
<slate-icon name="fas:bell" size="18"></slate-icon>`,
      },
      {
        name: "Font Awesome · Regular",
        code: `<slate-icon name="far:user" size="18"></slate-icon>
<slate-icon name="far:heart" size="18"></slate-icon>
<slate-icon name="far:star" size="18"></slate-icon>`,
      },
      {
        name: "Font Awesome · Brands",
        code: `<slate-icon name="fab:github" size="18"></slate-icon>
<slate-icon name="fab:discord" size="18"></slate-icon>
<slate-icon name="fab:apple" size="18"></slate-icon>`,
      },
    ],
  }),

  "accordion.html": page({
    title: "Accordion",
    hint: "slate-accordion + slate-accordion-item. open selects panel(s); multiple allows several open. Events: selectionchanged.",
    events: "selectionchanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-accordion open="general" width="100%">
  <slate-accordion-item name="general" title="General">
    <slate-text kind="body" text="Profile name and language."></slate-text>
  </slate-accordion-item>
  <slate-accordion-item name="notifications" title="Notifications">
    <slate-text kind="body" text="Email and push preferences."></slate-text>
  </slate-accordion-item>
  <slate-accordion-item name="security" title="Security">
    <slate-text kind="body" text="Password and active sessions."></slate-text>
  </slate-accordion-item>
</slate-accordion>`,
      },
      {
        name: "Multiple",
        code: `<slate-accordion multiple open="a,b" width="100%">
  <slate-accordion-item name="a" title="Shipping">
    <slate-text kind="body" text="Address book."></slate-text>
  </slate-accordion-item>
  <slate-accordion-item name="b" title="Billing">
    <slate-text kind="body" text="Cards on file."></slate-text>
  </slate-accordion-item>
  <slate-accordion-item name="c" title="Tax">
    <slate-text kind="body" text="VAT ID."></slate-text>
  </slate-accordion-item>
</slate-accordion>`,
      },
      {
        name: "Plain",
        code: `<slate-accordion kind="plain" open="faq1" width="100%">
  <slate-accordion-item name="faq1" title="What is SlateHTML?">
    <slate-text kind="body" text="UMG-style panels in the browser."></slate-text>
  </slate-accordion-item>
  <slate-accordion-item name="faq2" title="What is UMC?">
    <slate-text kind="body" text="HTML + style + script widgets."></slate-text>
  </slate-accordion-item>
</slate-accordion>`,
      },
    ],
  }),

  "app-bar.html": page({
    title: "App Bar",
    hint: "Top bar with title / subtitle. Leading via slot-leading; bare children go trailing. kind: elevated, transparent. dense.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-app-bar title="Inbox" width="100%">
  <slot-leading>
    <slate-icon name="menu" size="20"></slate-icon>
  </slot-leading>
  <slate-icon name="search" size="18"></slate-icon>
  <slate-icon name="bell" size="18"></slate-icon>
</slate-app-bar>`,
      },
      {
        name: "Subtitle + elevated",
        code: `<slate-app-bar
  title="Messages"
  subtitle="Design system"
  kind="elevated"
  width="100%"
>
  <slot-leading>
    <slate-icon name="arrow-left" size="20"></slate-icon>
  </slot-leading>
  <slate-button text="Compose"></slate-button>
</slate-app-bar>`,
      },
      {
        name: "Dense transparent",
        code: `<border kind="well" padding="0" width="100%">
  <slate-app-bar title="Gallery" kind="transparent" dense width="100%">
    <slot-leading>
      <slate-icon name="menu" size="18"></slate-icon>
    </slot-leading>
    <slate-icon name="more-vertical" size="16"></slate-icon>
  </slate-app-bar>
</border>`,
      },
    ],
  }),

  "title-bar.html": page({
    title: "Title Bar",
    hint: "Compact window/document chrome — title + optional status. Leading via slot-leading; bare children go trailing. Distinct from App Bar (page header). kind: elevated, transparent. dense.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-title-bar title="SlateHTML" status="Online" width="100%">
  <slot-leading>
    <slate-icon name="app-window" size="16"></slate-icon>
  </slot-leading>
</slate-title-bar>`,
      },
      {
        name: "Window controls",
        code: `<slate-title-bar title="Document.umc" status="Saved" kind="elevated" width="100%">
  <slot-leading>
    <slate-icon name="file-code" size="16"></slate-icon>
  </slot-leading>
  <slate-icon name="minus" size="14"></slate-icon>
  <slate-icon name="square" size="12"></slate-icon>
  <slate-icon name="x" size="14"></slate-icon>
</slate-title-bar>`,
      },
      {
        name: "Dense",
        code: `<slate-title-bar title="Preview" dense width="100%"></slate-title-bar>`,
      },
    ],
  }),

  "footer.html": page({
    title: "Footer",
    hint: "Page/shell footer with text + optional meta. Leading via slot-leading; bare children go trailing. kind: elevated, transparent. dense.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-footer text="© 2026 SlateHTML" width="100%">
  <slate-button text="Docs"></slate-button>
  <slate-button text="GitHub"></slate-button>
</slate-footer>`,
      },
      {
        name: "Meta + elevated",
        code: `<slate-footer
  text="Built with UMC"
  meta="MIT License"
  kind="elevated"
  width="100%"
>
  <slot-leading>
    <slate-icon name="heart" size="14"></slate-icon>
  </slot-leading>
  <slate-text kind="hint" text="v1.0"></slate-text>
</slate-footer>`,
      },
      {
        name: "Dense transparent",
        code: `<border kind="well" padding="0" width="100%">
  <slate-footer text="Footer" kind="transparent" dense width="100%"></slate-footer>
</border>`,
      },
    ],
  }),

  "bottom-nav.html": page({
    title: "Bottom Nav",
    hint: "Destination bar via slate-bottom-nav-item children. Optional options shorthand: value|Label|icon|badge. kind: elevated / transparent. labels=hide. Events: selectionchanged.",
    events: "selectionchanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-bottom-nav selected="home" width="100%">
  <slate-bottom-nav-item value="home" text="Home" icon="house" selected></slate-bottom-nav-item>
  <slate-bottom-nav-item value="search" text="Search" icon="search"></slate-bottom-nav-item>
  <slate-bottom-nav-item value="alerts" text="Alerts" icon="bell" badge="2"></slate-bottom-nav-item>
  <slate-bottom-nav-item value="me" text="Profile" icon="user"></slate-bottom-nav-item>
</slate-bottom-nav>`,
      },
      {
        name: "Elevated",
        code: `<border kind="well" padding="0" width="100%" height="180">
  <overlay fill>
    <scrollbox anchors="fill" top="0" left="0" right="0" bottom="0" padding="12 12 64">
      <verticalbox gap="8">
        <slate-text kind="label" text="Inbox"></slate-text>
        <slate-text text="Elevated floats the bar over scrolling content — shadow instead of a top rule."></slate-text>
        <slate-text text="Line two."></slate-text>
        <slate-text text="Line three."></slate-text>
        <slate-text text="Line four."></slate-text>
        <slate-text text="Line five."></slate-text>
      </verticalbox>
    </scrollbox>
    <slate-bottom-nav selected="search" kind="elevated" anchors="bottom" left="0" right="0" bottom="0">
      <slate-bottom-nav-item value="home" text="Home" icon="house"></slate-bottom-nav-item>
      <slate-bottom-nav-item value="search" text="Search" icon="search" selected></slate-bottom-nav-item>
      <slate-bottom-nav-item value="me" text="Profile" icon="user"></slate-bottom-nav-item>
    </slate-bottom-nav>
  </overlay>
</border>`,
      },
      {
        name: "Icons only",
        code: `<slate-bottom-nav selected="me" labels="hide" width="100%">
  <slate-bottom-nav-item value="home" text="Home" icon="house"></slate-bottom-nav-item>
  <slate-bottom-nav-item value="search" text="Search" icon="search"></slate-bottom-nav-item>
  <slate-bottom-nav-item value="me" text="Profile" icon="user" selected></slate-bottom-nav-item>
</slate-bottom-nav>`,
      },
      {
        name: "Options string",
        code: `<slate-bottom-nav
  options="home|Home|house, search|Search|search, alerts|Alerts|bell|2, me|Profile|user"
  selected="home"
  width="100%"
></slate-bottom-nav>`,
      },
    ],
  }),

  "drawer.html": page({
    title: "Drawer",
    hint: "Pinned to left / right / top / bottom of the screen. Nested stack opens a sub-drawer toward the center. Declarative: drawer=\"id\". Events: opened, closed.",
    events: "opened,closed",
    mount: "horizontalbox",
    variants: [
      {
        name: "Open",
        code: `<slate-button drawer="demo-drawer" text="Open drawer"></slate-button>
<slate-drawer id="demo-drawer" title="Menu" placement="left" width="300">
  <verticalbox gap="10">
    <slate-list
      kind="plain"
      options="home|Home|house, search|Search|search, settings|Settings|settings"
      selected="home"
    ></slate-list>
    <slate-button drawer="demo-drawer-sub" text="Open details"></slate-button>
  </verticalbox>
  <slate-drawer id="demo-drawer-sub" title="Details" stack width="280">
    <slate-text text="Stacked toward the center — close to return to the menu."></slate-text>
  </slate-drawer>
</slate-drawer>`,
      },
      {
        name: "Placements",
        code: `<wrapbox gap="8">
  <slate-button drawer="demo-drawer-edge" drawer-placement="left" text="Left"></slate-button>
  <slate-button drawer="demo-drawer-edge" drawer-placement="right" text="Right"></slate-button>
  <slate-button drawer="demo-drawer-edge" drawer-placement="top" text="Top"></slate-button>
  <slate-button drawer="demo-drawer-edge" drawer-placement="bottom" text="Bottom"></slate-button>
</wrapbox>
<slate-drawer id="demo-drawer-edge" title="Drawer" placement="left" width="280" height="200">
  <slate-text text="Same drawer — edge comes from the trigger."></slate-text>
</slate-drawer>`,
      },
      {
        name: "Replace (default)",
        code: `<horizontalbox gap="8">
  <slate-button drawer="demo-drawer-a" text="Open A"></slate-button>
  <slate-button drawer="demo-drawer-b" text="Open B"></slate-button>
</horizontalbox>
<slate-drawer id="demo-drawer-a" title="Drawer A" placement="left" width="260">
  <slate-text text="Opening B closes this one."></slate-text>
</slate-drawer>
<slate-drawer id="demo-drawer-b" title="Drawer B" placement="right" width="260">
  <slate-text text="Opening A closes this one."></slate-text>
</slate-drawer>`,
      },
      {
        name: "From script",
        code: `<slate-button ref="show" text="Open drawer"></slate-button>
<slate-drawer ref="drawer" title="Menu" width="280">
  <verticalbox gap="8" padding="4 0">
    <slate-text text="Slotted body content."></slate-text>
    <slate-text kind="hint" text="Dismiss with the X, backdrop, or Escape."></slate-text>
  </verticalbox>
</slate-drawer>`,
        script: `on(self.show, e.clicked, () => bump(self.drawer));
on(self.drawer, e.closed, (ev) => console.log("closed", ev.detail));`,
      },
    ],
  }),

  "side-bar.html": page({
    title: "Side Bar",
    hint: "Collapsible rail: permanent on wide viewports, drawer below collapse-at. Toggle with sidebar=\"id\" (same idea as drawer).",
    events: "opened,closed,modechanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Rail",
        code: `<horizontalbox gap="0" width="100%" height="160">
  <slate-side-bar mode="rail" width="140">
    <verticalbox gap="8" padding="10">
      <slate-text kind="label" text="Nav"></slate-text>
      <slate-list
        kind="plain"
        dense
        options="home|Home|house, search|Search|search"
        selected="home"
      ></slate-list>
    </verticalbox>
  </slate-side-bar>
  <border kind="well" fill padding="12">
    <slate-text kind="body" text="Main content"></slate-text>
  </border>
</horizontalbox>`,
      },
      {
        name: "Drawer (force)",
        code: `<slate-button sidebar="demo-sidebar" text="Open side bar"></slate-button>
<slate-side-bar id="demo-sidebar" mode="drawer" width="220">
  <verticalbox gap="8" padding="12" height="100%">
    <slate-text kind="label" text="Menu"></slate-text>
    <slate-list
      kind="plain"
      dense
      options="inbox|Inbox|inbox, starred|Starred|star, settings|Settings|settings"
      selected="inbox"
    ></slate-list>
  </verticalbox>
</slate-side-bar>`,
      },
      {
        name: "Auto (collapse-at)",
        code: `<slate-text kind="hint" text="Resize the window — below 840px the gallery docs rail becomes a drawer (+ menu button)."></slate-text>`,
      },
    ],
  }),

  "breadcrumb.html": page({
    title: "Breadcrumb",
    hint: "Hierarchical trail, Overview › category › page.",
    events: "clicked",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-breadcrumb items="Overview|#/, Input|#/input, Button"></slate-breadcrumb>`,
      },
      {
        name: "Two levels",
        code: `<slate-breadcrumb items="Home|#/, Settings"></slate-breadcrumb>`,
      },
      {
        name: "Separator",
        code: `<slate-breadcrumb
  separator="chevrons-right"
  items="Docs|#/, Panel|#/panel, Box"
></slate-breadcrumb>`,
      },
    ],
  }),

  "pagination.html": page({
    title: "Pagination",
    hint: "Page strip with prev/next. Optional first/last and ellipses for long ranges.",
    events: "pagechanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-pagination count="10" page="3"></slate-pagination>`,
      },
      {
        name: "First / last",
        code: `<slate-pagination count="24" page="12" show-first show-last></slate-pagination>`,
      },
      {
        name: "Compact siblings",
        code: `<slate-pagination
  count="20"
  page="10"
  sibling-count="0"
  boundary-count="1"
></slate-pagination>`,
      },
      {
        name: "Disabled",
        code: `<slate-pagination count="8" page="2" disabled></slate-pagination>`,
      },
      {
        name: "From script",
        code: `<verticalbox gap="10">
  <slate-pagination ref="pager" count="6" page="1"></slate-pagination>
  <slate-text ref="label" kind="hint" text="Page 1 / 6"></slate-text>
</verticalbox>`,
        script: `on(self.pager, e.pagechanged, (ev) => {
  self.label.set({ text: \`Page \${ev.detail.page} / 6\` });
});`,
      },
    ],
  }),

  "menu.html": page({
    title: "Menu",
    hint: "Context menu (right-click) over a target. Shortcuts use mod+… (⌘ on Mac, Ctrl elsewhere).",
    events: "selectionchanged,opened,closed",
    mount: "verticalbox",
    variants: [
      {
        name: "Right-click",
        code: `<slate-menu>
  <border kind="panel" padding="20" width="280" height="100">
    <slate-text kind="body" text="Right-click this panel"></slate-text>
  </border>
  <slate-menu-item value="cut" text="Cut" icon="scissors" shortcut="mod+X"></slate-menu-item>
  <slate-menu-item value="copy" text="Copy" icon="copy" shortcut="mod+C"></slate-menu-item>
  <slate-menu-item value="paste" text="Paste" icon="clipboard" shortcut="mod+V"></slate-menu-item>
  <slate-menu-item separator></slate-menu-item>
  <slate-menu-item value="delete" text="Delete" icon="trash-2" destructive></slate-menu-item>
</slate-menu>`,
      },
      {
        name: "From options",
        code: `<slate-menu
  options="cut|Cut|scissors, copy|Copy|copy, ---, delete|Delete|trash-2"
>
  <border kind="well" padding="16" width="280">
    <slate-text kind="hint" text="Right-click — options= grammar"></slate-text>
  </border>
</slate-menu>`,
      },
      {
        name: "Click trigger",
        code: `<slate-menu trigger="click">
  <slate-button text="Open menu" kind="soft"></slate-button>
  <slate-menu-item value="edit" text="Edit" icon="pencil"></slate-menu-item>
  <slate-menu-item value="share" text="Share" icon="share-2"></slate-menu-item>
  <slate-menu-item separator></slate-menu-item>
  <slate-menu-item value="archive" text="Archive" icon="archive"></slate-menu-item>
</slate-menu>`,
      },
    ],
  }),

  "platform.html": page({
    title: "Platform",
    hint: "Branch markup by OS. Shortcuts: formatShortcut(\"mod+C\") / menu shortcut=\"mod+C\". Override with configure({ platform }) or force=.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Auto (this device)",
        code: `<slate-platform>
  <mac><slate-text kind="body" text="Branch: macOS (⌘ shortcuts)"></slate-text></mac>
  <windows><slate-text kind="body" text="Branch: Windows (Ctrl shortcuts)"></slate-text></windows>
  <linux><slate-text kind="body" text="Branch: Linux (Ctrl shortcuts)"></slate-text></linux>
  <default><slate-text kind="body" text="Branch: default / unknown"></slate-text></default>
</slate-platform>`,
      },
      {
        name: "Force each OS",
        gap: 12,
        code: `<slate-platform force="mac">
  <mac><slate-text kind="hint" text="forced mac → ⌘"></slate-text></mac>
  <windows><slate-text kind="hint" text="windows"></slate-text></windows>
  <linux><slate-text kind="hint" text="linux"></slate-text></linux>
</slate-platform>
<slate-platform force="windows">
  <mac><slate-text kind="hint" text="mac"></slate-text></mac>
  <windows><slate-text kind="hint" text="forced windows → Ctrl"></slate-text></windows>
  <linux><slate-text kind="hint" text="linux"></slate-text></linux>
</slate-platform>
<slate-platform force="linux">
  <mac><slate-text kind="hint" text="mac"></slate-text></mac>
  <windows><slate-text kind="hint" text="windows"></slate-text></windows>
  <linux><slate-text kind="hint" text="forced linux → Ctrl"></slate-text></linux>
</slate-platform>`,
      },
      {
        name: "Shortcut labels",
        code: `<verticalbox gap="8">
  <slate-menu-item text="Copy" icon="copy" shortcut="mod+C"></slate-menu-item>
  <slate-menu-item text="Save as" icon="save" shortcut="mod+shift+S"></slate-menu-item>
  <slate-text kind="hint" text="Same mod+… → ⌘ on Mac, Ctrl+ on Windows/Linux. Shortcuts are global while the item is connected."></slate-text>
</verticalbox>`,
      },
      {
        name: "registerShortcut",
        code: `<slate-button ref="save" text="Save" shortcut="mod+S" kind="soft"></slate-button>
<slate-text ref="hint" kind="hint" text="Press mod+S or click Save"></slate-text>`,
        script: `on(self.save, "click", () => {
  self.hint.setAttribute("text", "mod+S / click at " + new Date().toLocaleTimeString());
});
on(self.save, "shortcut", () => {
  self.hint.setAttribute("text", "shortcut event at " + new Date().toLocaleTimeString());
});
registerShortcut("mod+K", (ev) => {
  ev.preventDefault();
  self.hint.setAttribute("text", "mod+K (imperative) at " + new Date().toLocaleTimeString());
});
`,
      },
    ],
  }),

  "avatar.html": page({
    title: "Avatar",
    hint: "Image or initials (initials hide once the photo loads). Groups stack left→right; variant sets circular / rounded / square.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Image + initials",
        code: `<slate-avatar src="https://i.pravatar.cc/80?img=5" alt="Ada" size="40"></slate-avatar>
<slate-avatar text="Grace Hopper" size="40"></slate-avatar>
<slate-avatar text="Babbage" size="48" variant="rounded"></slate-avatar>
<slate-avatar text="X" size="32" variant="square"></slate-avatar>`,
      },
      {
        name: "Sizes",
        code: `<slate-avatar text="S" size="24"></slate-avatar>
<slate-avatar text="M" size="40"></slate-avatar>
<slate-avatar text="L" size="56"></slate-avatar>`,
      },
      {
        name: "Groups (shapes)",
        mount: "verticalbox",
        gap: 16,
        code: `<slate-avatar-group variant="circular" max="4" size="40" spacing="12">
  <slate-avatar src="https://i.pravatar.cc/80?img=1" alt="A"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=2" alt="B"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=3" alt="C"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=4" alt="D"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=5" alt="E"></slate-avatar>
</slate-avatar-group>
<slate-avatar-group variant="rounded" max="4" size="40" spacing="12">
  <slate-avatar src="https://i.pravatar.cc/80?img=11" alt="F"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=12" alt="G"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=13" alt="H"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=14" alt="I"></slate-avatar>
  <slate-avatar text="J"></slate-avatar>
</slate-avatar-group>
<slate-avatar-group variant="square" max="4" size="40" spacing="12">
  <slate-avatar src="https://i.pravatar.cc/80?img=21" alt="K"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=22" alt="L"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=23" alt="M"></slate-avatar>
  <slate-avatar text="N"></slate-avatar>
  <slate-avatar text="O"></slate-avatar>
</slate-avatar-group>`,
      },
      {
        name: "Group + surplus",
        code: `<slate-avatar-group max="3" size="44" spacing="14">
  <slate-avatar src="https://i.pravatar.cc/80?img=31" alt="A"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=32" alt="B"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=33" alt="C"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=34" alt="D"></slate-avatar>
  <slate-avatar src="https://i.pravatar.cc/80?img=35" alt="E"></slate-avatar>
  <slate-avatar text="F"></slate-avatar>
</slate-avatar-group>`,
      },
    ],
  }),

  "progress.html": page({
    title: "Progress",
    hint: "Linear and circular. Use indeterminate for unknown duration. Leaf progressbar remains for UMG panels.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Linear",
        code: `<slate-progress value="20"></slate-progress>
<slate-progress value="55"></slate-progress>
<slate-progress value="90"></slate-progress>`,
      },
      {
        name: "Circular",
        code: `<horizontalbox gap="14" valign="center">
  <slate-progress variant="circular" value="25" size="40"></slate-progress>
  <slate-progress variant="circular" value="60" size="48"></slate-progress>
  <slate-progress variant="circular" value="90" size="56"></slate-progress>
</horizontalbox>`,
      },
      {
        name: "Indeterminate",
        code: `<slate-progress indeterminate></slate-progress>
<horizontalbox gap="14" valign="center">
  <slate-progress variant="circular" indeterminate size="40"></slate-progress>
  <slate-progress variant="circular" indeterminate size="48"></slate-progress>
</horizontalbox>`,
      },
    ],
  }),

  "rich-link.html": page({
    title: "Rich Link",
    hint: "Unfurl card with title, description, image, and site. Optional globalThis.slateLinkResolve(href) fills metadata when only href is set.",
    events: "clicked",
    mount: "verticalbox",
    variants: [
      {
        name: "Card",
        code: `<slate-rich-link
  href="https://example.com"
  title="Example Domain"
  description="This domain is for use in documentation examples without needing permission. Avoid use in operational systems."
  site="example.com"
></slate-rich-link>`,
      },
      {
        name: "With image",
        code: `<slate-rich-link
  href="https://picsum.photos"
  title="Lorem Picsum"
  description="Easy placeholder images for demos and mockups."
  image="https://picsum.photos/seed/richlink/320/200"
  site="picsum.photos"
></slate-rich-link>`,
      },
      {
        name: "Compact",
        code: `<slate-rich-link
  href="https://example.com/docs"
  title="API docs"
  description="Short unfurl for chat-style layouts."
  site="example.com"
  compact
></slate-rich-link>`,
      },
      {
        name: "Href only",
        code: `<slate-rich-link href="https://example.com/bare"></slate-rich-link>`,
      },
    ],
  }),

  "image.html": page({
    title: "Image",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Cover",
        code: `<slate-image
  src="https://i.pravatar.cc/120?img=5"
  width="96"
  height="96"
  fit="cover"
></slate-image>`,
      },
      {
        name: "Contain",
        code: `<slate-image
  src="https://i.pravatar.cc/120?img=12"
  width="120"
  height="80"
  fit="contain"
></slate-image>`,
      },
      {
        name: "Row",
        code: `<slate-image src="https://i.pravatar.cc/64?img=1" width="48" height="48" fit="cover"></slate-image>
<slate-image src="https://i.pravatar.cc/64?img=2" width="48" height="48" fit="cover"></slate-image>
<slate-image src="https://i.pravatar.cc/64?img=3" width="48" height="48" fit="cover"></slate-image>`,
      },
    ],
  }),

  "image-list.html": page({
    title: "Image List",
    hint: "Grid of images with standard, quilted, woven, and masonry layouts. Quilted items use cols/rows spans.",
    events: "itemactivated",
    mount: "verticalbox",
    variants: [
      {
        name: "Standard",
        code: `<slate-image-list cols="3" row-height="100" gap="6" width="360">
  <slate-image-list-item src="https://picsum.photos/seed/il-s1/200/200" title="Breakfast"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-s2/200/200" title="Burger"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-s3/200/200" title="Camera"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-s4/200/200" title="Coffee"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-s5/200/200" title="Hats"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-s6/200/200" title="Honey"></slate-image-list-item>
</slate-image-list>`,
      },
      {
        name: "Quilted",
        code: `<slate-image-list variant="quilted" cols="4" row-height="80" gap="4" width="360">
  <slate-image-list-item
    src="https://picsum.photos/seed/il-q1/320/320"
    title="Breakfast"
    cols="2"
    rows="2"
  ></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-q2/160/160" title="Burger"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-q3/160/160" title="Camera"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-q4/320/160" title="Coffee" cols="2"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-q5/320/160" title="Hats" cols="2"></slate-image-list-item>
  <slate-image-list-item
    src="https://picsum.photos/seed/il-q6/320/320"
    title="Honey"
    subtitle="@slate"
    cols="2"
    rows="2"
  ></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-q7/160/160" title="Basketball"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-q8/160/160" title="Fern"></slate-image-list-item>
</slate-image-list>`,
      },
      {
        name: "Woven",
        code: `<slate-image-list variant="woven" cols="3" gap="8" width="360">
  <slate-image-list-item src="https://picsum.photos/seed/il-w1/200/260" title="Sea star"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-w2/200/240" title="Bike"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-w3/200/260" title="Mushrooms"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-w4/200/240" title="Tomato"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-w5/200/260" title="Fern"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-w6/200/240" title="Hats"></slate-image-list-item>
</slate-image-list>`,
      },
      {
        name: "Masonry",
        code: `<slate-image-list variant="masonry" cols="3" gap="8" width="360">
  <slate-image-list-item src="https://picsum.photos/seed/il-m1/240/180" aspect="4/3" title="A"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-m2/240/320" aspect="3/4" title="B"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-m3/240/200" aspect="6/5" title="C"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-m4/240/280" aspect="5/6" title="D"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-m5/240/160" aspect="3/2" title="E"></slate-image-list-item>
  <slate-image-list-item src="https://picsum.photos/seed/il-m6/240/300" aspect="4/5" title="F"></slate-image-list-item>
</slate-image-list>`,
      },
      {
        name: "Clickable",
        code: `<slate-image-list cols="3" row-height="96" gap="6" width="320">
  <slate-image-list-item
    src="https://picsum.photos/seed/il-c1/200/200"
    title="One"
    value="one"
    clickable
  ></slate-image-list-item>
  <slate-image-list-item
    src="https://picsum.photos/seed/il-c2/200/200"
    title="Two"
    value="two"
    clickable
  ></slate-image-list-item>
  <slate-image-list-item
    src="https://picsum.photos/seed/il-c3/200/200"
    title="Three"
    value="three"
    clickable
  ></slate-image-list-item>
</slate-image-list>`,
      },
    ],
  }),

  "media.html": page({
    title: "Media",
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "play,pause",
    mount: "verticalbox",
    variants: [
      {
        name: "Video",
        code: `<slate-media
  kind="video"
  width="360"
  src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
></slate-media>`,
      },
      {
        name: "Muted loop",
        code: `<slate-media
  kind="video"
  width="360"
  muted
  loop
  src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
></slate-media>`,
      },
    ],
  }),

  "popup-anchor.html": page({
    title: "Popup Anchor",
    hint: "Hover or click, menus flip / clamp to stay on screen.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<popup-anchor placement="bottom-start">
  <border kind="chip" padding="8 12">
    <textblock text="Open menu"></textblock>
  </border>
  <verticalbox data-popup width="200" padding="12" gap="6">
    <border kind="panel" padding="10">
      <verticalbox gap="4">
        <textblock text="bottom-start"></textblock>
        <slate-text kind="hint" text="Opens below the chip."></slate-text>
      </verticalbox>
    </border>
  </verticalbox>
</popup-anchor>`,
      },
      {
        name: "Top",
        code: `<popup-anchor placement="top">
  <border kind="chip" padding="8 12">
    <textblock text="Opens above"></textblock>
  </border>
  <verticalbox data-popup width="200" padding="12">
    <border kind="panel" padding="10">
      <slate-text kind="body" text="top placement"></slate-text>
    </border>
  </verticalbox>
</popup-anchor>`,
      },
      {
        name: "End",
        code: `<popup-anchor placement="bottom-end">
  <border kind="chip" padding="8 12">
    <textblock text="End aligned"></textblock>
  </border>
  <verticalbox data-popup width="220" padding="12">
    <border kind="panel" padding="10">
      <slate-text kind="body" text="bottom-end"></slate-text>
    </border>
  </verticalbox>
</popup-anchor>`,
      },
    ],
  }),

  "shadowbox.html": page({
    title: "Shadowbox",
    hint: "shadowbox-button owns its lightbox (src, title, text). Or wire commandfor to a slate-shadowbox id.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Open",
        code: `<shadowbox-button
  src="https://i.pravatar.cc/800?img=12"
  title="Preview"
  text="Open image lightbox"
></shadowbox-button>`,
      },
      {
        name: "Other image",
        code: `<shadowbox-button
  src="https://i.pravatar.cc/800?img=32"
  title="Another photo"
  text="Open other image"
></shadowbox-button>`,
      },
      {
        name: "Invoker command",
        code: `<button type="button" commandfor="demo-shadowbox" command="--open">
  Open (commandfor)
</button>
<slate-shadowbox
  id="demo-shadowbox"
  src="https://i.pravatar.cc/800?img=12"
  title="Invoker target"
></slate-shadowbox>`,
      },
    ],
  }),

  // --- Foundation ---
  "typography.html": page({
    title: "Typography",
    hint: "slate-text kinds, edit the UMC on the right.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Scale",
        code: `<slate-text kind="title" text="Title"></slate-text>
<slate-text kind="section" text="Section"></slate-text>
<slate-text kind="subtitle" text="Subtitle supporting line."></slate-text>
<slate-text kind="body" text="Body copy for primary reading."></slate-text>
<slate-text kind="label" text="Label"></slate-text>
<slate-text kind="hint" text="Hint helper text."></slate-text>
<slate-text kind="mono" text="mono · attrs"></slate-text>`,
      },
      {
        name: "Body",
        code: `<slate-text text="Bare slate-text, kind defaults to body."></slate-text>
<slate-text kind="body" text="Same styles with kind=&quot;body&quot;."></slate-text>
<slate-text kind="hint" text="Use hint for quieter secondary lines."></slate-text>`,
      },
      {
        name: "Chrome",
        code: `<slate-text kind="label" text="Panel label"></slate-text>
<slate-text kind="mono" text="fill · gap · anchors"></slate-text>`,
      },
    ],
  }),

  "box.html": page({
    title: "Box & Border",
    hint: "Boxes lay out children. Border wraps content with padding and optional kind chrome.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Box · Row",
        code: `<horizontalbox gap="8" valign="center" width="100%">
  <border kind="slot"><slate-text kind="mono" text="A"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="B"></slate-text></border>
  <spacer></spacer>
  <border kind="slot"><slate-text kind="mono" text="end"></slate-text></border>
</horizontalbox>`,
      },
      {
        name: "Box · Fill",
        code: `<horizontalbox gap="8" min-height="56" width="100%">
z yqoqej vb  <border kind="slot" fill="1" min-height="40"><slate-text kind="mono" text="fill 1"></slate-text></border>
  <border kind="slot" fill="2" min-height="40"><slate-text kind="mono" text="fill 2"></slate-text></border>
  <border kind="slot" fill="1" min-height="40"><slate-text kind="mono" text="fill 1"></slate-text></border>
</horizontalbox>`,
      },
      {
        name: "Box · Stack",
        code: `<verticalbox gap="8" width="100%">
  <border kind="slot"><slate-text kind="mono" text="One"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="Two"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="Three"></slate-text></border>
</verticalbox>`,
      },
      {
        name: "Border · Kinds",
        code: `<verticalbox gap="8">
  <border kind="panel" padding="12"><slate-text kind="mono" text="panel"></slate-text></border>
  <border kind="well" padding="12"><slate-text kind="mono" text="well"></slate-text></border>
  <border kind="chip"><slate-text kind="mono" text="chip"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="slot"></slate-text></border>
  <border kind="hud"><slate-text kind="mono" text="hud"></slate-text></border>
</verticalbox>`,
      },
      {
        name: "Border · Padding",
        code: `<horizontalbox gap="8" valign="center">
  <border kind="chip" padding="4"><slate-text kind="mono" text="4"></slate-text></border>
  <border kind="chip" padding="8 16"><slate-text kind="mono" text="8 16"></slate-text></border>
  <border kind="chip" padding="16"><slate-text kind="mono" text="16"></slate-text></border>
</horizontalbox>`,
      },
    ],
  }),

  "overlay.html": page({
    title: "Overlay & Canvas",
    hint: "Overlay stacks with halign/valign. Canvas pins with anchors + offsets.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Overlay · Center",
        code: `<overlay kind="stage" height="160" padding="12">
  <border kind="backdrop" halign="fill" valign="fill"></border>
  <border kind="chip" halign="center" valign="center">
    <textblock text="centered"></textblock>
  </border>
</overlay>`,
      },
      {
        name: "Overlay · Corners",
        code: `<overlay kind="stage" height="160" padding="12">
  <border kind="backdrop" halign="fill" valign="fill"></border>
  <border kind="hud" halign="left" valign="top">
    <slate-text kind="hud" text="left · top"></slate-text>
  </border>
  <border kind="hud" halign="right" valign="bottom">
    <slate-text kind="hud" text="right · bottom"></slate-text>
  </border>
</overlay>`,
      },
      {
        name: "Canvas · Pins",
        code: `<canvaspanel kind="stage" height="220">
  <border kind="pin" anchors="top-left" top="12" left="12">
    <slate-text kind="hud" text="top-left"></slate-text>
  </border>
  <border kind="pin" anchors="center">
    <slate-text kind="hud" text="center"></slate-text>
  </border>
  <border kind="pin" anchors="bottom-right" bottom="12" right="12">
    <slate-text kind="hud" text="bottom-right"></slate-text>
  </border>
</canvaspanel>`,
      },
      {
        name: "Canvas · Fill",
        code: `<canvaspanel kind="stage" height="220">
  <border kind="inset" anchors="fill" top="24" left="24" right="24" bottom="24">
    <verticalbox gap="6" height="100%" valign="center" halign="center">
      <slate-text kind="label" text='anchors="fill"'></slate-text>
      <progressbar percent="70" width="150"></progressbar>
    </verticalbox>
  </border>
</canvaspanel>`,
      },
      {
        name: "Canvas · Edges",
        code: `<canvaspanel kind="stage" height="220">
  <border kind="pin" anchors="top" top="12"><slate-text kind="hud" text="top"></slate-text></border>
  <border kind="pin" anchors="left" left="12"><slate-text kind="hud" text="left"></slate-text></border>
  <border kind="pin" anchors="right" right="12"><slate-text kind="hud" text="right"></slate-text></border>
  <border kind="pin" anchors="bottom" bottom="12"><slate-text kind="hud" text="bottom"></slate-text></border>
</canvaspanel>`,
      },
    ],
  }),

  "scrollbox.html": page({
    title: "Scroll Box",
    hint: "Clipped scrolling region, needs a bounded size. orientation: vertical, horizontal, or both.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Vertical",
        code: `<scrollbox orientation="vertical" kind="stage" height="160" max-height="160">
  <verticalbox gap="8">
    <border kind="chip"><textblock text="Inventory slot 01"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 02"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 03"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 04"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 05"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 06"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 07"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 08"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 09"></textblock></border>
    <border kind="chip"><textblock text="Inventory slot 10"></textblock></border>
  </verticalbox>
</scrollbox>`,
      },
      {
        name: "Horizontal",
        code: `<scrollbox orientation="horizontal" kind="stage" height="64" width="100%" max-width="100%">
  <horizontalbox gap="8" padding="8">
    <border kind="chip"><textblock text="Alpha"></textblock></border>
    <border kind="chip"><textblock text="Bravo"></textblock></border>
    <border kind="chip"><textblock text="Charlie"></textblock></border>
    <border kind="chip"><textblock text="Delta"></textblock></border>
    <border kind="chip"><textblock text="Echo"></textblock></border>
    <border kind="chip"><textblock text="Foxtrot"></textblock></border>
    <border kind="chip"><textblock text="Golf"></textblock></border>
    <border kind="chip"><textblock text="Hotel"></textblock></border>
    <border kind="chip"><textblock text="India"></textblock></border>
    <border kind="chip"><textblock text="Juliet"></textblock></border>
    <border kind="chip"><textblock text="Kilo"></textblock></border>
    <border kind="chip"><textblock text="Lima"></textblock></border>
    <border kind="chip"><textblock text="Mike"></textblock></border>
    <border kind="chip"><textblock text="November"></textblock></border>
    <border kind="chip"><textblock text="Oscar"></textblock></border>
    <border kind="chip"><textblock text="Papa"></textblock></border>
    <border kind="chip"><textblock text="Quebec"></textblock></border>
    <border kind="chip"><textblock text="Romeo"></textblock></border>
  </horizontalbox>
</scrollbox>`,
      },
      {
        name: "Both",
        code: `<scrollbox orientation="both" kind="stage" height="160" width="100%" max-width="100%">
  <gridpanel columns="4" gap="8" width="520" padding="8">
    <border kind="slot" min-height="56"><slate-text kind="mono" text="A1"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="A2"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="A3"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="A4"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="B1"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="B2"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="B3"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="B4"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="C1"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="C2"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="C3"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="C4"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="D1"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="D2"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="D3"></slate-text></border>
    <border kind="slot" min-height="56"><slate-text kind="mono" text="D4"></slate-text></border>
  </gridpanel>
</scrollbox>`,
      },
    ],
  }),

  "wrapbox.html": page({
    title: "Wrapbox",
    hint: "Flow children onto new rows when space runs out.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<wrapbox gap="8" width="100%">
  <border kind="chip"><textblock text="One"></textblock></border>
  <border kind="chip"><textblock text="Two"></textblock></border>
  <border kind="chip"><textblock text="Three"></textblock></border>
  <border kind="chip"><textblock text="Four"></textblock></border>
  <border kind="chip"><textblock text="Five"></textblock></border>
  <border kind="chip"><textblock text="Six"></textblock></border>
</wrapbox>`,
      },
      {
        name: "Narrow",
        code: `<wrapbox gap="8" width="180">
  <border kind="chip"><textblock text="Alpha"></textblock></border>
  <border kind="chip"><textblock text="Bravo"></textblock></border>
  <border kind="chip"><textblock text="Charlie"></textblock></border>
  <border kind="chip"><textblock text="Delta"></textblock></border>
</wrapbox>`,
      },
    ],
  }),

  "gridpanel.html": page({
    title: "Grid Panel",
    hint: "Equal columns by default. Use masonry or uniform for other packing.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "3 columns",
        code: `<gridpanel columns="3" gap="8" width="100%">
  <border kind="slot" min-height="48"><slate-text kind="mono" text="1"></slate-text></border>
  <border kind="slot" min-height="48"><slate-text kind="mono" text="2"></slate-text></border>
  <border kind="slot" min-height="48"><slate-text kind="mono" text="3"></slate-text></border>
  <border kind="slot" min-height="48"><slate-text kind="mono" text="4"></slate-text></border>
  <border kind="slot" min-height="48"><slate-text kind="mono" text="5"></slate-text></border>
  <border kind="slot" min-height="48"><slate-text kind="mono" text="6"></slate-text></border>
</gridpanel>`,
      },
      {
        name: "2 columns",
        code: `<gridpanel columns="2" gap="10" width="100%">
  <border kind="slot" min-height="56"><slate-text kind="mono" text="A"></slate-text></border>
  <border kind="slot" min-height="56"><slate-text kind="mono" text="B"></slate-text></border>
  <border kind="slot" min-height="56"><slate-text kind="mono" text="C"></slate-text></border>
  <border kind="slot" min-height="56"><slate-text kind="mono" text="D"></slate-text></border>
</gridpanel>`,
      },
      {
        name: "Masonry",
        code: `<gridpanel masonry columns="3" gap="8" width="100%">
  <border kind="slot" min-height="40"><slate-text kind="mono" text="1"></slate-text></border>
  <border kind="slot" min-height="96"><slate-text kind="mono" text="2"></slate-text></border>
  <border kind="slot" min-height="56"><slate-text kind="mono" text="3"></slate-text></border>
  <border kind="slot" min-height="72"><slate-text kind="mono" text="4"></slate-text></border>
  <border kind="slot" min-height="40"><slate-text kind="mono" text="5"></slate-text></border>
  <border kind="slot" min-height="88"><slate-text kind="mono" text="6"></slate-text></border>
</gridpanel>`,
      },
      {
        name: "Uniform 2×2",
        code: `<gridpanel uniform columns="2" rows="2" gap="8" width="100%" height="140">
  <border kind="slot"><slate-text kind="mono" text="A"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="B"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="C"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="D"></slate-text></border>
</gridpanel>`,
      },
      {
        name: "Uniform 3×1",
        code: `<gridpanel uniform columns="3" rows="1" gap="8" width="100%" height="72">
  <border kind="slot"><slate-text kind="mono" text="1"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="2"></slate-text></border>
  <border kind="slot"><slate-text kind="mono" text="3"></slate-text></border>
</gridpanel>`,
      },
    ],
  }),

  "widgetswitcher.html": page({
    title: "Widgetswitcher",
    hint: "Show one child page at a time, active + page / data-page.",
    events: "clicked",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<horizontalbox gap="8" valign="center">
  <slate-button data-demo-switcher-prev text="Prev"></slate-button>
  <slate-button data-demo-switcher-next text="Next"></slate-button>
</horizontalbox>
<widgetswitcher data-demo-switcher active="one" height="100">
  <border kind="slot" page="one" height="100"><slate-text kind="mono" text="page one"></slate-text></border>
  <border kind="slot" page="two" height="100"><slate-text kind="mono" text="page two"></slate-text></border>
  <border kind="slot" page="three" height="100"><slate-text kind="mono" text="page three"></slate-text></border>
</widgetswitcher>`,
      },
      {
        name: "Active two",
        code: `<widgetswitcher active="two" height="100">
  <border kind="slot" data-page="one" height="100"><slate-text kind="mono" text="one"></slate-text></border>
  <border kind="slot" data-page="two" height="100"><slate-text kind="mono" text="two (active)"></slate-text></border>
  <border kind="slot" data-page="three" height="100"><slate-text kind="mono" text="three"></slate-text></border>
</widgetswitcher>`,
      },
    ],
  }),

  "sizebox.html": page({
    title: "Sizebox",
    hint: "Force child to an explicit width / height.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Fixed",
        code: `<sizebox width="120" height="80">
  <border kind="slot" width="100%" height="100%">
    <slate-text kind="mono" text="120×80"></slate-text>
  </border>
</sizebox>`,
      },
      {
        name: "Wide",
        code: `<sizebox width="240" height="64">
  <border kind="chip" width="100%" height="100%">
    <textblock text="Forced width"></textblock>
  </border>
</sizebox>`,
      },
    ],
  }),

  "scalebox.html": page({
    title: "Scalebox",
    hint: "Scale the first child to fit the box.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Fit",
        code: `<scalebox width="200" height="100" stretch="fit">
  <border kind="panel" padding="16">
    <slate-text kind="section" text="Scaled"></slate-text>
  </border>
</scalebox>`,
      },
      {
        name: "Fill",
        code: `<scalebox width="200" height="100" stretch="fill">
  <border kind="chip" padding="20">
    <textblock text="fill"></textblock>
  </border>
</scalebox>`,
      },
    ],
  }),

  // --- Leaf widgets ---
  "leaf-button.html": page({
    title: "Button",
    hint: "Built-in leaf, native button with widget chrome.",
    events: "clicked",
    mount: "horizontalbox",
    label: "button (leaf)",
    variants: [
      {
        name: "Basic",
        code: `<button widget type="button">Button</button>
<button widget type="button" disabled>Disabled</button>`,
      },
      {
        name: "Row",
        code: `<button widget type="button">OK</button>
<button widget type="button">Cancel</button>`,
      },
    ],
  }),

  "leaf-checkbox.html": page({
    title: "Checkbox",
    hint: "Built-in panel leaf, edit the UMC on the right.",
    events: "changed",
    mount: "horizontalbox",
    label: "checkbox (leaf)",
    variants: [
      {
        name: "Basic",
        code: `<checkbox checked width="1.15em" height="1.15em"></checkbox>
<checkbox width="1.15em" height="1.15em"></checkbox>`,
      },
      {
        name: "Disabled",
        code: `<checkbox checked disabled width="1.15em" height="1.15em"></checkbox>
<checkbox disabled width="1.15em" height="1.15em"></checkbox>`,
      },
    ],
  }),

  "progressbar.html": page({
    title: "Progress Bar",
    hint: "Built-in panel leaf, edit the UMC on the right.",
    events: "",
    mount: "verticalbox",
    label: "progressbar",
    variants: [
      {
        name: "Basic",
        code: `<progressbar percent="62" width="220" height="8"></progressbar>`,
      },
      {
        name: "Values",
        code: `<progressbar percent="10" width="220" height="8"></progressbar>
<progressbar percent="55" width="220" height="8"></progressbar>
<progressbar percent="90" width="220" height="8"></progressbar>`,
      },
    ],
  }),

  "leaf-slider.html": page({
    title: "Slider",
    hint: "Built-in panel leaf, edit the UMC on the right.",
    events: "percentchanged",
    mount: "verticalbox",
    label: "slider (leaf)",
    variants: [
      {
        name: "Basic",
        code: `<slider percent="40" width="240"></slider>`,
      },
      {
        name: "Disabled",
        code: `<slider percent="60" width="240" disabled></slider>`,
      },
    ],
  }),

  "editabletext.html": page({
    title: "Editable Text",
    hint: "Built-in panel leaf, edit the UMC on the right.",
    events: "committed,valuechanged",
    mount: "verticalbox",
    label: "editabletext",
    variants: [
      {
        name: "Basic",
        code: `<editabletext text="EditableText" width="160" min-width="140"></editabletext>`,
      },
      {
        name: "Multiline",
        code: `<editabletext text="Line one" multiline width="240" height="72"></editabletext>`,
      },
      {
        name: "Readonly",
        code: `<editabletext text="Locked" readonly width="160"></editabletext>`,
      },
    ],
  }),

  "leaf-image.html": page({
    title: "Image",
    hint: "Built-in panel leaf, edit the UMC on the right.",
    events: "",
    mount: "horizontalbox",
    label: "image (leaf)",
    variants: [
      {
        name: "Basic",
        code: `<image brush="https://i.pravatar.cc/80?img=8" width="80" height="80"></image>`,
      },
      {
        name: "Row",
        code: `<image brush="https://i.pravatar.cc/64?img=9" width="48" height="48"></image>
<image brush="https://i.pravatar.cc/64?img=10" width="48" height="48"></image>
<image brush="https://i.pravatar.cc/64?img=11" width="48" height="48"></image>`,
      },
    ],
  }),
};

// Keep text-field as-is (already rich), regenerate with same variants for consistency
pages["text-field.html"] = page({
  title: "Text Field",
  hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
  events: "valuechanged,committed,validitychanged",
  mount: "verticalbox",
  variants: [
    {
      name: "Basic",
      code: `<slate-text-field
  label="Name"
  helper="Display name"
></slate-text-field>`,
    },
    {
      name: "Email",
      code: `<slate-text-field
  label="Email"
  type="email"
  required
  helper="We'll never share it."
></slate-text-field>`,
    },
    {
      name: "Pattern",
      code: `<slate-text-field
  label="Username"
  required
  minlength="3"
  maxlength="16"
  pattern="^[a-z][a-z0-9_]*$"
  errormessage="3-16 chars, start with a letter"
></slate-text-field>`,
    },
    {
      name: "Multiline",
      code: `<slate-text-field
  label="Bio"
  multiline
  helper="A short intro"
></slate-text-field>`,
    },
    {
      name: "Error",
      code: `<slate-text-field
  label="Server"
  value=""
  error
  errormessage="Could not reach host"
></slate-text-field>`,
    },
    {
      name: "Disabled",
      code: `<slate-text-field
  label="Locked"
  value="read-only value"
  disabled
  readonly
></slate-text-field>`,
    },
  ],
});

let n = 0;
for (const [file, html] of Object.entries(pages)) {
  writeFileSync(join(dir, file), html);
  n++;
}
console.log(`Wrote ${n} demo pages to ${dir}`);
