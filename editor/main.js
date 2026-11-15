import { parseUmc } from "slatehtml/umc/parse.js";
import { enhanceTree, OBSERVED_ATTRS } from "slatehtml/widget.js";
import "slatehtml/widget.css";
// The canvas renders any widget in the source, so register the whole kit.
import "slatehtml-ui";
import { patchAttr } from "./patch.mjs";

// `self` in the style section maps to the canvas wrapper.
const SELF_CLASS = "umc-self";
const TAG_RE = /<([A-Za-z][\w-]*)((?:\s[^>/]*)?)(\s*\/?)>/;
const SELF_SELECTOR_RE = /(^|[,}])\s*self\b/gm;

// Outliner glyph per tag. Lucide names, `square` is the fallback.
const ICONS = {
  canvaspanel: "layout-panel-left",
  verticalbox: "rows-3",
  horizontalbox: "columns-3",
  scrollbox: "scroll",
  gridpanel: "grid-2x2",
  uniformgridpanel: "grid-2x2",
  scalebox: "maximize",
  sizebox: "maximize",
  textblock: "type",
  editabletext: "pencil",
  image: "image",
  checkbox: "square-check",
  slider: "sliders-horizontal",
  progressbar: "gauge",
  spacer: "plus",
};

const api = window.umcApi;
const state = { path: "", source: "", selected: null, query: "", files: [] };
const bar = document.getElementById("file-title");
const selection = document.getElementById("selection");
const sourceView = document.getElementById("source-view");
const fileTabs = document.getElementById("file-tabs");
const search = document.getElementById("search");
const tree = document.getElementById("tree");
const canvas = document.getElementById("canvas");
const details = document.getElementById("details");
const heading = document.getElementById("details-heading");

if (!api) {
  heading.setAttribute("text", "The editor only runs inside Electron: npm run editor.");
} else {
  function show(path, content, files) {
    if (content === state.source) return;
    state.path = path;
    state.source = content;
    state.files = files || [path];
    render();
  }

  api.onFile(show);
  // Pull the first file: main's push at load lands before this script runs.
  api.currentFile().then((current) => {
    if (current.file) show(current.file, current.content, current.files);
  });

  fileTabs.addEventListener("selectionchanged", (event) => {
    const index = Number(event.detail?.value);
    if (Number.isInteger(index)) api.switchFile(index);
  });

  document.getElementById("menu-file").addEventListener("selectionchanged", (event) => {
    const value = event.detail?.value;
    if (value === "open") api.openFile();
    else if (value === "save" && state.path) api.writeFile(state.path, state.source);
  });

  const switcher = document.getElementById("view-switcher");
  for (const [id, page] of [["view-editor", "editor"], ["view-source", "source"]]) {
    document.getElementById(id).addEventListener("click", () => switcher.setAttribute("active", page));
  }

  search.addEventListener("valuechanged", (event) => {
    state.query = (event.detail?.value || "").trim().toLowerCase();
    render();
  });

  // Outliner: the row selects, only the chevron expands. Capture at document so
  // this runs before the accordion's own click handler.
  document.addEventListener(
    "click",
    (event) => {
      const item = event.target?.closest?.("slate-accordion-item");
      if (!item || !tree.contains(item)) return;
      if (!event.target?.closest?.(".slate-accordion-item-chevron")) event.stopPropagation();
      select(item.getAttribute("name"));
    },
    true
  );
}

function base(path) {
  return path.split(/[\\/]/).pop();
}

// The top strip lists open files: value is the index, label the file name.
function renderFileTabs() {
  fileTabs.setAttribute("tabs", state.files.map((path, index) => `${index}|${base(path)}`).join(", "));
  const active = state.files.indexOf(state.path);
  fileTabs.setAttribute("active", active < 0 ? "" : String(active));
}

function render() {
  const model = parseUmc(state.source);
  const html = model.html;
  bar.textContent = state.path || "No file";
  sourceView.textContent = state.source;
  renderFileTabs();
  canvas.textContent = "";
  tree.clear();

  if (html.kind !== "inline" || !html.startLine) {
    tree.set({ tag: "slate-text", kind: "hint", text: "HTML section is empty or a link: no line mapping." });
    return;
  }

  // One opening tag per line, so line = startLine + index in the section.
  const annotated = html.value
    .split(/\r?\n/)
    .map((line, index) =>
      line.replace(
        TAG_RE,
        (full, tag, attrs = "", selfClose = "") =>
          `<${tag} data-umc-line="${html.startLine + index}"${attrs}${selfClose}>`
      )
    )
    .join("\n");

  const wrapper = document.createElement("div");
  wrapper.className = SELF_CLASS;
  wrapper.append(...new DOMParser().parseFromString(annotated, "text/html").body.childNodes);
  canvas.append(wrapper);
  enhanceTree(wrapper);

  document.getElementById("component-style").textContent =
    model.style.kind === "inline"
      ? model.style.value.replace(SELF_SELECTOR_RE, (_match, before) => `${before}.${SELF_CLASS}`)
      : "";

  const open = [];
  const roots = [...wrapper.children].flatMap((node) => itemSpec(node, open));
  tree.set(roots);
  tree.setAttribute("open", open.join(","));
  select(state.selected);
}

// One accordion item per opening tag; branches nest their children in a child accordion.
function itemSpec(node, open) {
  const line = node.dataset.umcLine;
  // Stamped template internals have no line. Walk through them, but do not list them.
  if (!line) return [...node.children].flatMap((child) => itemSpec(child, open));
  const tag = node.tagName.toLowerCase();
  const kids = [...node.children].flatMap((child) => itemSpec(child, open));
  const hit = !state.query || tag.includes(state.query);
  if (!hit && !kids.length) return [];

  const spec = {
    tag: "slate-accordion-item",
    name: line,
    title: tag,
    icon: ICONS[tag] || "square",
    class: kids.length ? "branch" : "leaf",
  };
  if (kids.length) {
    open.push(line);
    spec.open = true;
    spec.children = {
      tag: "slate-accordion",
      kind: "plain",
      multiple: true,
      open: kids.map((kid) => kid.name).join(","),
      children: kids,
    };
  }
  return [spec];
}

function select(line) {
  if (!line) return;
  state.selected = line;
  for (const el of document.querySelectorAll(".selected")) el.classList.remove("selected");
  const node = canvas.querySelector(`[data-umc-line="${line}"]`);
  if (!node) return;
  node.classList.add("selected");
  tree.querySelector(`slate-accordion-item[name="${line}"]`)?.classList.add("selected");
  heading.setAttribute("text", `${node.tagName.toLowerCase()} — line ${node.dataset.umcLine}`);
  selection.textContent = `${node.tagName.toLowerCase()} line ${node.dataset.umcLine}`;
  renderDetails(node);
}

function renderDetails(node) {
  details.textContent = "";
  for (const attr of OBSERVED_ATTRS) {
    const field = document.createElement("slate-text-field");
    field.setAttribute("label", attr);
    field.setAttribute("value", node.getAttribute(attr) ?? "");
    field.addEventListener("committed", (event) =>
      apply(node.dataset.umcLine, attr, event.detail?.value ?? "")
    );
    details.append(field);
  }
}

function apply(line, attr, value) {
  const next = patchAttr(state.source, Number(line), attr, value);
  if (next === state.source) return;
  state.source = next;
  api.writeFile(state.path, next);
  render();
}
