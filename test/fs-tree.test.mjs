/**
 * Pure parts of electron/fs-tree: directory listing and project root lookup.
 */

import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { list, projectRoot } from "../electron/fs-tree.cjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "fs-tree-"));

test("list: folders first, alphabetical inside each group, node_modules and dotfiles skipped", () => {
  fs.mkdirSync(path.join(root, "zeta"));
  fs.mkdirSync(path.join(root, "alpha"));
  fs.mkdirSync(path.join(root, "node_modules"));
  fs.mkdirSync(path.join(root, ".cache"));
  fs.writeFileSync(path.join(root, "zeta.txt"), "");
  fs.writeFileSync(path.join(root, "alpha.txt"), "");

  const entries = list(root);
  const names = entries.map((entry) => entry.name);
  const expected = ["alpha", "zeta", "alpha.txt", "zeta.txt"];
  if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error(JSON.stringify(names));
  if (!entries[0].dir || entries[2].dir) throw new Error(JSON.stringify(entries));
  if (entries[0].path !== path.join(root, "alpha")) throw new Error(entries[0].path);
});

test("list: unreadable or missing directory returns empty, not a throw", () => {
  if (list(path.join(root, "nope")).length !== 0) throw new Error("expected []");
});

test("projectRoot: nearest .git wins over a nearer package.json", () => {
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, "packages/inner/src"), { recursive: true });
  fs.writeFileSync(path.join(root, "packages/inner/package.json"), "");
  const file = path.join(root, "packages/inner/src/x.txt");
  if (projectRoot(file) !== root) throw new Error(projectRoot(file));
});

test("projectRoot: without .git falls back to the nearest package.json", () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), "fs-tree-"));
  fs.mkdirSync(path.join(other, "packages/inner/src"), { recursive: true });
  fs.writeFileSync(path.join(other, "packages/package.json"), "");
  const file = path.join(other, "packages/inner/src/x.txt");
  if (projectRoot(file) !== path.join(other, "packages")) throw new Error(projectRoot(file));
  fs.rmSync(other, { recursive: true, force: true });
});

test("projectRoot: no marker anywhere falls back to cwd", () => {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), "fs-tree-"));
  fs.writeFileSync(path.join(other, "x.txt"), "");
  if (projectRoot(path.join(other, "x.txt"), other) !== other) throw new Error(projectRoot(path.join(other, "x.txt"), other));
  fs.rmSync(other, { recursive: true, force: true });
});

test("projectRoot: no target uses cwd", () => {
  if (projectRoot("", root) !== root) throw new Error(projectRoot("", root));
});

test.after(() => fs.rmSync(root, { recursive: true, force: true }));
