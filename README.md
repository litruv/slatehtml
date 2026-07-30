# SlateHTML

UMG-style layout panels and UserWidgets for the web. Plain HTML tags for layout (`verticalbox`, `overlay`, `canvaspanel`, …), plus `.umc` single-file components with Unreal-like lifecycle, events, and a Vite plugin. No React/Vue required — custom elements in the light DOM.

## Documentation

User guides and tutorials live in [`docs/`](./docs/README.md):

| Guide | Topics |
|-------|--------|
| [Layout & positioning](./docs/layout.md) | Panel tags, `fill`, overlay, canvas anchors — layout gallery (`index.html`) |
| [Component playground](./docs/component-playground.md) | Live `.umc` preview in VS Code — resizable stage, `--- preview ---` |
| [UMC components](./docs/umc.md) | `.umc` sections, lifecycle, events, composition, Vite |
| [Tutorials](./docs/tutorials/README.md) | First widget → composition → events → dynamic lists |

## Install

```bash
npm install slatehtml
# optional UI kit:
npm install slatehtml-ui
```

```js
import "slatehtml";
import "slatehtml-ui"; // registers <slate-button>, pickers, …
```

See [`packages/slatehtml-ui`](./packages/slatehtml-ui/README.md). The Matrix client app lives in a sibling repo (`~/dev/matrix`).

Or copy `widget.css` + `widget.js` into your project.

## Quick start

### One import (bundler)

```js
import "slatehtml";
```

Injects the stylesheet and wires attributes (`padding`, `fill`, `anchors`, …) to CSS.

### Split CSS / JS (no FOUC)

```js
import "slatehtml/css";
import "slatehtml/slate.js";
```

### HTML without a bundler

```html
<link rel="stylesheet" href="./node_modules/slatehtml/widget.css" />

<verticalbox padding="24" gap="12">
  <textblock text="Hello"></textblock>
  <horizontalbox gap="8">
    <border fill padding="12"><textblock text="fill"></textblock></border>
    <border fill="2" padding="12"><textblock text="fill 2"></textblock></border>
  </horizontalbox>
</verticalbox>

<script type="module">
  import "slatehtml/slate.js";
</script>
```

## Layout markup

**Canonical demo:** root [`index.html`](./index.html) — layout and positioning live in panel attributes; CSS is mostly `kind` chrome via `--widget-*` tokens. Prefer that pattern over raw flex/grid/position CSS.

Authors write **bare** tag names (`verticalbox`, `textblock`, …). With the Vite `.umc` loader those compile to **`umc-*` custom elements** (`umc-verticalbox`, …). Uncompiled HTML (`npm run demo`, or a plain link to `widget.css`) keeps bare names — `widget.css` matches both via `:is(verticalbox, umc-verticalbox)`, and `widget.js` still enhances bare tags via MutationObserver.

> Note: bare `<image>` is rewritten by the HTML parser to `<img>`, so it never matched CSS. Prefer the compiled `umc-image` path (or write `umc-image` explicitly in static HTML).


| Tag | Role |
|-----|------|
| `horizontalbox` / `verticalbox` / `wrapbox` | Flex row / column / wrap |
| `overlay` | Stack children in one cell (`halign` / `valign` on children) |
| `canvaspanel` | Absolute children + `anchors` + offsets |
| `scrollbox` | Clipped scroll area |
| `gridpanel` | CSS grid (`columns`, optional `rows`) |
| `scalebox` | Scale first child to fit |
| `border` / `spacer` / `sizebox` | Chrome / flex spacer / size clamp |
| `textblock` / `image` / `progressbar` / `checkbox` / `slider` / `editabletext` | Leaf widgets |

**Common attributes:** `padding`, `gap`, `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`, `fill`, `halign`, `valign`, `anchors`, `top` / `left` / `right` / `bottom`, `background`, `border-color`, `kind`.

**Look vs layout:** put size, spacing, alignment, fill, and anchors on the tags. Use `--- style ---` / page CSS for typography, colors, and `--widget-background` / `--widget-border` / `--widget-radius` / `--widget-padding` keyed off `kind` (same split as `index.html`).

**Leaf extras:** `text`, `brush`, `tint`, `percent`, `checked`, `disabled`, `readonly`, `multiline`.

Native leaf events (already wired by `widget.js`): `changed` (checkbox), `percentchanged` (slider), `textchanged` / `committed` (editabletext).

## .umc components

Single-file UserWidgets — HTML + CSS + JS in one file. Built for Vite via `slatehtml/umc/vite`.

```umc
--- html ---
<horizontalbox valign="center" padding="0 14" height="36" gap="10">
  <textblock data-umc="title"></textblock>
  <spacer></spacer>
  <textblock data-umc="status" kind="mono"></textblock>
</horizontalbox>

--- style ---
self textblock[kind="mono"] {
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  color: var(--muted);
}

--- script ---
export default defineUmc({
  tag: "title-bar",
  attrs: { title: "Slate", status: "Online" },
});

--- preview ---
<title-bar title="SlateHTML" status="Online"></title-bar>
```

### Sections

| Section | Aliases | Purpose |
|---------|---------|---------|
| `html` | `template` | Markup stamped into the host (light DOM) |
| `style` | `css` | Look-only CSS (string-inlined). Write `self` for the host tag; bare layout tags compile to `umc-*`. Hosts default to `display: contents` (stamped panel does layout, as in root `index.html`); don't restate flex/margin layout in CSS |
| `script` | `js` | `defineUmc({ … })` — **no import needed**; `defineUmc` is injected |
| `preview` | `demo` | Editor-only demo markup; **ignored by Vite builds** |

External files via a one-line link:

```umc
--- html ---
@ ./face.html

--- style ---
@ ./face.css

--- script ---
@ ./face.js
```

### Composition & registration

There is no component registry. Importing a `.umc` registers its custom element,
and the Vite loader **auto-imports any custom tags in the HTML section** — so you
don't write `import "./user-name.umc"` by hand:

```umc
--- html ---
<horizontalbox>
  <user-display-picture></user-display-picture>
  <message-meta></message-meta>
  <message-text></message-text>
</horizontalbox>

--- script ---
export default defineUmc({ tag: "user-message", … });
```

Resolution order for each tag:

1. `./tag.umc` then `./tag.js` next to the file
2. Search under the nearest ancestor folder named `widgets/`
3. Optional extra roots via `umc({ roots: […] })`

Built-in SlateHTML tags (`verticalbox`, `textblock`, … — and their `umc-*`
forms) are skipped. The host's own tag is skipped. Explicit imports still work
and aren't duplicated. In `.umc` files, bare layout tags in HTML / CSS / script
are rewritten to `umc-*` at compile time (same as `self` → host tag).

```js
// main.js — still just the root
import "slatehtml/css";
import "slatehtml/slate.js";
import "./widgets/app/discord-app.umc";
```

Plain `.js` widgets that build children in script (not HTML) still need their
own `import`s — auto-import only reads the `--- html ---` section and `{ tag: "…" }`
create specs in the script. Prefer `.umc` with HTML composition when you can.

Widgets can live in any folder tree under `widgets/`:

```
widgets/
  app/       discord-app · title-bar
  matrix/    matrix-shell · matrix-scope · matrix-room-list · matrix-chat-roll · …
  message/   user-message · message-meta · message-text · user-name · …
  lib/       slate-button · popup-anchor
```

Parents pass state down in `SynchronizeProperties` and children report back with
events — see `../matrix/widgets/matrix/matrix-shell.umc`.

### Declarative bind (`data-umc`)

```html
<textblock data-umc="title"></textblock>
```

Copies the host’s `title` attribute (or the `attrs` default) onto that node’s `text` attribute. Override the target with `data-umc-prop="…"`. Binding stops at nested custom-element boundaries, so parents don’t clobber children.

### Content region (`data-content`)

Mark where `add` / `set` / `clear` append:

```html
<verticalbox data-content gap="8"></verticalbox>
```

```js
el.add({ tag: "textblock", text: "hi" });
el.add(existingNode, "plain text", [a, b]);
el.set(/* replace */);
el.clear();
```

Hand-written widgets can `extends WidgetElement` (from `slatehtml/umc`) for the same API. Dynamic lists in `.umc` use `el.set({ tag: "user-message", … })` / `el.add(…)` into a `[data-content]` region — see `../matrix/widgets/matrix/matrix-chat-roll.umc`.

### Lifecycle (UMG UserWidget-style)

| Hook | When |
|------|------|
| `Initialize` / `OnInitialized` | Once, first attach |
| `PreConstruct` | Each attach, before template stamp |
| *(stamp + `data-umc` bind)* | Built-in |
| `Construct` | Each attach, after stamp/bind |
| `SynchronizeProperties` | After Construct, and when observed attrs change |
| `Destruct` / `Destroyed` | Detach |
| `Tick(el, api, dt)` | Every frame while attached (`dt` in seconds) |

PascalCase or camelCase. Example:

```js
export default defineUmc({
  tag: "hud-clock",
  attrs: { title: "Clock" },
  Initialize(el) {
    el._t0 = performance.now();
  },
  Construct(el, { attr }) {
    console.log("up", attr("title"));
  },
  Tick(el, api, dt) {
    // dt ≈ frame delta
  },
  Destroyed() {
    console.log("down");
  },
});
```

### Events

Map native DOM events to a public widget API. Anything with a reference can listen:

```js
export default defineUmc({
  tag: "slate-button",
  attrs: { text: "OK" },
  events: {
    click: "clicked",
    dblclick: "doubleclicked",
    mousedown: "pressed",
    mouseup: "released",
  },
  OnClicked(el, api, nativeEvent) {
    console.log(api.attr("text"));
  },
});
```

```js
const btn = root.querySelector("slate-button");
btn.addEventListener("clicked", (e) => console.log(e.detail));

// hyperscript / create()
tags["slate-button"]({ text: "OK", onClicked: (e) => … });

// fire your own
btn.emit("selected", { id: 3 });
// or api.emit("selected", { id: 3 })
```

Reference button: `packages/slatehtml-ui/src/slate-button.umc`.

### Hook API (`api`)

Passed to lifecycle hooks:

| Method | Does |
|--------|------|
| `attr(name, fallback?)` | Read one host attr / default |
| `attrs(list?)` | Read many |
| `bind(extra?)` | Refresh `data-umc` bindings |
| `stamp(html?)` | Replace host markup |
| `sync(extra?)` | Re-stamp + bind |
| `emit(type, detail?)` | Bubble a `CustomEvent` from the host |

### Vite plugin

```js
import { defineConfig } from "vite";
import { umc, singleFile } from "slatehtml/umc/vite";

export default defineConfig({
  // umc(): .umc → JS module (html/css inlined; preview stripped)
  // singleFile(): production build → one self-contained index.html
  plugins: [umc(), singleFile()],
});
```

```js
import "./widgets/app/title-bar.umc"; // registers <title-bar>
```

### Runtime imports

```js
import {
  defineUmc,
  emit,
  create,
  WidgetElement,
  installWidgetApi,
  stamp,
  bind,
  parseUmc,
} from "slatehtml/umc";
```

Inside `.umc` scripts, **do not** import `defineUmc` — the loader injects it.

## Editor preview

The [VS Code / Cursor extension](./editors/vscode-umc/README.md) is the **component playground** — live preview of `.umc` widgets. See [Component playground](./docs/component-playground.md).

```bash
npm run umc:link-vscode
```

Then **Developer: Reload Window**.

| Feature | How |
|---------|-----|
| Syntax highlighting | HTML / CSS / JS per section |
| Emmet | Works in `html` / `preview` blocks |
| Autocomplete | SlateHTML tags, attrs, hooks, APIs, sibling `.umc` tags — sorted **above** generic HTML. Inside `events: { … }`, suggests native keys and published names; `OnClicked` etc. come from that map. |
| Live preview | Title-bar icon, `Ctrl+K V` / `Cmd+K V`, or **UMC: Open Preview to the Side** |

Preview loads `widget.css` + `widget.js` + every `.umc` in the component’s folder (so composed children render). Re-renders as you type. Optional `--- preview ---` controls the demo markup; without it you get `<your-tag></your-tag>` with `attrs` defaults.

Workspace settings used by this repo:

```json
{
  "umc.preview.stylesheets": ["../matrix/discord.css"],
  "html.customData": ["./slatehtml.html-data.json"],
  "css.customData": ["./slatehtml.css-data.json"]
}
```

## Library API

```js
import { enhance, enhanceTree, injectStyles, boot, start } from "slatehtml";

enhance(el);        // apply attrs on one element
enhanceTree(root);  // walk a subtree
injectStyles();     // ensure stylesheet is in <head>
boot();             // enhance document + observe mutations
start();            // same as boot (alias for controlled init)
```

## Demos

**Layout gallery** (no Vite — all built-in tags). See [Layout & positioning](./docs/layout.md) for a guided tour of each section:

```bash
npm run demo
```

**Matrix client** (sibling app at `~/dev/matrix`):

```bash
cd ../matrix && npm install && npm run dev
```

Uses [`matrix-js-sdk`](https://github.com/matrix-org/matrix-js-sdk) with `slatehtml` + `slatehtml-ui`.

## Package layout

| Path | Role |
|------|------|
| `widget.css` / `widget.js` | Layout engine |
| `index.js` / `inject-styles.js` | Default entry |
| `umc/` | `.umc` runtime + Vite plugin |
| `packages/slatehtml-ui/` | Reusable UI widgets |
| `editors/vscode-umc/` | Language extension |
| `test/` | Parser, preview, layout, reactivity tests |
| `slatehtml.html-data.json` / `slatehtml.css-data.json` | Editor custom data |

## License

MIT
