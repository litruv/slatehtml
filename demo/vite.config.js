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
    // slatehtml-ui barrel uses top-level await.
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      // Subpaths before the package root alias (folder alias breaks exports).
      {
        find: "slatehtml-ui/configure",
        replacement: join(uiSrc, "configure.js"),
      },
      {
        find: "slatehtml-ui/icons/fontawesome",
        replacement: join(uiSrc, "fontawesome-icons.js"),
      },
      {
        find: "slatehtml-ui/icons/lucide",
        replacement: join(uiSrc, "lucide-icons.js"),
      },
      {
        find: "slatehtml-ui/icons",
        replacement: join(uiSrc, "lucide-icons.js"),
      },
      { find: "slatehtml", replacement: repoRoot },
      {
        find: "slatehtml-ui",
        replacement: join(repoRoot, "packages/slatehtml-ui"),
      },
    ],
  },
});
