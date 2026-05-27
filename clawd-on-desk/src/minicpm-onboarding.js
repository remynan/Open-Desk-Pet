"use strict";
//
// Open Desk Pet Onboarding — first-launch wizard.
//
// Lives as a single BrowserWindow shown before the pet
// when <userData>/minicpm-onboarding.json is missing or stale.
// Simplified for remote API mode - no environment check or model download.
//   1 welcome  — welcome message, hints about API configuration
//   2 ready    — handoff to the pet window
//

const { BrowserWindow, ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const minicpmI18n = require("./minicpm-i18n");

const SENTINEL_FILE = "minicpm-onboarding.json";
const CURRENT_VERSION = 2;

function userDataPath(name) {
  try { return path.join(app.getPath("userData"), name); }
  catch { return path.join(os.tmpdir(), name); }
}

module.exports = function initOnboarding(ctx) {
  // ctx must provide:
  //   onComplete()       — called once user finishes the wizard; main.js
  //                         creates the pet window inside this callback
  //   onCancel()         — called when the user closes the wizard window
  //                         without finishing it
  const log = (msg) => { try { console.log(msg); } catch {} };
  const getLang = () => {
    try {
      if (ctx && typeof ctx.getLang === "function") {
        const v = ctx.getLang();
        if (typeof v === "string" && v) return v;
      }
    } catch {}
    return "en";
  };
  const t = minicpmI18n.makeTranslator(getLang);
  let win = null;
  let internalClose = false;

  // ── sentinel file ───────────────────────────────────────────────────────
  function readSentinel() {
    try {
      return JSON.parse(fs.readFileSync(userDataPath(SENTINEL_FILE), "utf-8"));
    } catch { return null; }
  }
  function writeSentinel(extra = {}) {
    const payload = {
      complete: true,
      version: CURRENT_VERSION,
      completedAt: new Date().toISOString(),
      ...extra,
    };
    try {
      fs.writeFileSync(userDataPath(SENTINEL_FILE), JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      log(`[onboarding] sentinel save failed: ${err && err.message}`);
    }
    return payload;
  }
  function shouldShow() {
    if (process.env.MINICPM_FORCE_ONBOARDING === "1") return true;
    const s = readSentinel();
    if (!s || s.complete !== true) return true;
    if (typeof s.version === "number" && s.version < CURRENT_VERSION) return true;
    return false;
  }
  function reset() {
    try { fs.unlinkSync(userDataPath(SENTINEL_FILE)); } catch {}
  }

  // ── BrowserWindow lifecycle ──────────────────────────────────────────────
  function createWindow() {
    win = new BrowserWindow({
      width: 640,
      height: 420,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      title: t("onboardingWindowTitle"),
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload-minicpm-onboarding.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, "minicpm-onboarding.html"));
    win.once("ready-to-show", () => {
      win.show();
      win.focus();
    });
    win.on("closed", () => {
      const wasInternal = internalClose;
      internalClose = false;
      win = null;
      if (!wasInternal && ctx && typeof ctx.onCancel === "function") {
        try { ctx.onCancel(); } catch (err) {
          log(`[onboarding] onCancel callback failed: ${err && err.message}`);
        }
      }
    });
    return win;
  }

  function open() {
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
      return;
    }
    createWindow();
  }

  function close() {
    if (win && !win.isDestroyed()) {
      internalClose = true;
      try { win.close(); } catch {}
    }
    win = null;
  }

  // ── IPC handlers ─────────────────────────────────────────────────────────
  const handlers = {
    "onboarding:get-state": async () => {
      return {
        platform: process.platform,
        appVersion: app.getVersion(),
      };
    },

    "onboarding:complete": async () => {
      writeSentinel();
      try { ctx.onComplete && ctx.onComplete(); } catch (err) {
        log(`[onboarding] onComplete callback failed: ${err && err.message}`);
      }
      close();
      return { ok: true };
    },

    "onboarding:reset": async () => {
      reset();
      return { ok: true };
    },

    "onboarding:get-i18n": async () => {
      const lang = getLang();
      return { lang, strings: minicpmI18n.getStrings(lang) };
    },
  };

  for (const [ch, fn] of Object.entries(handlers)) {
    try { ipcMain.removeHandler(ch); } catch {}
    ipcMain.handle(ch, fn);
  }

  function sendI18n() {
    if (!win || win.isDestroyed()) return;
    try {
      const lang = getLang();
      win.webContents.send("onboarding:lang-change", {
        lang,
        strings: minicpmI18n.getStrings(lang),
      });
      try { win.setTitle(t("onboardingWindowTitle")); } catch {}
    } catch {}
  }

  return {
    shouldShow,
    open,
    close,
    reset,
    sendI18n,
    isOpen: () => !!(win && !win.isDestroyed()),
  };
};
