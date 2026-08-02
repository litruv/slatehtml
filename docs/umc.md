# UMC components

**UMC** (UMG Markup Component) is SlateHTML's single-file widget format, like Unreal's UserWidget, but plain HTML + CSS + JS in one `.umc` file. Vite compiles it to a custom element with lifecycle hooks, declarative binding, and a content API.

## File structure

A `.umc` file has named sections:

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

| Section | Aliases | Purpose |
|---------|---------|---------|
| `html` | `template` | Markup stamped into the host (light DOM) |
| `style` | `css` | Component CSS (inlined at build time) |
| `script` | `js` | `defineUmc({ … })`, `defineUmc` is injected; no import |
| `preview` | `demo` | Editor-only demo markup; **stripped from production builds** |

Link external files with a one-line `@` reference:

```umc
--- html ---
@ ./face.html
--- style ---
@ ./face.css
--- script ---
@ ./face.js
```

Subclass a builtin with a file-level `@parent` (alias `@extends`):

```umc
@parent textblock
--- style ---
self[kind="title"] { font-size: 30px; font-weight: 700; }
--- script ---
export default defineUmc({
  tag: "slate-text",
  attrs: { text: "", kind: "body" },
});
```

Also accepted: `@parent <textblock>`. The Vite loader injects `extends` into `defineUmc`, you don't repeat it in the script. Import `slatehtml` first so `umc-*` builtins are registered. Extended hosts skip the `display: contents` shell and keep leaf behavior (`text` → textContent).

## `defineUmc` basics

```js
export default defineUmc({
  tag: "my-widget",           // custom element name (must contain a hyphen)
  attrs: { label: "Default" }, // observed attributes + defaults
  events: { click: "clicked" }, // optional: native DOM → public events
  // extends: "textblock",    // usually set via @parent instead
  // lifecycle hooks (PascalCase or camelCase)…
});
```

Importing the `.umc` module registers `<my-widget>`:

```js
import "./widgets/my-widget.umc";
```

```html
<my-widget label="Hello"></my-widget>
```

## Layout in `.umc` HTML

Write **bare** panel tag names in the `html` section. The Vite loader rewrites them to `umc-verticalbox`, `umc-textblock`, etc.

Put layout on attributes, same rules as [Layout & positioning](./layout.md):

```umc
--- html ---
<verticalbox gap="8" padding="12" fill>
  <textblock data-umc="title" kind="label"></textblock>
  <border kind="panel" fill padding="10">
    <textblock data-umc="body"></textblock>
  </border>
</verticalbox>
```

In `--- style ---`, use `self` for the host tag. Hosts default to `display: contents` so the stamped panel is the real layout node. Style **appearance** in CSS; don't restate flex, margins, or fill sizing there.

The Vite plugin **fails the build** if widget CSS uses flex/grid layout or CSS positioning (`position`, `top`/`left`/…, `z-index`, `align-items`, …). Put `/* umc-layout-ok */` on the same declaration line only for intentional chrome exceptions (e.g. `slate-button`, `popup-anchor`).

Widgets that **are** the painted control (e.g. `slate-button`) override `display` on `self`.

## Declarative bind (`data-umc`)

Map host attributes onto child nodes:

```html
<textblock data-umc="title"></textblock>
```

With `attrs: { title: "Slate" }`, this copies `title` → child's `text` attribute. Override the target:

```html
<image data-umc="avatar" data-umc-prop="brush"></image>
```

Binding stops at nested custom-element boundaries, parents won't clobber a child's internal `data-umc` nodes.

## Content region (`data-content`) & named slots

Mark where dynamic children go:

```html
<verticalbox data-content gap="8"></verticalbox>
```

```js
el.add({ tag: "textblock", text: "hi" });
el.add(existingNode, "plain text", [a, b]);
el.set(/* replace all */);
el.clear();
el.namedSlot("footer"); // Named Slot element (or default content target)
```

`add` / `set` accept DOM nodes, strings, arrays, or `{ tag, …attrs }` specs. See [Tutorial: dynamic lists](./tutorials/04-dynamic-lists.md).

### Named slots (Unreal-style)

**Parent** declares injection points with `<namedslot>`. **Children** of an instance are only `<slot-*>` fillers, nothing else:

```umc
@parent border
--- html ---
<verticalbox gap="10" padding="14">
  <slate-text kind="label" data-umc="title"></slate-text>
  <namedslot></namedslot>
  <namedslot name="footer"></namedslot>
</verticalbox>
```

```html
<slot-default>
  <slate-text kind="body" text="Default slot"></slate-text>
</slot-default>
<slot-footer>
  <slate-button text="Equip"></slate-button>
</slot-footer>
```

| Side | Markup | Role |
|------|--------|------|
| Parent | `<namedslot>` / `[data-content]` | Default slot (`el.add` / `el.set`) |
| Parent | `<namedslot name="footer">` | Named slot |
| Child | `<slot-default>…` | → default slot (wrapper discarded) |
| Child | `<slot-footer>…` | → `footer` slot (wrapper discarded) |

`slot-*` tags are authoring sugar, not auto-imported as widgets. Bare children still fall through to the default slot as a convenience.

For live lists (room rows, messages), prefer **`syncKeyed`** over `el.set()`, it patches nodes in place instead of tearing down the whole tree on every update.

## Reactivity

Import from `slatehtml/umc`:

```js
import { syncKeyed, applySpec, cell, watchSource, watchSize, scheduleFrame } from "slatehtml/umc";
```

| API | Use for |
|-----|---------|
| `syncKeyed(parent, items, { key, nodeKey, create, update })` | Dynamic lists that update often (no flicker) |
| `applySpec(node, { tag, …attrs })` | Patch attrs on an existing element (same rules as `create`) |
| `api.watch(subscribe, fn)` | External sources (`onRoomsChanged`, `onSession`), invokes `fn` with current snapshot on subscribe; auto-disposes on `Destroyed` |
| `api.watchSize(fn)` | Layout box size → `fn({ width, height })` (ResizeObserver, rAF-coalesced); auto-disposes |
| `watchSize(el, fn)` | Same observer without a widget host (returns unsubscribe) |
| `api.schedule(key, fn)` | Coalesce rapid updates to one rAF paint |
| `api.dispose(fn)` | Manual teardown registered with the widget |
| `cell(initial)` | Small local mutable state with `.subscribe()` |

```js
Construct(el, api) {
  api.watchSize(({ width, height }) => {
    api.schedule("paint", () => paint(el, width, height));
  });
  import("./session.js").then(({ onRoomsChanged }) => {
    api.watch(onRoomsChanged, () => api.schedule("paint", () => paint(el)));
  });
},
```

**Panels** (boxes, `border`, `canvaspanel`, `scrollbox`, …) also emit bubbling `sizechanged` with `{ width, height }` whenever their laid-out box changes, useful from plain HTML:

```js
panel.addEventListener("sizechanged", (e) => {
  console.log(e.detail.width, e.detail.height);
});
```

Attrs still flow through `SynchronizeProperties`; reactivity helpers cover **size**, **external** churn (Matrix sync, timers, stores), and **list** patching.

## Lifecycle

Unreal UserWidget-style hooks:

| Hook | When |
|------|------|
| `Initialize` / `OnInitialized` | Once, first attach |
| `PreConstruct` | Each attach, before template stamp |
| *(stamp + `data-umc` bind)* | Built-in |
| `Construct` | Each attach, after stamp/bind |
| `SynchronizeProperties` | After Construct, and when observed attrs change |
| `Destruct` / `Destroyed` | Detach |
| `Tick(el, api, dt)` | Every frame while attached (`dt` in seconds) |

Example:

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
    // animation frame
  },
  Destroyed() {
    console.log("down");
  },
});
```

Use `SynchronizeProperties` to push host attrs down to child components:

```js
SynchronizeProperties(el, { attr }) {
  el.querySelector("message-meta")?.setAttribute("author", attr("author", ""));
}
```

Reference: `example/widgets/message/user-message.umc`, `example/widgets/matrix/matrix-shell.umc`.

## Events

Map native DOM events to a public widget API:

```js
export default defineUmc({
  tag: "slate-button",
  attrs: { text: "OK" },
  events: {
    click: "clicked",
    dblclick: "doubleclicked",
  },
  OnClicked(el, api, nativeEvent) {
    console.log(api.attr("text"));
  },
});
```

Listen from outside:

```js
const btn = document.querySelector("slate-button");
btn.addEventListener("clicked", (e) => console.log(e.detail));
```

Fire custom events:

```js
el.emit("selected", { id: 3 });
// or api.emit("selected", { id: 3 })
```

Full reference button: `example/widgets/lib/slate-button.umc`.

**Parent ↔ child:** children bubble custom events; parents update host attrs and push state back in `SynchronizeProperties`:

```js
Construct(el) {
  el.addEventListener("roomchanged", (e) => {
    el.setAttribute("room", e.detail.roomId);
  });
},
SynchronizeProperties(el, { attr }) {
  el.querySelector("matrix-room-list")?.setAttribute("active", attr("room", ""));
}
```

## Hook API (`api`)

Passed to lifecycle hooks:

| Method | Does |
|--------|------|
| `attr(name, fallback?)` | Read one host attr / default |
| `attrs(list?)` | Read many |
| `bind(extra?)` | Refresh `data-umc` bindings |
| `stamp(html?)` | Replace host markup |
| `sync(extra?)` | Re-stamp + bind |
| `emit(type, detail?)` | Bubble a `CustomEvent` from the host |

## Composition & auto-import

No component registry. Import a root widget; the Vite loader **auto-imports** custom tags found in the `html` section:

```umc
--- html ---
<horizontalbox>
  <user-display-picture></user-display-picture>
  <message-meta></message-meta>
</horizontalbox>

--- script ---
export default defineUmc({ tag: "user-message", … });
```

Resolution order for each tag:

1. `./tag.umc` or `./tag.js` next to the file
2. Search under the nearest ancestor folder named `widgets/`
3. Optional extra roots via `umc({ roots: […] })` in Vite config

Built-in SlateHTML tags and the host's own tag are skipped. Explicit imports still work.

Suggested folder layout (from the Matrix example):

```
widgets/
  app/       discord-app · title-bar
  matrix/    matrix-shell · matrix-scope · matrix-room-list · matrix-chat-roll
  message/   user-message · message-meta · message-text
  lib/       slate-button · popup-anchor · scope-picker-option · slate-avatar-tile
```

### Extract repeating UI

If the same row, tile, or face appears in HTML **and** in `el.set({ tag: … })`
factories, or is copy-pasted between widgets, **split it into its own `.umc`**.

```
slate-scope-picker     ← shell (open/close, placement flip)
  scope-picker-option  ← one menu row
    slate-avatar-tile  ← shaped avatar (shared by face + options + room rows)
```

- Parents pass attrs; children implement look in their own `--- style ---`.
- Layout stays on panel attrs ([Layout guide](./layout.md)), not duplicated CSS.
- Each child gets a `--- preview ---` for isolated editor preview.
- `{ tag: "scope-picker-option" }` in script is auto-imported like HTML tags.

## Host layout

Custom elements default to `display: contents`. Layout attributes on the **host** are forwarded to the stamped root:

```html
<user-message author="Nova" fill padding="4 16"></user-message>
```

Works on `canvaspanel` too, place widgets with `anchors` on the host tag.

Widgets that paint their own box (`slate-button`) keep attrs on the host.

## Vite setup

```js
import { defineConfig } from "vite";
import { umc, singleFile } from "slatehtml/umc/vite";

export default defineConfig({
  plugins: [
    umc(),        // .umc → JS module
    singleFile(), // optional: one self-contained index.html
  ],
});
```

```js
// main.js
import "slatehtml/css";
import "slatehtml/slate.js";
import "./widgets/app/discord-app.umc";
```

## Editor preview

The [VS Code extension](../editors/vscode-umc/README.md) is the **component playground**, see [Component playground](./component-playground.md) for the full guide.

| Action | How |
|--------|-----|
| Title bar | Click the preview icon on the editor tab |
| Keyboard | `Ctrl+K V` / `Cmd+K V` |
| Command palette | **UMC: Open Preview to the Side** |

The webview loads the workspace's `widget.css` + `widget.js` (the layout engine) and `umc/runtime.js`, then registers every `.umc` in the component's folder, so composed children like `<message-meta>` inside `<user-message>` render too. It re-renders as you type (250 ms debounce), including when you edit a sibling component.

Without a `--- preview ---` section it renders a bare `<your-tag></your-tag>`, so `attrs` defaults are what you see. With one, you control the markup:

```
--- preview ---
<verticalbox gap="8" padding="8">
  <user-message author="Nova" time="9:14 PM" text="Hello"></user-message>
</verticalbox>
```

## Runtime imports (plain JS)

Outside `.umc` scripts:

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

Inside `.umc` scripts, **do not** import `defineUmc`, the loader injects it.

## Tutorials

- [Your first widget](./tutorials/01-first-widget.md)
- [Composing components](./tutorials/02-composing-components.md)
- [Events & interaction](./tutorials/03-events-and-interaction.md)
- [Dynamic lists](./tutorials/04-dynamic-lists.md)
