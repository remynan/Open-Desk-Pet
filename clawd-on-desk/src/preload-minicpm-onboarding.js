"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("onboarding", {
  // One-shot reads
  getState: () => ipcRenderer.invoke("onboarding:get-state"),

  // User actions
  complete: () => ipcRenderer.invoke("onboarding:complete"),

  // i18n: initial fetch + live updates
  getI18n: () => ipcRenderer.invoke("onboarding:get-i18n"),
  onLangChange: (cb) => {
    const listener = (_e, payload) => { try { cb(payload || {}); } catch {} };
    ipcRenderer.on("onboarding:lang-change", listener);
    return () => ipcRenderer.removeListener("onboarding:lang-change", listener);
  },
});
