# Component playground

The **component playground** is the live **UMC preview** in VS Code / Cursor. Open any `.umc` file and render your UserWidget in a resizable stage while you edit, no Vite dev server required.

This is the counterpart to the [layout gallery](./layout.md) (`npm run demo` / root `index.html`), which demos **built-in panel tags**. The component playground is for **your `.umc` widgets**.

## Open the playground

1. Install the extension (once):

   ```bash
   npm run umc:link-vscode
   ```

   Then **Developer: Reload Window**.

2. Open a `.umc` file under `example/widgets/` (or your own project).

3. Launch preview:

   | Action | How |
   |--------|-----|
   | Title bar | Click the preview icon on the editor tab |
   | Keyboard | `Ctrl+K V` / `Cmd+K V` |
   | Command palette | **UMC: Open Preview to the Side** |

The preview opens beside your source and **re-renders as you type** (250 ms debounce). Editing a **sibling** `.umc` in the same folder refreshes open previews too.

### Inspect hover (editor ↔ preview)

When the preview is open and the file has a `--- preview ---` section:

| Hover in… | Highlights in… |
|-----------|----------------|
| **Preview** stage | Matching **source line** in the editor (whole-line highlight) |
| **Preview** markup (`--- preview ---`) | Matching **element(s)** in the stage (blue outline) |
| **Ctrl/Cmd+click** a widget in the stage | Opens that component's `.umc` file at its `--- html ---` section |
| **Ctrl/Cmd+click** preview markup (panel tags) | Opens the current file at that preview line |

Each opening tag in the preview section gets a `data-umc-line` attribute tied to its line in the `.umc` file. Hover only links markup inside `--- preview ---`, not `--- html ---` (that template is compiled into the widget, not shown directly in the stage).

## What you see

```
┌─────────────────────────────────────────────────────────┐
│ <slate-button> · preview section          420 × 280  bg│
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────┐    │
│   │  Your component (from --- preview ---)        │    │  ← resizable stage
│   │                                               │    │
│   └─────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Toolbar**

- **Tag name**, e.g. `<user-message>` from `defineUmc({ tag: … })`
- **Source**, `preview section` if you have `--- preview ---`, otherwise `default attrs`
- **Size**, live width × height of the stage (updates when you resize)
- **bg**, stage background color picker (persisted in `localStorage`)

**Stage**

- Drag the corner to **resize**, useful for testing `fill`, scroll areas, and responsive layout.
- Runtime errors appear in a red bar below the stage instead of failing silently.

## Control the demo markup

### With `--- preview ---`

The preview section is **editor-only**, Vite strips it from production builds. Put whatever markup you need to exercise the widget:

```umc
--- preview ---
<verticalbox gap="10" padding="12" style="height: 360px">
  <slate-button text="Primary"></slate-button>
  <slate-button text="Disabled" disabled></slate-button>
  <user-message
    author="Nova"
    color="#5865f2"
    time="9:14 PM"
    text="Hello from the playground"
  ></user-message>
</verticalbox>
```

Use panel attrs for layout (`gap`, `padding`, `fill`). Give scrollable widgets an explicit stage height so `scrollbox` can scroll.

### Without `--- preview ---`

The playground renders a bare host with **default attrs**:

```html
<your-tag></your-tag>
```

Good for quick checks; add a preview section when you need props, siblings, or a sized container.

## Sibling components load automatically

The preview compiles and registers **every `.umc` in the same folder** as the file you're editing. Composed children render without extra imports:

```
widgets/message/
  user-message.umc      ← you edit this
  message-meta.umc      ← auto-registered
  message-text.umc      ← auto-registered
  user-display-picture.umc
```

Cross-folder children (e.g. `slate-button` in `widgets/lib/`) are **not** auto-loaded. Options:

- Import them in `umc.preview.imports` (see below), or
- Open a parent widget whose folder contains the dependency graph, or
- Run `cd example && npm run dev` for the full app.

## Workspace settings

Add to `.vscode/settings.json` (this repo already does):

```json
{
  "umc.preview.stylesheets": ["example/discord.css"],
  "umc.preview.imports": [],
  "html.customData": ["./slatehtml.html-data.json"],
  "css.customData": ["./slatehtml.css-data.json"]
}
```

| Setting | Purpose |
|---------|---------|
| `umc.preview.stylesheets` | Extra CSS (app theme, `kind` chrome). Resolved from workspace root, then the component folder. |
| `umc.preview.imports` | JS modules loaded before components, plain `.js` widgets not in a `.umc` folder. |

Paths are relative to the workspace or the `.umc` file's directory.

## What the playground loads

For each preview refresh, the builder (`editors/vscode-umc/preview.js`):

1. Inlines `widget.css` (layout engine)
2. Loads `widget.js` (attribute wiring)
3. Loads `umc/runtime.js` and injects `defineUmc`
4. Compiles the focused `.umc` plus siblings and referenced widgets
5. Inlines component `--- style ---` blocks
6. Renders the `--- preview ---` body into `#umc-stage`

Heavy npm packages may be stubbed in preview (e.g. `matrix-js-sdk`). For real Matrix auth or full SDK behavior, use `npm run dev` or the Electron app.

## Good preview habits

| Goal | Tip |
|------|-----|
| Test scroll | Wrap in `verticalbox` / `scrollbox` with `style="height: …"` on the host |
| Test dark UI | Set stage **bg** to your app background |
| Test composition | Keep related `.umc` files in one folder |
| Test app theme | Point `umc.preview.stylesheets` at your global CSS |
| Test interactions | Open devtools on the webview; listen for `clicked`, etc. |
| Link preview ↔ source | Hover preview elements or preview-section lines (see **Inspect hover** below) |
| Test fill / stretch | Resize the stage corner |

## Layout gallery vs component playground

| | Layout gallery | Component playground |
|--|----------------|-------------------|
| **What** | Built-in tags (`verticalbox`, `canvaspanel`, …) | Your `.umc` UserWidgets |
| **Where** | Browser, `npm run demo` → `index.html` | VS Code webview |
| **Build** | None | None (preview compiles in memory) |
| **Guide** | [Layout & positioning](./layout.md) | This page |

Use the layout gallery to learn **panel attributes and canvas anchors**. Use the component playground to iterate on **widgets** with realistic preview markup.

## Try it now

```bash
npm run umc:link-vscode
```

Open `example/widgets/lib/slate-button.umc` → `Ctrl+K V`. Edit `text` in the preview section or toggle `disabled` on a button, the stage updates immediately.

## Next steps

- [Your first widget](./tutorials/01-first-widget.md), build a component and use the playground from step one
- [UMC components](./umc.md), full reference
- [VS Code extension README](../editors/vscode-umc/README.md), autocomplete and section syntax
