/**
 * UMC preview: inspect hover + Ctrl/Cmd+click navigation.
 * Loaded after component scripts; reads config from window.UMC_PREVIEW.
 */
(function umcPreviewBridge() {
  const config = window.UMC_PREVIEW || {};
  const COMPONENTS = config.components || {};
  const FOCUS = config.focus || {};

  const stage = document.getElementById("umc-stage");
  const navHint = document.getElementById("umc-nav-hint");
  const errorEl = document.getElementById("umc-error");
  if (!stage) return;

  let vscode = null;
  try {
    vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
  } catch (err) {
    if (errorEl) errorEl.textContent = String(err?.message || err);
  }

  const tagName = (el) =>
    String(el?.localName ?? "")
      .toLowerCase()
      .replace(/^umc-/, "");

  const isWidgetTag = (tag) => Boolean(tag && COMPONENTS[tag]);

  const findComponent = (target) => {
    let el = target instanceof Element ? target : null;
    while (el && el !== stage) {
      const entry = COMPONENTS[tagName(el)];
      if (entry) return { el, entry };
      el = el.parentElement;
    }
    return null;
  };

  const navChrome = (host) => {
    const face =
      host.querySelector?.(".scope-picker-face") ||
      host.querySelector?.(".picker-face") ||
      host.querySelector?.(".combobox-face") ||
      host.querySelector?.(".slate-button-label")?.closest?.("slate-button");
    if (face) return face;
    try {
      if (getComputedStyle(host).display !== "contents") return host;
    } catch (_) {}
    return host.firstElementChild ?? host;
  };

  const openFile = (file, line) => {
    if (!vscode) {
      if (errorEl) {
        errorEl.textContent = "Navigation needs the VS Code preview webview (acquireVsCodeApi).";
      }
      return;
    }
    vscode.postMessage({
      type: "openComponent",
      file,
      line: Number.isFinite(line) && line > 0 ? line : undefined,
    });
  };

  let navTarget = null;
  let navHost = null;

  const clearNavTarget = () => {
    if (navTarget) {
      navTarget.classList.remove("umc-nav-target");
      navTarget.classList.remove("umc-nav-active");
      navTarget.removeAttribute("title");
      navTarget = null;
    }
    navHost = null;
    if (navHint) navHint.textContent = "Hover widget · Ctrl+click to open source";
  };

  const setModifierMode = (on) => {
    stage.classList.toggle("umc-modifier-open", on);
    if (navTarget) navTarget.classList.toggle("umc-nav-active", on);
  };

  const updateNavTarget = (target) => {
    const hit = findComponent(target);
    if (!hit) {
      if (navHost) clearNavTarget();
      const lineEl = target instanceof Element ? target.closest("[data-umc-line]") : null;
      const line = lineEl ? Number(lineEl.getAttribute("data-umc-line")) : 0;
      if (lineEl && line) {
        if (navTarget !== lineEl) {
          clearNavTarget();
          navTarget = lineEl;
          lineEl.classList.add("umc-nav-target");
          lineEl.setAttribute("title", "Ctrl+click to open preview line");
        }
      } else if (navTarget && !navHost) {
        clearNavTarget();
      }
      return;
    }

    const chrome = navChrome(hit.el);
    if (navTarget === chrome && navHost === hit.el) return;
    clearNavTarget();
    navHost = hit.el;
    navTarget = chrome;
    chrome.classList.add("umc-nav-target");
    const base = String(hit.entry.file).split(/[/\\]/).pop();
    chrome.setAttribute("title", `Ctrl+click to open ${base}`);
    if (navHint) navHint.textContent = `Ctrl+click to open ${base}`;
    if (stage.classList.contains("umc-modifier-open")) {
      chrome.classList.add("umc-nav-active");
    }
  };

  const inspectHovered = new Set();
  const clearInspect = () => {
    for (const el of inspectHovered) el.classList.remove("umc-inspect-hover");
    inspectHovered.clear();
  };

  const highlightLine = (line) => {
    clearInspect();
    if (!line) return;
    const nodes = stage.querySelectorAll('[data-umc-line="' + line + '"]');
    for (const el of nodes) {
      el.classList.add("umc-inspect-hover");
      inspectHovered.add(el);
    }
  };

  const markWidgetHosts = () => {
    for (const tag of Object.keys(COMPONENTS)) {
      for (const el of stage.querySelectorAll(tag)) {
        el.dataset.umcWidget = tag;
      }
      for (const el of stage.querySelectorAll("umc-" + tag)) {
        el.dataset.umcWidget = tag;
      }
    }
  };

  markWidgetHosts();
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(() => markWidgetHosts()).observe(stage, {
      childList: true,
      subtree: true,
    });
  }

  let lastInspectLine = 0;
  stage.addEventListener("mousemove", (e) => {
    const modifier = e.ctrlKey || e.metaKey;
    setModifierMode(modifier);
    updateNavTarget(e.target);

    if (modifier) return;

    const lineEl = e.target.closest("[data-umc-line]");
    const line = lineEl ? Number(lineEl.getAttribute("data-umc-line")) : 0;
    if (!line || line === lastInspectLine) return;
    lastInspectLine = line;
    highlightLine(line);
    vscode?.postMessage({ type: "hover", line });
  });

  stage.addEventListener("mouseleave", () => {
    lastInspectLine = 0;
    clearInspect();
    clearNavTarget();
    setModifierMode(false);
    vscode?.postMessage({ type: "clearHover" });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Control" || e.key === "Meta") setModifierMode(true);
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "Control" || e.key === "Meta") setModifierMode(false);
  });
  window.addEventListener("blur", () => setModifierMode(false));

  stage.addEventListener(
    "click",
    (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const hit = findComponent(e.target);
      if (hit) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openFile(hit.entry.file, hit.entry.htmlLine ?? hit.entry.previewLine ?? 1);
        return;
      }
      const lineEl = e.target instanceof Element ? e.target.closest("[data-umc-line]") : null;
      const line = lineEl ? Number(lineEl.getAttribute("data-umc-line")) : 0;
      if (lineEl && line && FOCUS.file) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openFile(FOCUS.file, line);
      }
    },
    true
  );

  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "highlight") highlightLine(msg.line);
    else if (msg.type === "clearHighlight") clearInspect();
  });
})();
