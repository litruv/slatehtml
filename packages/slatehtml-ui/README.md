# slatehtml-ui

Reusable UI widgets for **slatehtml**, typography, buttons, dropdowns, pickers, media, and more. Custom elements built as `.umc` UserWidgets.

## Install

```bash
npm install slatehtml slatehtml-ui
```

Your Vite app needs the UMC plugin (for your own `.umc` files, and for tree-shaking individual UI widgets from source):

```js
import { defineConfig } from "vite";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { umc } from "slatehtml/umc/vite";

const require = createRequire(import.meta.url);
const uiSrc = join(dirname(require.resolve("slatehtml-ui/package.json")), "src");

export default defineConfig({
  plugins: [umc({ roots: [uiSrc] })],
});
```

`roots` lets auto-import resolve `<slate-button>` (etc.) from this package when composing your own `.umc` files.

## Usage

```js
import "slatehtml";
import "slatehtml-ui"; // one prebuilt bundle, registers every widget
```

```html
<verticalbox gap="8" padding="16">
  <slate-text kind="title" text="SlateHTML"></slate-text>
  <slate-button text="OK"></slate-button>
</verticalbox>
```

Tree-shake a single control (still goes through the app Vite `umc()` plugin):

```js
import "slatehtml";
import "slatehtml-ui/text";
import "slatehtml-ui/button";
```

## Package layout

| Path | Role |
|------|------|
| `src/input/*.umc` | Form controls (button, select, checkbox, …) |
| `src/*.umc` | Other widgets (text, pickers, media, …) |
| `src/index.js` | Glob barrel, `import.meta.glob(["./*.umc", "./input/*.umc"])` |
| `dist/index.js` | Built ESM, all widgets compiled into one file |

```bash
npm run build        # from this package
npm run build:ui     # from the slatehtml repo root
```

`prepublishOnly` runs the build so npm publishes `dist/`. Dev (`vite` / `import` with the `development` condition) resolves `"."` to the glob barrel so you don't need a prior build while iterating.
