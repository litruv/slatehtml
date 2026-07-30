#!/usr/bin/env node
/**
 * Symlink editors/vscode-umc into Cursor / VS Code extensions folders
 * so .umc highlighting + preview work without publishing to the marketplace.
 *
 *   npm run umc:link-vscode
 *   npm run umc:unlink-vscode
 */

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const unlink = process.argv.includes("--unlink");
const source = resolve(dirname(fileURLToPath(import.meta.url)));

const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
// VS Code expects <publisher>.<name>-<version> as the folder name.
const extPrefix = `${manifest.publisher}.${manifest.name}-`;
const extId = `${extPrefix}${manifest.version}`;

const parents = [
  join(homedir(), ".cursor", "extensions"),
  join(homedir(), ".vscode", "extensions"),
];

for (const parent of parents) {
  if (!existsSync(parent)) continue;

  // Drop links from earlier versions so only one copy is registered.
  for (const entry of readdirSync(parent)) {
    if (!entry.startsWith(extPrefix)) continue;
    rmSync(join(parent, entry), { recursive: true, force: true });
    console.log(`removed ${join(parent, entry)}`);
  }

  if (unlink) continue;

  const target = join(parent, extId);
  if (isBrokenSymlink(target)) rmSync(target, { force: true });
  mkdirSync(parent, { recursive: true });
  symlinkSync(source, target, "dir");
  console.log(`linked ${target} -> ${source}`);
}

console.log(
  unlink
    ? "Reload the editor window to finish removing the extension."
    : "Reload the editor window to enable .umc autocomplete, highlighting, and preview."
);

function isBrokenSymlink(path) {
  try {
    lstatSync(path);
    return !existsSync(path);
  } catch {
    return false;
  }
}
