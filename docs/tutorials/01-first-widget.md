# Tutorial 1: Your first widget

Build a `title-bar` UserWidget, a small horizontal strip with a title and status label. You'll learn the `.umc` file format, declarative `data-umc` binding, and the editor preview.

**Prerequisites:** [Layout basics](../layout.md), Vite project with `slatehtml` (use `example/` or create your own).

## What you're building

```
┌─────────────────────────────────────────────┐
│  SlateHTML                    ● Online      │
└─────────────────────────────────────────────┘
```

## Step 1: Create the file

Create `widgets/lib/title-bar.umc` (or any path under a `widgets/` folder):

```umc
--- html ---
<horizontalbox valign="center" padding="0 14" height="36" gap="10">
  <textblock data-umc="title" kind="label"></textblock>
  <spacer></spacer>
  <textblock data-umc="status" kind="mono"></textblock>
</horizontalbox>

--- style ---
self textblock[kind="mono"] {
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  opacity: 0.7;
}

--- script ---
export default defineUmc({
  tag: "title-bar",
  attrs: {
    title: "Slate",
    status: "Online",
  },
});

--- preview ---
<title-bar title="SlateHTML" status="Online"></title-bar>
```

### What's going on

- **`--- html ---`**, panel markup stamped into the custom element. Layout is all attributes: `horizontalbox`, `padding`, `gap`, `spacer`.
- **`data-umc="title"`**, copies the host's `title` attribute onto this `textblock`'s `text`.
- **`--- style ---`**, `self` means the host tag (`title-bar`). Only appearance here, no flex or sizing.
- **`--- script ---`**, `defineUmc` is injected by the Vite loader; don't import it.
- **`attrs`**, declares observed attributes and their defaults. Changing `title` or `status` on `<title-bar>` updates bindings.
- **`--- preview ---`**, editor-only markup for the VS Code preview.

## Step 2: Register the widget

In your app entry (e.g. `example/main.js`):

```js
import "slatehtml/css";
import "slatehtml/slate.js";
import "./widgets/lib/title-bar.umc";
```

Use it in HTML or another `.umc`:

```html
<title-bar title="My App" status="Ready"></title-bar>
```

## Step 3: Open the preview

1. Run `npm run umc:link-vscode` from the repo root (once).
2. Open `title-bar.umc` in VS Code / Cursor.
3. Click the preview icon or press `Ctrl+K V`.

You should see your title bar with the preview markup. Edit `title` in the preview section, the preview updates as you type.

## Step 4: Add theme CSS (optional)

If your app has global tokens (like `example/discord.css`), add to workspace settings:

```json
"umc.preview.stylesheets": ["example/discord.css"]
```

Or style `kind="label"` in your app CSS the way [`index.html`](../../index.html) does.

## Step 5: React to attribute changes

Add a hook when you need logic beyond `data-umc`:

```js
export default defineUmc({
  tag: "title-bar",
  attrs: { title: "Slate", status: "Online" },

  SynchronizeProperties(el, { attr }) {
    const status = attr("status", "");
    el.toggleAttribute("data-offline", status.toLowerCase() === "offline");
  },
});
```

```css
self[data-offline] textblock[kind="mono"] {
  color: #c44;
}
```

`SynchronizeProperties` runs after attach and whenever `title` or `status` changes.

## Checkpoint

You should understand:

- [ ] The four `.umc` sections and what each does
- [ ] Layout on panel attributes, look in `--- style ---`
- [ ] `data-umc` for simple host → child binding
- [ ] `attrs` defaults and `SynchronizeProperties` for logic

## Next

[Composing components →](./02-composing-components.md), nest widgets and push state to children.

## Reference

- [UMC components](../umc.md)
- [Layout & positioning](../layout.md)
- Real example: search the repo for `title-bar` in `example/widgets/`
