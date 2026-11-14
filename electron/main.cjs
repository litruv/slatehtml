const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
let file = process.argv.slice(2).find((arg) => arg.endsWith(".umc")) || "";
let last = "";
let watcher;

function send(contents) {
  if (!file) return;
  last = fs.readFileSync(file, "utf8");
  contents.send("umc:file", file, last);
}

function watch(contents) {
  watcher?.close();
  if (!file) return;
  watcher = fs.watch(file, () => {
    if (fs.readFileSync(file, "utf8") !== last) send(contents);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { preload: path.join(here, "preload.cjs") },
  });

  const contents = win.webContents;
  contents.on("did-finish-load", async () => {
    if (!file) {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "UMC component", extensions: ["umc"] }],
      });
      file = filePaths[0] || "";
    }
    send(contents);
    watch(contents);
  });

  win.loadFile(path.join(here, "..", "editor", "dist", "index.html"));
}

ipcMain.handle("umc:read", (_event, target) => fs.readFileSync(target, "utf8"));
ipcMain.handle("umc:write", (_event, target, content) => {
  fs.writeFileSync(target, content);
  last = content;
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
