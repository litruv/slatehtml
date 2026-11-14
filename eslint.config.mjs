import js from "@eslint/js";

// Globals the recommended rules need: browser code (widget.js, demo/, preview-bridge.js)
// and node code (test/, umc/, editors/, vite configs).
const globals = {
  acquireVsCodeApi: "readonly",
  cancelAnimationFrame: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  customElements: "readonly",
  CustomEvent: "readonly",
  DOMParser: "readonly",
  document: "readonly",
  Element: "readonly",
  fetch: "readonly",
  getComputedStyle: "readonly",
  HashChangeEvent: "readonly",
  HTMLElement: "readonly",
  KeyboardEvent: "readonly",
  localStorage: "readonly",
  location: "readonly",
  MouseEvent: "readonly",
  MutationObserver: "readonly",
  navigator: "readonly",
  Node: "readonly",
  performance: "readonly",
  requestAnimationFrame: "readonly",
  ResizeObserver: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  window: "readonly",
  // node
  __dirname: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
};

export default [
  { ignores: ["demo/dist/", "demo/demo/dist/", "docs/", "packages/slatehtml-ui/dist/", "editor/dist/"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: { globals },
    // `_` names are intentional omit-from-rest placeholders (demo/main.js:595).
    rules: { "no-unused-vars": ["error", { varsIgnorePattern: "^_" }] },
  },
];
