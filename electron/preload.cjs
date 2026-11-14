const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("umcApi", {
  readFile: (file) => ipcRenderer.invoke("umc:read", file),
  writeFile: (file, content) => ipcRenderer.invoke("umc:write", file, content),
  onFile: (callback) =>
    ipcRenderer.on("umc:file", (_event, file, content) => callback(file, content)),
});
