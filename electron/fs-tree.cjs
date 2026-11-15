const fs = require("node:fs");
const path = require("node:path");

const SKIP = new Set(["node_modules", ".git"]);

/** Project root of `target`: nearest ancestor with .git, else package.json, else cwd. */
function projectRoot(target, cwd = process.cwd()) {
  let dir = target ? path.dirname(path.resolve(target)) : cwd;
  let pkg = "";
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    if (!pkg && fs.existsSync(path.join(dir, "package.json"))) pkg = dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return pkg || cwd;
}

/** Entries of one directory: folders first, then files, each alphabetical. */
function list(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => !SKIP.has(entry.name) && !entry.name.startsWith("."))
      .map((entry) => ({ name: entry.name, path: path.join(dir, entry.name), dir: entry.isDirectory() }))
      .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  } catch {
    return [];
  }
}

module.exports = { list, projectRoot };
