import { configure } from "slatehtml";

const STORAGE_KEY = "slatehtml-docs-options";

const DEFAULTS = {
  theme: "mocha",
  dragScroll: true,
};

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      theme: ["mocha", "latte", "system"].includes(raw.theme)
        ? raw.theme
        : DEFAULTS.theme,
      dragScroll:
        typeof raw.dragScroll === "boolean" ? raw.dragScroll : DEFAULTS.dragScroll,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeStored(opts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
}

function resolveTheme(pref) {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "latte"
      : "mocha";
  }
  return pref;
}

function applyTheme(pref) {
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme === "latte" ? "light" : "dark";
}

function applyDragScroll(enabled) {
  configure({ dragScroll: Boolean(enabled) });
}

/** Apply stored options before UI mounts (call once from main). */
export function initDocsOptions() {
  const opts = readStored();
  applyTheme(opts.theme);
  applyDragScroll(opts.dragScroll);

  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onScheme = () => {
    if (readStored().theme === "system") applyTheme("system");
  };
  mq.addEventListener?.("change", onScheme);

  return opts;
}

/** Wire sidebar Options controls. */
export function wireDocsOptions(root = document) {
  const themeEl = root.querySelector("[data-docs-opt='theme']");
  const dragEl = root.querySelector("[data-docs-opt='drag-scroll']");
  if (!themeEl && !dragEl) return;

  let opts = readStored();

  if (themeEl) {
    themeEl.value = opts.theme;
    themeEl.addEventListener("change", () => {
      opts = { ...opts, theme: themeEl.value };
      writeStored(opts);
      applyTheme(opts.theme);
    });
  }

  if (dragEl) {
    dragEl.toggleAttribute("checked", opts.dragScroll);
    dragEl.addEventListener("changed", (e) => {
      const checked = Boolean(e.detail?.checked ?? dragEl.hasAttribute("checked"));
      opts = { ...opts, dragScroll: checked };
      writeStored(opts);
      applyDragScroll(checked);
    });
  }
}
