# Layout & positioning

SlateHTML layout is **attribute-driven**, modeled after Unreal Engine UMG. You structure UI with panel tags (`verticalbox`, `overlay`, `canvaspanel`, …) and put sizing, spacing, alignment, and anchors on those tags, not in flex/grid CSS.

The canonical reference is root [`index.html`](../index.html): a live **layout gallery** you can open with:

```bash
npm run demo
```

Resize the browser while you read, especially the canvas panel section, to see stretch anchors behave like UMG.

## Core idea: layout vs look

| Concern | Where it goes | Examples |
|---------|---------------|----------|
| **Layout** | Panel tag attributes | `padding`, `gap`, `fill`, `halign`, `anchors`, `width` |
| **Look** | CSS on `kind` or type selectors | `--widget-background`, font sizes, colors |

Do **not** paper over layout problems with CSS `width: 100%`, `position: absolute`, flex shims, or `z-index`. Fix the tag tree and attributes instead.

Authors write **bare** tag names (`verticalbox`). The Vite `.umc` loader rewrites them to `umc-verticalbox` custom elements. Uncompiled HTML keeps bare names, `widget.css` matches both.

> **Note:** bare `<image>` is rewritten by the HTML parser to `<img>`. In static HTML use `umc-image`, or compile through Vite.

## Panel tags

| Tag | Role |
|-----|------|
| `horizontalbox` / `verticalbox` | Flex row / column |
| `wrapbox` | Horizontal flow that wraps |
| `overlay` | Stack children in one cell |
| `canvaspanel` | Absolutely positioned children with anchors |
| `scrollbox` | Clipped scroll area |
| `gridpanel` | CSS grid (`columns`; `masonry` / `uniform` modes) |
| `uniformgridpanel` | Alias for `<gridpanel uniform>` |
| `scalebox` | Scale first child to fit |
| `border` / `spacer` / `sizebox` | Chrome / flex spacer / size clamp |
| `widgetswitcher` | Show one child page at a time (`active` + `page`) |
| `backgroundblur` | Backdrop blur layer in an overlay |
| `textblock` / `image` / `progressbar` / `checkbox` / `slider` / `editabletext` | Leaf widgets |

Leaf widgets fire native events: `changed` (checkbox), `percentchanged` (slider), `textchanged` / `committed` (editabletext).

Layout panels emit bubbling `sizechanged` `{ width, height }` when their box changes (ResizeObserver). UMC widgets can use `api.watchSize(({ width, height }) => …)` from `slatehtml/umc`.

## Shared attributes

These work on most panels and leaves:

| Attribute | Purpose |
|-----------|---------|
| `padding` | Inner padding. Unitless numbers → px. Supports multi-value: `4 16`, `8 12 16`. |
| `gap` | Space between children (boxes, grids, wrap). |
| `width` / `height` | Explicit size (px if unitless). |
| `min-width` / `max-width` / `min-height` / `max-height` | Size clamps. |
| `fill` | Flex grow weight in a box parent. Bare `fill` = 1; `fill="2"` grows twice as much. |
| `halign` / `valign` | Alignment: `left` / `center` / `right` / `fill` and `top` / `center` / `bottom` / `fill`. |
| `kind` | Style hook for theme CSS (see `index.html` chrome block). |
| `background` / `border-color` | Set `--widget-background` / `--widget-border`. |

Import `slatehtml` (or link `widget.css` + `widget.js`) so attributes are wired to CSS automatically.

## Boxes: horizontal, vertical, spacer, fill

From the gallery's **Horizontal / Vertical / Spacer / Fill** panel:

```html
<horizontalbox gap="8" valign="center">
  <border kind="chip"><textblock text="A"></textblock></border>
  <border kind="chip"><textblock text="B"></textblock></border>
  <spacer></spacer>
  <border kind="chip"><textblock text="pinned right"></textblock></border>
</horizontalbox>

<verticalbox fill gap="8">
  <border kind="chip"><textblock text="auto height"></textblock></border>
  <border kind="slot" fill>
    <textblock text="fill, remaining space"></textblock>
  </border>
  <horizontalbox gap="8" min-height="52">
    <border kind="slot" fill="1"><textblock text="fill 1"></textblock></border>
    <border kind="slot" fill="2"><textblock text="fill 2"></textblock></border>
    <border kind="slot" fill="1"><textblock text="fill 1"></textblock></border>
  </horizontalbox>
</verticalbox>
```

**Patterns:**

- **`spacer`** eats leftover space in a horizontal box (like a flex `margin-left: auto` pin).
- **`fill`** on a child makes it grow to fill remaining space along the parent's main axis.
- **`fill="2"`** vs **`fill="1"`** splits extra space by weight (2:1:1 in the example above).
- Put **`height="100%"`** or a **`fill`** slot on the parent chain so children actually have room to grow.

## Overlay: stacking and alignment

`overlay` places every child in the **same cell**. Later siblings paint on top. Each child uses `halign` and `valign` to pick its corner or center:

```html
<overlay kind="stage" fill height="0" padding="12">
  <border kind="backdrop" halign="fill" valign="fill"></border>
  <border kind="hud" halign="left" valign="top">
    <textblock text="left · top"></textblock>
  </border>
  <border kind="chip" halign="center" valign="center">
    <textblock text="center · center"></textblock>
  </border>
</overlay>
```

**Full-page layers:** use `canvaspanel` with children `anchors="fill"` and `top`/`left`/`right`/`bottom`=`0`, not CSS `position` / `z-index`.

**Overlay + fill trick:** `fill height="0"` with `min-height` on the stage (via `kind="stage"` CSS in `index.html`) lets the overlay grow inside a flex column while respecting min sizes.

## Scrollbox

`scrollbox` clips to its allocated size and scrolls overflow. It needs a bounded height, from `height`, a parent `fill` slot, or `min-height`:

```html
<scrollbox kind="stage" fill>
  <verticalbox gap="8">
    <border kind="chip"><textblock text="Row 1"></textblock></border>
    <!-- more rows… -->
  </verticalbox>
</scrollbox>
```

Set `orientation="horizontal"`, `"vertical"`, or `"both"` (default is both axes when omitted).

**Click-drag scroll** (mouse/pen, phone-like): enable globally with `configure({ dragScroll: true })`, or per box with `drag-scroll` / `drag-scroll="false"`. Touch keeps native panning. Works over buttons and list chrome; skips `user-select: text` / `pre` / `code` / `[selectable]` and pointer-owned controls (fields, sliders, menus).

## Canvas panel: the positioning playground

`canvaspanel` is the UMG **Canvas Panel**. Children are absolutely positioned using **anchors** plus optional **offsets** (`top`, `left`, `right`, `bottom`).

Open the gallery and resize the wide **Canvaspanel, child positioning** stage to watch stretch behavior.

### Named anchor presets

| `anchors` | Behavior |
|-----------|----------|
| `top-left`, `top`, `top-right` | Pin to top edge |
| `left`, `center`, `right` | Pin to vertical center line |
| `bottom-left`, `bottom`, `bottom-right` | Pin to bottom edge |
| `fill` / `stretch` | Stretch to all edges (0,0,1,1) |
| `h-fill` | Stretch horizontally, centered vertically |
| `v-fill` | Stretch vertically, centered horizontally |

Space-separated aliases work: `anchors="left top"` → `top-left`.

### Offsets

Offsets are pixel distances (unitless → px) from the anchored edges:

```html
<border kind="pin" anchors="top-left" top="12" left="12">…</border>
<border kind="pin" anchors="bottom-right" bottom="12" right="12">…</border>
```

### Stretch along one edge

When min and max anchors differ on an axis, the widget **stretches** along that axis. Combine with offsets to inset from edges:

```html
<!-- Horizontal bar along top, inset left/right -->
<border kind="stretch" anchors="0,0,1,0" top="52" left="88" right="88" height="34">
  <textblock text="h-stretch · top edge"></textblock>
</border>

<!-- Vertical bar along left -->
<border kind="stretch" anchors="0,0,0,1" left="16" top="100" bottom="64" width="48">
  <textblock text="v-stretch"></textblock>
</border>
```

### Fill with insets

`anchors="fill"` with all four offsets defines a rectangle that tracks the parent size:

```html
<border kind="inset" anchors="fill" top="100" left="138" right="138" bottom="64">
  <verticalbox gap="8" height="100%" valign="center" halign="center">
    <textblock kind="label" text='anchors="fill"'></textblock>
    <progressbar percent="70" width="150"></progressbar>
  </verticalbox>
</border>
```

Resize the gallery, the inset panel grows and shrinks with the canvas.

### UE-style numeric anchors

Four comma-separated values `minX,minY,maxX,maxY` in the 0-1 range (Unreal canvas coordinates):

```html
<!-- Pin point at 22% from left, 78% from top -->
<border kind="chip" anchors="0.22,0.78,0.22,0.78">
  <textblock text="0.22, 0.78"></textblock>
</border>
```

When min equals max on both axes, you get a **point anchor**. When they differ, you get stretch on that axis.

### Manual positioning without named anchors

You can position with offsets alone (the gallery's bottom HUD bar):

```html
<border kind="hud" left="138" right="138" bottom="20" height="28">
  <textblock text="manual left + right + bottom"></textblock>
</border>
```

### UserWidgets on a canvas

`.umc` hosts default to `display: contents`; layout attributes on the host are forwarded to the stamped root. You can place `<my-modal anchors="fill" …>` directly on a `canvaspanel`, see [UMC components](./umc.md#host-layout).

## Other panels (gallery sections)

### Wrapbox

Chips that flow to the next line when space runs out:

```html
<wrapbox gap="8" width="100%">
  <border kind="chip"><textblock text="wrapbox"></textblock></border>
  <!-- … -->
</wrapbox>
```

### Gridpanel

```html
<gridpanel columns="3" gap="8" width="200">…</gridpanel>

<gridpanel masonry columns="3" gap="8" width="200">…</gridpanel>

<gridpanel uniform columns="2" rows="2" gap="8" width="160" height="160">…</gridpanel>
```

`gridpanel` divides space into equal columns (and optional rows). `masonry` packs uneven heights into columns (multi-column flow; `rows` ignored). `uniform` forces equal `1fr` row and column tracks (same as the UMG `uniformgridpanel` tag, still supported as an alias).

### Widgetswitcher

Show one page at a time:

```html
<widgetswitcher active="one">
  <border page="one" kind="slot">Page one</border>
  <border page="two" kind="slot">Page two</border>
</widgetswitcher>
```

Change `active` to switch pages. Used in the Matrix login example for step flow.

### Backgroundblur

```html
<overlay height="80" fill>
  <backgroundblur blur="10" halign="fill" valign="fill"></backgroundblur>
  <border kind="slot" halign="center" valign="center">Card above blur</border>
</overlay>
```

## Styling with `kind`

The gallery defines reusable chrome via `kind` on `border`, `textblock`, and stages:

```css
border[kind="panel"] {
  --widget-background: var(--panel);
  --widget-border: 1px solid var(--line);
  --widget-radius: var(--radius);
}
textblock[kind="label"] {
  font-family: "IBM Plex Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
}
```

`--widget-background`, `--widget-border`, `--widget-radius`, and `--widget-padding` are the standard chrome tokens. Panels read them in `widget.css`.

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Child doesn't fill parent | Ensure an ancestor has `fill` or explicit `height`; flex children need a bounded main axis. |
| Canvas child stuck in corner | Check `anchors` and offsets; use `fill` for stretch. |
| Scrollbox doesn't scroll | Give `scrollbox` a max height (`fill` slot or `height`). |
| Layout "fixed" with CSS `%` / `vh` | Move sizing to panel attrs. |
| Used `<div>` for layout | Use `verticalbox` / `horizontalbox` / `border`. |

## Next steps

- [Build your first `.umc` widget](./tutorials/01-first-widget.md)
- [UMC components reference](./umc.md)
- [Root README](../README.md), install and API
