import { defineConfig } from "vite";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { umc } from "../umc/vite.js";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const uiSrc = join(repoRoot, "packages/slatehtml-ui/src");

const pagesBase =
  process.env.GITHUB_PAGES === "true" ? "/slatehtml/" : "/";

export default defineConfig({
  root: here,
  base: pagesBase,
  plugins: [umc({ roots: [uiSrc] })],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      slatehtml: repoRoot,
      "slatehtml-ui": join(repoRoot, "packages/slatehtml-ui"),
    },
  },
});
