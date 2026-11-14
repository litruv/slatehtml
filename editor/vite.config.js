import { defineConfig } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { umc } from "../umc/vite.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const uiSrc = join(repoRoot, "packages", "slatehtml-ui", "src");

export default defineConfig({
  root: here,
  // Electron loads the build over file://, so assets must be relative.
  base: "./",
  plugins: [umc({ roots: [uiSrc], runtime: "slatehtml/umc" })],
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
  // The page imports slatehtml as a bare specifier.
  // `slatehtml-ui` must resolve to the source barrel so the umc plugin compiles
  // the widgets here instead of reading the prebuilt dist.
  resolve: {
    alias: [
      { find: "slatehtml-ui", replacement: join(uiSrc, "index.js") },
      { find: "slatehtml", replacement: repoRoot },
    ],
  },
  server: { fs: { allow: [repoRoot] } },
});
