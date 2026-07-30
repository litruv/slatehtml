# slatehtml-ui

Reusable UI widgets for **slatehtml** — buttons, dropdowns, pickers, media, and more. Custom elements built as `.umc` UserWidgets.

## Install

```bash
npm install slatehtml slatehtml-ui
```

Your Vite app needs the UMC plugin:

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
import "slatehtml-ui";
```

```html
<verticalbox gap="8" padding="16">
  <slate-button text="Save"></slate-button>
  <slate-icon name="chevron-down" size="16"></slate-icon>
</verticalbox>
```

Tree-shake a single control:

```js
import "slatehtml";
import "slatehtml-ui/button";
```
