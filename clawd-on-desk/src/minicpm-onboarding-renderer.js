"use strict";
// Open Desk Pet Onboarding renderer — simplified 2-stage wizard UI.
//
// Stages:
//   1 welcome  — welcome message, hints about API configuration
//   2 ready    — handoff to the pet window.
//
// Strings come from `minicpm-i18n.js`.

const STEPS = ["welcome", "ready"];

const el = (id) => document.getElementById(id);
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const minicpmI18n = (typeof globalThis !== "undefined" && globalThis.ClawdMinicpmI18n) || null;
let currentLang = "en";
let t = minicpmI18n ? minicpmI18n.makeTranslator(() => currentLang) : (k) => k;

let currentStep = "welcome";

function applyStaticTranslations() {
  const root = document;
  for (const node of root.querySelectorAll("[data-i18n]")) {
    const key = node.getAttribute("data-i18n");
    if (!key) continue;
    node.textContent = t(key);
  }
  try { document.documentElement.setAttribute("lang", currentLang); } catch {}
  try { document.title = t("onboardingWindowTitle"); } catch {}
}

function show(step) {
  currentStep = step;
  $$(".panel").forEach((p) => {
    p.classList.toggle("hidden", p.dataset.panel !== step);
  });
  $$(".step").forEach((s) => {
    const idx = STEPS.indexOf(s.dataset.step);
    const curIdx = STEPS.indexOf(step);
    s.classList.toggle("active", idx === curIdx);
    s.classList.toggle("done", idx < curIdx);
  });
}

// ── Live language change ──────────────────────────────────────────────
function applyLang(lang) {
  if (typeof lang !== "string" || !lang) return;
  currentLang = lang;
  applyStaticTranslations();
}

async function bootstrapI18n() {
  let initial = "en";
  try {
    if (window.onboarding && typeof window.onboarding.getI18n === "function") {
      const payload = await window.onboarding.getI18n();
      if (payload && typeof payload.lang === "string") initial = payload.lang;
    }
  } catch {}
  currentLang = initial;
  applyStaticTranslations();
  if (window.onboarding && typeof window.onboarding.onLangChange === "function") {
    window.onboarding.onLangChange((payload) => {
      if (payload && typeof payload.lang === "string") applyLang(payload.lang);
    });
  }
}

// ── Wire up navigation ────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async () => {
  await bootstrapI18n();
  show("welcome");

  el("welcome-next").addEventListener("click", () => {
    show("ready");
  });

  el("ready-finish").addEventListener("click", async () => {
    await window.onboarding.complete();
  });
});
