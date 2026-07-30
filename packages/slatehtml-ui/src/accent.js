/**
 * Stable color / label helpers for picker tiles (no Matrix SDK).
 */

export function normalizeHost(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.startsWith("@") && raw.includes(":")) {
    return raw.slice(raw.indexOf(":") + 1).trim().toLowerCase();
  }
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
  }
}

export function serverInitial(input) {
  const host = normalizeHost(input);
  if (!host) return "?";
  const label = host.split(".")[0] || host;
  return label.slice(0, 2).toUpperCase();
}

/** Stable accent for a homeserver / id string. */
export function serverAccent(input) {
  const host = normalizeHost(input) || String(input || "");
  let hash = 0;
  for (let i = 0; i < host.length; i += 1) {
    hash = (Math.imul(31, hash) + host.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 40%)`;
}

function scopeKind(scope) {
  const s = String(scope || "").trim().toLowerCase();
  if (s === "dms" || s === "dm") return "dms";
  if (s === "rooms" || s === "room") return "rooms";
  return "space";
}

/** Accent fill for scope-picker square icons. */
export function scopeAccent(scope, label = "") {
  const kind = scopeKind(scope);
  if (kind === "dms") return "hsl(145 45% 38%)";
  if (kind === "rooms") return "hsl(235 35% 45%)";
  return serverAccent(label || scope);
}
