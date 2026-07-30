# SlateHTML `.umc` for VS Code / Cursor

Priority autocomplete, syntax highlighting, and a live preview for `.umc` components.

## Autocomplete

SlateHTML suggestions sort before generic HTML/CSS/JavaScript suggestions:

- `html` / `preview`: built-in widget tags, sibling `.umc` tags (with their **published events** in the detail text), widget attrs, and attr values
- `style`: widget selectors and `--widget-*` variables
- `script`: lifecycle hooks, definition fields, and widget APIs (`add`, `set`, `clear`, `attr`, `emit`, etc.)
- **`events: { … }` (context-sensitive):** native DOM keys (`click`, `mousedown`, …) insert as `click: "clicked",`; values suggest the recommended public name
- **`On…` hooks:** derived from this file's `events` map (e.g. `clicked` → `OnClicked`)
- **`emit("` / `addEventListener("`:** published event names from this component
- section headers: `html`, `style`, `script`, and `preview`

Sibling components and their declared `attrs` / `events` are discovered automatically, including unsaved open files.

## Sections

```
--- html ---
--- style ---
--- script ---
--- preview ---
```

`html`, `style`, and `script` embed the HTML, CSS, and JavaScript grammars. `@ ./file` links are highlighted as paths.

`preview` is editor-only markup: it is what the preview renders, and the Vite loader ignores it.

## Preview

Open a `.umc` file, then:

- click the preview icon in the editor title bar, or
- press `Ctrl+K V` (`Cmd+K V`), or
- run **UMC: Open Preview to the Side**.

The webview loads the workspace's `widget.css` + `widget.js` (the layout engine) and `umc/runtime.js`, then registers every `.umc` in the component's folder — so composed children like `<message-meta>` inside `<user-message>` render too. It re-renders as you type (250 ms debounce), including when you edit a sibling component.

Without a `--- preview ---` section it renders a bare `<your-tag></your-tag>`, so `attrs` defaults are what you see. With one, you control the markup:

### Inspect hover

With the preview open, hover elements in the stage to highlight their source line in `--- preview ---`, or hover a line in that section to outline the matching element(s) in the stage.

**Ctrl/Cmd+click** works in both the preview stage and the editor:

- In the **preview**, click a widget (e.g. `<slate-scope-picker>`) to open its `.umc` at `--- html ---`. Ctrl/Cmd+click bare preview markup (panel tags) opens the current file at that preview line.
- In the **editor**, custom tags in `--- html ---`, `--- preview ---`, and `--- script ---` (`tag: "…"` factories and `querySelector("…")`) are underlined; Ctrl/Cmd+click jumps to the child component's `--- html ---` section.

```
--- preview ---
<verticalbox gap="8" padding="8">
  <user-message author="Nova" time="9:14 PM" text="Hello"></user-message>
</verticalbox>
```

### Settings

| Setting | What it does |
| --- | --- |
| `umc.preview.stylesheets` | Extra CSS to load, resolved against the workspace folder then the component folder (e.g. `example/discord.css` for app theming). |
| `umc.preview.imports` | JS modules to load before the components — use it for widgets defined in plain `.js`. |

Runtime errors from a component appear under the stage instead of failing silently.

## Install

From the repo root:

```bash
npm run umc:link-vscode
```

Then **Developer: Reload Window**.

Uninstall:

```bash
npm run umc:unlink-vscode
```
