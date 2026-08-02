import { defineConfig } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { umc } from "slatehtml/umc/vite";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "src");

/**
 * Library build: compile every `.umc` (via the glob barrel) into one ESM file.
 * Runtime stays external (`slatehtml/umc`) so apps share one copy with slatehtml.
 */
export default defineConfig({
  plugins: [
    umc({
      roots: [src],
      runtime: "slatehtml/umc",
    }),
  ],
  build: {
    lib: {
      entry: join(src, "index.js"),
      formats: ["es"],
      fileName: "index",
    },
    outDir: join(here, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "lucide",
        "slatehtml",
        "slatehtml/umc",
        /^slatehtml\//,
      ],
    },
  },
});
