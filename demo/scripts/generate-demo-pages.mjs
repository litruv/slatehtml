/**
 * Generate Material-style demo pages: stacked examples (preview + code each).
 * Run: node demo/scripts/generate-demo-pages.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../pages");

function exampleBlock({ title, events, mount, code }) {
  const mountTag = mount;
  const body = code.trim();
  const ev = events ? ` data-events="${events}"` : "";
  return `          <wrapbox class="demo-example" width="100%" max-width="100%" gap="14" valign="stretch" data-demo-example${ev}>
            <border kind="panel" fill padding="16" min-width="280">
              <verticalbox gap="10" data-demo-stage>
                <slate-text kind="label" text="${title}"></slate-text>
                <${mountTag} gap="10" valign="center" data-demo-mount>
${body.split("\n").map((l) => `                  ${l}`).join("\n")}
                </${mountTag}>
              </verticalbox>
            </border>
            <border kind="well" class="demo-meta" fill padding="12" min-width="280">
              <verticalbox gap="10" fill>
                <scrollbox class="demo-code-box" max-height="220" padding="10 12">
                  <pre><code class="language-umc" data-demo-code></code></pre>
                </scrollbox>
                <slate-text kind="label" text="Events"></slate-text>
                <scrollbox class="demo-events-scroll" max-height="140">
                  <textblock class="demo-events" kind="mono" data-demo-events text="Interact to see events…"></textblock>
                </scrollbox>
              </verticalbox>
            </border>
            <script type="text/plain" data-demo-snippet>
${body}
            </script>
          </wrapbox>`;
}

function page({ title, hint, events = "", mount = "verticalbox", label, variants }) {
  const blocks = variants
    .map((v) =>
      exampleBlock({
        title: v.name,
        events,
        mount,
        code: v.code,
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
    hint: "Edit the UMC on the right, blur or Ctrl+Enter applies it.",
    events: "selectionchanged",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-tabs>
  <slate-tab name="basic" label="Basic">
    <slate-text kind="body" text="First panel."></slate-text>
  </slate-tab>
  <slate-tab name="email" label="Email">
    <slate-text kind="body" text="Second panel."></slate-text>
  </slate-tab>
  <slate-tab name="bio" label="Bio">
    <slate-text kind="body" text="Third panel."></slate-text>
  </slate-tab>
</slate-tabs>`,
      },
      {
        name: "Attr tabs",
        code: `<slate-tabs tabs="one, two, three" active="two">
  <border kind="panel" padding="12">
    <slate-text kind="body" text="Active tab body (attr-driven list)."></slate-text>
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

  // --- Pickers ---
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
  "icon.html": page({
    title: "Icon",
    hint: "Lucide icons, any kebab-case name from lucide.dev/icons.",
    events: "",
    mount: "horizontalbox",
    variants: [
      {
        name: "Basic",
        code: `<slate-icon name="search" size="18"></slate-icon>
<slate-icon name="settings" size="18"></slate-icon>
<slate-icon name="bell" size="18"></slate-icon>`,
      },
      {
        name: "Sizes",
        code: `<slate-icon name="star" size="14"></slate-icon>
<slate-icon name="star" size="20"></slate-icon>
<slate-icon name="star" size="28"></slate-icon>`,
      },
      {
        name: "Stroke",
        code: `<slate-icon name="heart" size="22" stroke-width="1"></slate-icon>
<slate-icon name="heart" size="22" stroke-width="2"></slate-icon>
<slate-icon name="heart" size="22" stroke-width="2.5"></slate-icon>`,
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
    hint: "Fullscreen overlay, Esc / backdrop to close. Shell hosts the lightbox.",
    events: "clicked",
    mount: "horizontalbox",
    variants: [
      {
        name: "Open",
        code: `<slate-button data-demo-open-shadow text="Open image lightbox"></slate-button>`,
      },
      {
        name: "Hint",
        code: `<slate-button data-demo-open-shadow text="Preview"></slate-button>
<slate-text kind="hint" text="Uses the page-level slate-shadowbox."></slate-text>`,
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
    title: "Box",
    hint: "horizontalbox, verticalbox, spacer, and fill weights.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Row",
        code: `<horizontalbox gap="8" valign="center">
  <border kind="chip"><textblock text="A"></textblock></border>
  <border kind="chip"><textblock text="B"></textblock></border>
  <spacer></spacer>
  <border kind="chip"><textblock text="pinned right"></textblock></border>
</horizontalbox>`,
      },
      {
        name: "Fill",
        code: `<horizontalbox gap="8" min-height="56">
  <border kind="slot" fill="1" min-height="40"><slate-text kind="mono" text="fill 1"></slate-text></border>
  <border kind="slot" fill="2" min-height="40"><slate-text kind="mono" text="fill 2"></slate-text></border>
  <border kind="slot" fill="1" min-height="40"><slate-text kind="mono" text="fill 1"></slate-text></border>
</horizontalbox>`,
      },
      {
        name: "Stack",
        code: `<verticalbox gap="8">
  <border kind="chip"><textblock text="One"></textblock></border>
  <border kind="chip"><textblock text="Two"></textblock></border>
  <border kind="chip"><textblock text="Three"></textblock></border>
</verticalbox>`,
      },
    ],
  }),

  "overlay.html": page({
    title: "Overlay",
    hint: "Stack children, alignment via halign / valign.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Center",
        code: `<overlay kind="stage" height="160" padding="12">
  <border kind="backdrop" halign="fill" valign="fill"></border>
  <border kind="chip" halign="center" valign="center">
    <textblock text="centered"></textblock>
  </border>
</overlay>`,
      },
      {
        name: "Corners",
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

  "canvaspanel.html": page({
    title: "Canvaspanel",
    hint: "anchors + top / left / right / bottom.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Pins",
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
        name: "Fill",
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
        name: "Edges",
        code: `<canvaspanel kind="stage" height="220">
  <border kind="pin" anchors="top" top="12"><slate-text kind="hud" text="top"></slate-text></border>
  <border kind="pin" anchors="left" left="12"><slate-text kind="hud" text="left"></slate-text></border>
  <border kind="pin" anchors="right" right="12"><slate-text kind="hud" text="right"></slate-text></border>
  <border kind="pin" anchors="bottom" bottom="12"><slate-text kind="hud" text="bottom"></slate-text></border>
</canvaspanel>`,
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

  "safezone.html": page({
    title: "Safezone",
    hint: "Pads by env(safe-area-inset-*), useful on notched devices.",
    events: "",
    mount: "verticalbox",
    variants: [
      {
        name: "Basic",
        code: `<safezone pad="1">
  <border kind="panel" padding="12">
    <slate-text kind="body" text="Content inset by safe-area."></slate-text>
  </border>
</safezone>`,
      },
      {
        name: "Double pad",
        code: `<safezone pad="2">
  <border kind="slot" padding="12">
    <slate-text kind="mono" text="pad=&quot;2&quot;"></slate-text>
  </border>
</safezone>`,
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
