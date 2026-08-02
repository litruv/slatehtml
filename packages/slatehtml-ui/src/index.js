/**
 * Register all slatehtml-ui widgets.
 *
 *   import "slatehtml";
 *   import "slatehtml-ui";
 *
 * Dev / Vite: loads every `.umc` under src (and input/).
 * One widget failing to compile/load must not blank the whole kit.
 * Definitions are deferred and flushed together so upgrades don't
 * cascade into dozens of layout passes on first paint / reload.
 *
 * Publish: `npm run build` compiles this entry into `dist/index.js`.
 *
 * Tree-shake one control instead:
 *
 *   import "slatehtml-ui/button";
 *   import "slatehtml-ui/input/select";
 */

import { deferCustomElementDefines } from "slatehtml/umc";

const modules = import.meta.glob(["./*.umc", "./input/*.umc"]);

await deferCustomElementDefines(async () => {
  await Promise.all(
    Object.entries(modules).map(async ([path, load]) => {
      try {
        await load();
      } catch (err) {
        console.error(`[slatehtml-ui] failed to load ${path}`, err);
      }
    })
  );
});
