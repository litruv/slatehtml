const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("umcApi", {
  readFile: (file) => ipcRenderer.invoke("umc:read", file),
  writeFile: (file, content) => ipcRenderer.invoke("umc:write", file, content),
  openFile: () => ipcRenderer.invoke("umc:open"),
  openPath: (target) => ipcRenderer.invoke("umc:openpath", target),
  projectRoot: () => ipcRenderer.invoke("umc:root"),
  listDir: (dir) => ipcRenderer.invoke("umc:ls", dir),
  currentFile: () => ipcRenderer.invoke("umc:current"),
  switchFile: (index) => ipcRenderer.invoke("umc:switch", index),
  closeFile: (index) => ipcRenderer.invoke("umc:close", index),
  onFile: (callback) =>
    ipcRenderer.on("umc:file", (_event, file, content, files) => callback(file, content, files)),
});
