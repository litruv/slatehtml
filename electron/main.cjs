const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { list, projectRoot } = require("./fs-tree.cjs");

const here = __dirname;
const open = process.argv.slice(2).filter((arg) => arg.endsWith(".umc")).map((arg) => path.resolve(arg));
let file = open[0] || "";
let last = "";
let watcher;
let contents;

function send() {
  last = file ? fs.readFileSync(file, "utf8") : "";
  contents.send("umc:file", file, last, open);
}

function current() {
  return { file, content: file ? fs.readFileSync(file, "utf8") : "", files: open };
}

function watch() {
  watcher?.close();
  if (!file) return;
  watcher = fs.watch(file, () => {
    if (fs.readFileSync(file, "utf8") !== last) send();
  });
}

function pickFile() {
  return dialog
    .showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "UMC component", extensions: ["umc"] }],
    })
    .then(({ filePaths }) => {
      for (const picked of filePaths) {
        if (!open.includes(picked)) open.push(picked);
      }
      if (filePaths[0]) {
        file = filePaths[0];
        send();
        watch();
      }
      return file;
    });
}

function openAt(index) {
  const target = open[index];
  if (!target) return "";
  file = target;
  send();
  watch();
  return file;
}

function closeAt(index) {
  if (!open[index]) return "";
  open.splice(index, 1);
  file = open[Math.min(index, open.length - 1)] || "";
  send();
  watch();
  return file;
}

function openPath(target) {
  if (!open.includes(target)) open.push(target);
  file = target;
  send();
  watch();
  return file;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { preload: path.join(here, "preload.cjs") },
  });

  contents = win.webContents;
  contents.on("did-finish-load", () => {
    // The renderer pulls the first file: a push here lands before its module script
    // has registered the listener, so the event is dropped.
    watch();
    if (!file) pickFile();
  });

  win.loadFile(path.join(here, "..", "editor", "dist", "index.html"));
}

ipcMain.handle("umc:current", () => current());
ipcMain.handle("umc:open", () => pickFile());
ipcMain.handle("umc:openpath", (_event, target) => openPath(target));
ipcMain.handle("umc:switch", (_event, index) => openAt(index));
ipcMain.handle("umc:close", (_event, index) => closeAt(index));
ipcMain.handle("umc:root", () => projectRoot(file));
ipcMain.handle("umc:ls", (_event, dir) => list(dir));
ipcMain.handle("umc:read", (_event, target) => fs.readFileSync(target, "utf8"));
ipcMain.handle("umc:write", (_event, target, content) => {
  fs.writeFileSync(target, content);
  last = content;
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on("window-all-closed", () => app.quit());
