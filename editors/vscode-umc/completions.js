/**
 * Priority completions for .umc files.
 *
 * Context-sensitive in the script section:
 *   - inside `events: { … }` → native source keys + published names
 *   - OnX hooks derived from this file's (or siblings') declared events
 *   - emit("…") / addEventListener("…") → published event names
 *
 * HTML/preview still prefers SlateHTML tags/attrs (including sibling .umc
 * components and the events they publish, shown in the detail text).
 */

const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");

const TAGS = {
  horizontalbox: ["halign", "valign", "gap", "padding", "fill"],
  verticalbox: ["halign", "valign", "gap", "padding", "fill"],
  wrapbox: ["halign", "valign", "gap", "padding", "fill"],
  overlay: ["padding", "fill"],
  canvaspanel: ["padding", "fill"],
  scrollbox: ["orientation", "padding", "fill"],
  sizebox: ["width", "height", "fill"],
  scalebox: ["stretch", "fill", "fit", "down", "down-x", "scale-down", "scale-down-x"],
  gridpanel: ["columns", "rows", "masonry", "gap", "padding", "fill"],
  spacer: [],
  border: ["padding", "fill", "background", "border-color", "kind"],
  textblock: ["text", "kind"],
  image: ["brush", "tint", "width", "height"],
  progressbar: ["percent", "width", "height"],
  checkbox: ["checked", "disabled"],
  slider: ["percent", "disabled", "width"],
  editabletext: ["text", "readonly", "multiline", "width"],
  button: ["widget", "type"],
  "slate-button": ["text", "disabled"],
};

const TAG_DOCS = {
  horizontalbox: "UMG Horizontal Box, lays out children in a row.",
  verticalbox: "UMG Vertical Box, lays out children in a column.",
  wrapbox: "UMG Wrap Box, horizontal flow that wraps.",
  overlay: "UMG Overlay, stacks children in one cell.",
  canvaspanel: "UMG Canvas Panel, anchored, absolute-positioned children.",
  scrollbox: "UMG Scroll Box, clips and scrolls overflow.",
  sizebox: "UMG Size Box, constrains child dimensions.",
  scalebox: "UMG Scale Box, scales its first child.",
  gridpanel: "UMG Grid Panel, evenly divided CSS grid.",
  spacer: "Flexible empty space that absorbs remaining room.",
  border: "Chrome and padding around content.",
  textblock: "Static text driven by its `text` attribute.",
  image: "Brush/tint image rectangle.",
  progressbar: "Display bar driven by `percent` (0-100).",
  checkbox: "Interactive boolean checkbox.",
  slider: "Interactive value slider (0-100).",
  editabletext: "Editable text field; blur / Enter fires `committed`.",
  button: "Native button; add `widget` for SlateHTML styling.",
  "slate-button": "UMG Button, emits clicked / doubleclicked / pressed / released.",
};

/** Built-in public events for known widgets (when not parsed from source). */
const BUILTIN_EVENTS = {
  "slate-button": {
    click: "clicked",
    dblclick: "doubleclicked",
    mousedown: "pressed",
    mouseup: "released",
  },
  checkbox: { change: "changed" },
  slider: { input: "percentchanged" },
  editabletext: { input: "textchanged", keydown: "committed" },
};

/**
 * Native DOM → recommended published name for `events: { … }`.
 * Keys are what the browser fires; values are the widget's public API.
 */
const EVENT_SUGGESTIONS = {
  click: "clicked",
  dblclick: "doubleclicked",
  mousedown: "pressed",
  mouseup: "released",
  mouseenter: "hovered",
  mouseleave: "unhovered",
  pointerdown: "pressed",
  pointerup: "released",
  pointerenter: "hovered",
  pointerleave: "unhovered",
  focus: "focused",
  blur: "blurred",
  focusin: "focused",
  focusout: "blurred",
  keydown: "keydown",
  keyup: "keyup",
  input: "input",
  change: "changed",
  submit: "submit",
  scroll: "scrolled",
  contextmenu: "contextmenu",
};

const GLOBAL_ATTRS = [
  "fill",
  "padding",
  "gap",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "halign",
  "valign",
  "anchors",
  "top",
  "left",
  "right",
  "bottom",
  "background",
  "border-color",
  "kind",
  "data-umc",
  "data-umc-prop",
  "data-content",
];

const VALUES = {
  halign: ["left", "center", "right", "fill"],
  valign: ["top", "center", "bottom", "fill"],
  anchors: [
    "top-left",
    "top",
    "top-right",
    "left",
    "center",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
    "h-fill",
    "v-fill",
    "fill",
    "stretch",
  ],
  orientation: ["vertical", "horizontal"],
  stretch: ["fit", "fill", "stretch"],
  type: ["button", "submit", "reset"],
};

const SECTIONS = [
  ["html", "Component template (HTML)"],
  ["style", "Component-local styles (CSS)"],
  ["script", "Component definition and behavior (JavaScript)"],
  ["preview", "Editor-only preview markup; ignored by builds"],
];

const LIFECYCLE = [
  ["Initialize", "Runs once, the first time the widget is attached."],
  ["PreConstruct", "Runs before the template is stamped on every attach."],
  ["Construct", "Runs after template stamp and data binding."],
  ["SynchronizeProperties", "Runs after Construct and when observed attrs change."],
  ["Destroyed", "Runs when the widget is detached."],
  ["Tick", "Runs every animation frame while attached; receives dt in seconds."],
];

const CSS_VARS = [
  ["--widget-padding", "Panel/border padding."],
  ["--widget-gap", "Gap between box/grid children."],
  ["--widget-columns", "Grid panel column count."],
  ["--widget-border", "Widget border shorthand."],
  ["--widget-background", "Widget/chrome background."],
  ["--widget-radius", "Widget border radius."],
  ["--widget-brush", "Image background brush."],
  ["--widget-percent", "Progress/slider value (0-100)."],
  ["--widget-fill", "Progress bar fill color."],
  ["--widget-height", "Default widget height token."],
];

function registerCompletions(context) {
  const provider = vscode.languages.registerCompletionItemProvider(
    { language: "umc", scheme: "file" },
    {
      provideCompletionItems(document, position) {
        return completionsFor(document, position);
      },
    },
    "<",
    " ",
    "\"",
    "'",
    "-",
    ":",
    ".",
    "("
  );
  context.subscriptions.push(provider);
}

function completionsFor(document, position) {
  const section = sectionAt(document, position);
  const line = document.lineAt(position.line).text.slice(0, position.character);

  if (!section || /^\s*---[\w\s-]*$/.test(line)) {
    return sectionItems(document, position);
  }
  if (section === "html" || section === "preview") {
    return htmlItems(document, position, line);
  }
  if (section === "script") return scriptItems(document, position, line);
  if (section === "style") return styleItems(document, position);
  return [];
}

function sectionAt(document, position) {
  const source = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  );
  const re = /^---\s*(html|template|style|css|script|js|preview|demo)\s*---\s*$/gim;
  let match;
  let section = null;
  while ((match = re.exec(source))) section = match[1].toLowerCase();
  return {
    template: "html",
    css: "style",
    js: "script",
    demo: "preview",
  }[section] ?? section;
}

function sectionItems(document, position) {
  const range = tokenRange(document, position, /[-\w\s]*/);
  return SECTIONS.map(([name, description], index) => {
    const item = priorityItem(
      `--- ${name} ---`,
      vscode.CompletionItemKind.Module,
      index,
      description
    );
    item.insertText = `--- ${name} ---`;
    item.range = range;
    return item;
  });
}

function htmlItems(document, position, line) {
  const catalog = workspaceCatalog(document);
  const allTags = { ...TAGS };
  for (const [tag, info] of Object.entries(catalog)) {
    allTags[tag] = info.attrs;
  }

  const open = line.match(/<([a-zA-Z][\w-]*)?[^<>]*$/);
  if (!open || /<\/[^>]*$/.test(line)) return tagItems(allTags, catalog, document, position);

  const fragment = open[0];
  const tagMatch = fragment.match(/^<([\w-]*)$/);
  if (tagMatch) return tagItems(allTags, catalog, document, position);

  const valueMatch = fragment.match(/([\w-]+)\s*=\s*["']([^"']*)$/);
  if (valueMatch && VALUES[valueMatch[1]]) {
    return valueItems(VALUES[valueMatch[1]], document, position);
  }

  const element = fragment.match(/^<([\w-]+)/)?.[1];
  const attrs = new Set([
    ...(allTags[element] ?? []),
    ...GLOBAL_ATTRS,
  ]);

  // Hyperscript-style onX attrs are unusual in raw HTML, but useful when
  // typing listeners in preview demos that get rewritten later.
  const published = publishedEventsFor(element, catalog);
  for (const name of published) {
    attrs.add(`on${pascal(name)}`);
  }

  return [...attrs].map((name, index) =>
    attrItem(name, document, position, index, published)
  );
}

function tagItems(tags, catalog, document, position) {
  return Object.keys(tags).map((tag, index) => {
    const events = publishedEventsFor(tag, catalog);
    const base = TAG_DOCS[tag] ?? "Workspace UMC component";
    const doc =
      events.length > 0
        ? `${base}\n\n**Events:** ${events.map((e) => `\`${e}\``).join(", ")}`
        : base;
    const item = priorityItem(tag, vscode.CompletionItemKind.Class, index, doc);
    item.insertText = new vscode.SnippetString(`${tag}>$0</${tag}>`);
    item.range = tokenRange(document, position);
    if (events.length) item.detail = `SlateHTML UMC · ${events.join(", ")}`;
    return item;
  });
}

function attrItem(name, document, position, index, published = []) {
  const item = priorityItem(
    name,
    vscode.CompletionItemKind.Property,
    index,
    attributeDoc(name, published)
  );
  item.range = tokenRange(document, position);

  if (
    ["fill", "checked", "disabled", "readonly", "multiline", "widget", "data-content"].includes(
      name
    )
  ) {
    item.insertText = name;
  } else {
    item.insertText = new vscode.SnippetString(`${name}="$1"`);
  }
  return item;
}

function valueItems(values, document, position) {
  return values.map((value, index) => {
    const item = priorityItem(
      value,
      vscode.CompletionItemKind.EnumMember,
      index,
      "SlateHTML attribute value"
    );
    item.range = tokenRange(document, position);
    return item;
  });
}

function scriptItems(document, position, line) {
  const source = document.getText();
  const declared = parseEventsMap(source);
  const published = [...new Set(Object.values(declared))];

  // Inside events: { … }, keys and values
  const eventsCtx = eventsContext(document, position);
  if (eventsCtx) {
    if (eventsCtx.kind === "value") {
      return eventValueItems(eventsCtx.sourceKey, document, position);
    }
    return eventKeyItems(declared, document, position);
  }

  // emit("…") / addEventListener("…")
  if (/(?:emit|addEventListener)\(\s*["'][^"']*$/.test(line)) {
    return eventNameItems(published.length ? published : Object.values(EVENT_SUGGESTIONS), document, position, {
      asString: false, // already inside quotes
    });
  }

  // onClicked / OnClicked while typing
  if (/\bOn?[A-Za-z]*$/.test(line)) {
    return eventHookItems(declared, document, position);
  }

  return generalScriptItems(declared, published, document, position);
}

/** Are we inside an `events: { … }` object literal? */
function eventsContext(document, position) {
  const before = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  );

  // Find the last `events:` before the cursor and track brace depth after it.
  const marker = [...before.matchAll(/\bevents\s*:\s*\{/g)].pop();
  if (!marker) return null;

  const from = marker.index + marker[0].length;
  const slice = before.slice(from);
  let depth = 1;
  for (const ch of slice) {
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth <= 0) return null; // closed before cursor
    }
  }

  const line = document.lineAt(position.line).text.slice(0, position.character);
  const valueMatch = line.match(/^\s*(["']?)([\w-]*)\1\s*:\s*(["']?)([^"']*)$/);
  if (valueMatch && valueMatch[2]) {
    return { kind: "value", sourceKey: valueMatch[2], quote: valueMatch[3] || '"' };
  }
  return { kind: "key" };
}

function eventKeyItems(already, document, position) {
  const used = new Set(Object.keys(already));
  return Object.entries(EVENT_SUGGESTIONS).map(([src, published], index) => {
    const item = priorityItem(
      src,
      vscode.CompletionItemKind.Event,
      index,
      used.has(src)
        ? `Already mapped in this file → \`${already[src]}\``
        : `Native \`${src}\` → publish as \`${published}\``
    );
    item.insertText = new vscode.SnippetString(`${src}: "${published}",`);
    item.range = tokenRange(document, position);
    item.sortText = used.has(src)
      ? `0001-umc-used-${String(index).padStart(4, "0")}`
      : `0000-umc-${String(index).padStart(4, "0")}`;
    return item;
  });
}

function eventValueItems(sourceKey, document, position) {
  const recommended = EVENT_SUGGESTIONS[sourceKey] ?? sourceKey;
  const options = [...new Set([recommended, sourceKey, pascalToKebab(recommended)])];
  return options.map((name, index) => {
    const item = priorityItem(
      name,
      vscode.CompletionItemKind.EnumMember,
      index,
      index === 0
        ? `Recommended public name for \`${sourceKey}\``
        : `Public event name (listen with addEventListener("${name}", …))`
    );
    item.insertText = name;
    item.range = tokenRange(document, position);
    return item;
  });
}

function eventHookItems(declared, document, position) {
  const map = Object.keys(declared).length ? declared : EVENT_SUGGESTIONS;
  const items = [];

  // Prefer hooks that match this file's published events.
  const published = [...new Set(Object.values(map))];
  published.forEach((name, index) => {
    const hook = `On${pascal(name)}`;
    const item = priorityItem(
      hook,
      vscode.CompletionItemKind.Method,
      index,
      `Runs when this widget emits \`${name}\` (from its \`events\` map).`
    );
    item.insertText = new vscode.SnippetString(
      `${hook}(el, api, nativeEvent) {\n\t$0\n},`
    );
    item.range = tokenRange(document, position, /On?[\w]*/);
    items.push(item);
  });

  // Also offer camelCase onX for hyperscript-style handlers in script notes.
  published.forEach((name, index) => {
    const hook = `on${pascal(name)}`;
    const item = priorityItem(
      hook,
      vscode.CompletionItemKind.Method,
      100 + index,
      `Hyperscript / create() listener for \`${name}\`.`
    );
    item.insertText = hook;
    item.range = tokenRange(document, position, /On?[\w]*/);
    items.push(item);
  });

  return items;
}

function eventNameItems(names, document, position, { asString }) {
  return names.map((name, index) => {
    const item = priorityItem(
      name,
      vscode.CompletionItemKind.Event,
      index,
      `Public widget event, \`addEventListener("${name}", …)\` or \`emit("${name}")\`.`
    );
    item.insertText = asString ? `"${name}"` : name;
    item.range = tokenRange(document, position);
    return item;
  });
}

function generalScriptItems(declared, published, document, position) {
  const items = [];

  LIFECYCLE.forEach(([name, description], index) => {
    const item = priorityItem(name, vscode.CompletionItemKind.Method, index, description);
    if (name === "Tick") {
      item.insertText = new vscode.SnippetString("Tick(el, api, dt) {\n\t$0\n},");
    } else if (name === "PreConstruct") {
      item.insertText = new vscode.SnippetString(
        "PreConstruct(el, api, { isDesignTime }) {\n\t$0\n},"
      );
    } else {
      item.insertText = new vscode.SnippetString(`${name}(el, api) {\n\t$0\n},`);
    }
    item.range = tokenRange(document, position);
    items.push(item);
  });

  // Event hooks from this file's events map (or common defaults).
  eventHookItems(declared, document, position).forEach((item, index) => {
    item.sortText = `0000-umc-${String(50 + index).padStart(4, "0")}-${item.label}`;
    items.push(item);
  });

  const methods = [
    ["add", "Append nodes, text, arrays, or `{ tag, ... }` specs to the content region.", "el.add($1)"],
    ["set", "Replace the content region with new content.", "el.set($1)"],
    ["clear", "Empty the widget content region.", "el.clear()"],
    [
      "emit",
      published.length
        ? `Fire a bubbling CustomEvent. This widget publishes: ${published.join(", ")}.`
        : "Fire a bubbling CustomEvent from this widget.",
      published.length
        ? `el.emit("\${1|${published.join(",")}|}", \${2:null})`
        : 'el.emit("${1:clicked}", ${2:null})',
    ],
    ["attr", "Read one host attribute with its UMC default.", 'api.attr("${1:name}", ${2:null})'],
    ["attrs", "Read multiple host attributes.", "api.attrs($1)"],
    ["bind", "Refresh `data-umc` bindings.", "api.bind()"],
    ["stamp", "Replace the host with template markup.", "api.stamp($1)"],
    ["sync", "Re-stamp and bind the template.", "api.sync()"],
  ];
  methods.forEach(([name, description, snippet], index) => {
    const item = priorityItem(name, vscode.CompletionItemKind.Method, 100 + index, description);
    item.insertText = new vscode.SnippetString(snippet);
    item.range = tokenRange(document, position);
    items.push(item);
  });

  for (const [index, [name, snippet, description]] of [
    ["tag", 'tag: "${1:my-widget}",', "Custom element tag name."],
    ["attrs", "attrs: {\n\t${1:name}: ${2:\"default\"},\n},", "Observed attrs and defaults."],
    [
      "events",
      "events: {\n\tclick: \"clicked\",\n\tdblclick: \"doubleclicked\",\n\tmousedown: \"pressed\",\n\tmouseup: \"released\",\n},",
      "Map native DOM events → public widget events. Inside the block, autocomplete suggests source keys and published names.",
    ],
  ].entries()) {
    const item = priorityItem(name, vscode.CompletionItemKind.Field, 200 + index, description);
    item.insertText = new vscode.SnippetString(snippet);
    item.range = tokenRange(document, position);
    items.push(item);
  }

  return items;
}

function styleItems(document, position) {
  const catalog = workspaceCatalog(document);
  const items = [];

  {
    const item = priorityItem(
      "self",
      vscode.CompletionItemKind.Keyword,
      0,
      "Host tag for this .umc, compiles to e.g. server-pill"
    );
    item.range = tokenRange(document, position);
    items.push(item);
  }

  CSS_VARS.forEach(([name, description], index) => {
    const item = priorityItem(name, vscode.CompletionItemKind.Variable, 1 + index, description);
    item.range = tokenRange(document, position);
    items.push(item);
  });

  Object.keys({ ...TAGS, ...catalog }).forEach((tag, index) => {
    const events = publishedEventsFor(tag, catalog);
    const item = priorityItem(
      tag,
      vscode.CompletionItemKind.Class,
      100 + index,
      events.length
        ? `${TAG_DOCS[tag] ?? "Workspace UMC component"} · events: ${events.join(", ")}`
        : TAG_DOCS[tag] ?? "Workspace UMC component selector"
    );
    item.range = tokenRange(document, position);
    items.push(item);
  });
  return items;
}

/** Parse `events: { click: "clicked", … }` from source text. */
function parseEventsMap(source) {
  const body = source.match(/\bevents\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1];
  if (!body) return {};
  const out = {};
  for (const match of body.matchAll(
    /["']?([\w-]+)["']?\s*:\s*(?:["']([\w-]+)["']|\{[\s\S]*?\bas\s*:\s*["']([\w-]+)["'])/g
  )) {
    out[match[1]] = match[2] || match[3] || match[1];
  }
  // Array form: events: ["click", "input"]
  if (!Object.keys(out).length) {
    for (const match of body.matchAll(/["']([\w-]+)["']/g)) {
      out[match[1]] = match[1];
    }
  }
  return out;
}

/**
 * Catalog of sibling (and current) .umc components:
 *   { tag: { attrs: string[], events: { src: published } } }
 */
function workspaceCatalog(document) {
  const catalog = {};
  const dir = path.dirname(document.fileName);
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((name) => name.endsWith(".umc"));
  } catch {
    return catalog;
  }

  for (const name of files) {
    const file = path.join(dir, name);
    const open = vscode.workspace.textDocuments.find((d) => d.fileName === file);
    let source;
    try {
      source = open ? open.getText() : fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const tag = source.match(/\btag\s*:\s*["'`]([\w-]+)["'`]/)?.[1];
    if (!tag) continue;
    const attrsBody = source.match(/\battrs\s*:\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
    const attrs = [...attrsBody.matchAll(/^\s*["']?([\w-]+)["']?\s*:/gm)].map((m) => m[1]);
    catalog[tag] = {
      attrs,
      events: parseEventsMap(source),
    };
  }

  // Fill builtins for known tags not present as files / without events yet.
  for (const [tag, events] of Object.entries(BUILTIN_EVENTS)) {
    if (!catalog[tag]) catalog[tag] = { attrs: TAGS[tag] ?? [], events: { ...events } };
    else if (!Object.keys(catalog[tag].events).length) catalog[tag].events = { ...events };
  }
  return catalog;
}

function publishedEventsFor(tag, catalog) {
  if (!tag) return [];
  const fromFile = catalog[tag]?.events;
  if (fromFile && Object.keys(fromFile).length) return [...new Set(Object.values(fromFile))];
  if (BUILTIN_EVENTS[tag]) return [...new Set(Object.values(BUILTIN_EVENTS[tag]))];
  return [];
}

function pascal(name) {
  return String(name).replace(/(^|[_-])(\w)/g, (_, __, c) => c.toUpperCase());
}

function pascalToKebab(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function priorityItem(label, kind, index, documentation) {
  const item = new vscode.CompletionItem(label, kind);
  item.sortText = `0000-umc-${String(index).padStart(4, "0")}-${label}`;
  item.preselect = index === 0;
  item.detail = "SlateHTML UMC";
  item.documentation = new vscode.MarkdownString(documentation);
  return item;
}

function tokenRange(document, position, pattern = /[\w-]*/) {
  const prefix = document.lineAt(position.line).text.slice(0, position.character);
  const match = prefix.match(new RegExp(`${pattern.source}$`));
  const length = match?.[0].length ?? 0;
  return new vscode.Range(
    new vscode.Position(position.line, position.character - length),
    position
  );
}

function attributeDoc(name, published = []) {
  if (/^on[A-Z]/.test(name)) {
    const pascalName = name.slice(2);
    const mapped =
      published.find((p) => pascal(p) === pascalName) ??
      pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
    return `Listen for \`${mapped}\` (\`addEventListener("${mapped}", …)\` / hyperscript \`on${pascalName}\`).`;
  }

  const docs = {
    fill: "Flex fill weight. Bare `fill` means 1.",
    padding: "Widget padding; unitless values are pixels.",
    gap: "Gap between children; unitless values are pixels.",
    halign: "Horizontal alignment.",
    valign: "Vertical alignment.",
    anchors: "Canvas child anchor preset or minX,minY,maxX,maxY.",
    "data-umc": "Bind a host attr/default into this node.",
    "data-umc-prop": "Target property/attribute for `data-umc` (default: `text`).",
    "data-content": "Content region targeted by widget `add`, `set`, and `clear`.",
  };
  return docs[name] ?? "SlateHTML widget attribute";
}

module.exports = { registerCompletions };
