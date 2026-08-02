/**
 * Shared option / menu grammar for select / dropdown / autocomplete /
 * radio-group / transfer-list / combobox / server-picker.
 *
 * Entries (comma or newline separated):
 *
 *   "a, b"                    → options (value === label)
 *   "value|Label"             → distinct value (prefer when values may contain `:`)
 *   "value:Label"             → same, colon form
 *   "value|Label|https://…"   → optional image URL (3rd `|` field)
 *   "value|Label|hash"        → optional Lucide icon name (kebab-case)
 *   "---"                     → separator (2+ hyphens)
 *   "# Text channels"         → non-selectable category heading
 */

export function isOption(item) {
  return Boolean(item && item.type === "option");
}

/** Selectable options only, skips separators and category headings. */
export function selectableOptions(items) {
  return (items || []).filter(isOption);
}

/** 3rd pipe field: URL → image (`avatar`), otherwise Lucide icon name. */
export function parseMediaField(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { avatar: "", icon: "" };
  if (/^(https?:|mxc:|data:|blob:|\/\/|\/|\.\/)/i.test(s)) {
    return { avatar: s, icon: "" };
  }
  return { avatar: "", icon: s };
}

function optionFromParts(value, label, media = "") {
  const { avatar, icon } = parseMediaField(media);
  return {
    type: "option",
    value,
    label: label || value,
    avatar,
    icon,
  };
}

export function parseOptions(spec) {
  return String(spec ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (/^-{2,}$/.test(entry)) {
        return { type: "separator", value: "", label: "", avatar: "", icon: "" };
      }

      if (entry.startsWith("#")) {
        const label = entry.slice(1).trim();
        return {
          type: "category",
          value: "",
          label: label || entry,
          avatar: "",
          icon: "",
        };
      }

      const pipe = entry.indexOf("|");
      if (pipe >= 0) {
        const value = entry.slice(0, pipe).trim();
        const rest = entry.slice(pipe + 1);
        const pipe2 = rest.indexOf("|");
        if (pipe2 >= 0) {
          const label = rest.slice(0, pipe2).trim();
          const media = rest.slice(pipe2 + 1).trim();
          return optionFromParts(value, label, media);
        }
        return optionFromParts(value, rest.trim());
      }

      const split = entry.indexOf(":");
      if (split < 0) return optionFromParts(entry, entry);
      const value = entry.slice(0, split).trim();
      const label = entry.slice(split + 1).trim();
      return optionFromParts(value, label);
    });
}

/** Serialize menu items back to the options attribute form. */
export function serializeOptions(options) {
  return (options || [])
    .map((o) => {
      if (o.type === "separator") return "---";
      if (o.type === "category") return `# ${o.label || ""}`.trim();
      const media = (o.avatar || o.icon || "").trim();
      if (media) {
        return `${o.value}|${o.label || o.value}|${media}`;
      }
      return o.label && o.label !== o.value ? `${o.value}|${o.label}` : o.value;
    })
    .join(", ");
}
