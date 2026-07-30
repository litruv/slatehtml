# SlateHTML documentation

SlateHTML brings Unreal UMG-style layout panels and UserWidgets to the web. These guides explain how to structure UI with panel tags, build reusable `.umc` components, and learn from the live layout gallery.

## Start here

| Guide | What you'll learn |
|-------|-------------------|
| [Layout & positioning](./layout.md) | Panel tags, `fill`, overlay alignment, canvas anchors — walk through the layout gallery (`index.html`) |
| [Component playground](./component-playground.md) | Live `.umc` preview in VS Code — `--- preview ---`, resizable stage, sibling widgets |
| [UMC components](./umc.md) | `.umc` sections, lifecycle, composition, child extraction |
| [Tutorials](./tutorials/README.md) | Step-by-step projects from your first widget to dynamic lists |

## Quick commands

```bash
# Layout gallery (no build step) — built-in panel tags
npm run demo

# Component playground — open any .umc in VS Code, then Ctrl+K V
npm run umc:link-vscode
# → open http://localhost:3000 (or the port serve prints)

# Discord example (Vite + .umc)
cd example && npm install && npm run dev

# VS Code / Cursor extension for .umc
npm run umc:link-vscode
```

## How the pieces fit together

```
┌─────────────────────────────────────────────────────────────┐
│  widget.css + widget.js                                     │
│  Panel tags, attributes → CSS. The layout engine.           │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   index.html          plain HTML         .umc files
   (layout gallery)    (no bundler)       (Vite plugin)
         │                  │                  │
         │                  │                  └── VS Code preview (component playground)
         └──────────────────┴──────────────────┘
                            │
                     Light DOM in the browser
```

- **Layout** lives in HTML panel tags and their attributes (`padding`, `fill`, `anchors`, …). See [Layout & positioning](./layout.md).
- **Look** (colors, typography, chrome) uses `kind` selectors and `--widget-*` CSS variables. Root [`index.html`](../index.html) is the reference theme.
- **Components** are `.umc` files compiled by Vite into custom elements with lifecycle hooks. See [UMC components](./umc.md).

## Editor support

The [VS Code / Cursor extension](../editors/vscode-umc/README.md) adds syntax highlighting, autocomplete, and a live preview for `.umc` files. Workspace settings in this repo load `slatehtml.html-data.json` and `slatehtml.css-data.json` for attribute hints.

## Package reference

The root [README](../README.md) is the install and API reference (npm exports, `defineUmc`, Vite plugin options, Capacitor builds). These docs focus on *how to use* SlateHTML day to day.
