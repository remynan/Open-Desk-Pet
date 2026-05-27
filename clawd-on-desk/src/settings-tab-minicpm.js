"use strict";

// ── MiniCPM settings tab (Remote API mode) ──
//
// Page layout (top → bottom):
//   • Page header: title + subtitle on the left, status pill on the right
//   • API 配置 / API Configuration — base URL, key, model
//   • 行为 / Behavior — narration + default thinking switches
//   • 高级设置 / Advanced (collapsed by default) — open logs

(function initSettingsTabMinicpm(root) {
  let core = null;
  let helpers = null;
  let ops = null;

  let healthTimer = null;
  let visibilityHandler = null;
  let mounted = false;
  let advancedExpanded = false;

  const HEALTH_INTERVAL_MS_SLOW = 60_000;
  const HEALTH_INTERVAL_MS_FAST = 5_000;
  const HEALTH_FAST_ATTEMPTS = 6;

  function t(key) {
    return helpers.t(key);
  }

  // ── Inline SVGs ────────────────────────────────────────────────────────
  const SVG_CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">' +
    '<path d="M9 6l6 6-6 6"/>' +
    '</svg>';

  function cleanupTimers() {
    if (healthTimer) {
      clearTimeout(healthTimer);
      healthTimer = null;
    }
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
    mounted = false;
  }

  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    for (const k of Object.keys(attrs || {})) {
      if (k === "style") Object.assign(e.style, attrs[k]);
      else if (k === "className") e.className = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") {
        e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      } else e.setAttribute(k, attrs[k]);
    }
    for (const child of children) {
      if (child == null) continue;
      e.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return e;
  }

  function softBtn(label, onClick, opts = {}) {
    const b = el("button", {
      type: "button",
      className: "soft-btn" + (opts.accent ? " accent" : ""),
      onClick,
    });
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    return b;
  }

  function sectionTitle(text) {
    const h = el("div", { className: "minicpm-section-title" });
    h.appendChild(el("span", { className: "minicpm-section-title-text" }, text));
    return h;
  }

  // ── Status pill ────────────────────────────────────────────────────────
  function deriveStatus(sidecarReady, probing) {
    if (sidecarReady) return { tone: "ready", label: t("minicpmStatusRunning") };
    if (probing) return { tone: "starting", label: t("minicpmStatusStarting") };
    return { tone: "offline", label: t("minicpmStatusError") };
  }

  function statusPill(tone, label) {
    const cls = tone === "ready"
      ? "remote-ssh-status-connected"
      : tone === "starting"
        ? "remote-ssh-status-connecting"
        : "remote-ssh-status-failed";
    return el("span", { className: `remote-ssh-status-badge ${cls}` }, label);
  }

  // ── Switch row ──────────────────────────────────────────────────────────
  function switchRow(label, hint, checked, onChange) {
    const row = el("div", { className: "row" });
    const text = el("div", { className: "row-text" });
    text.appendChild(el("span", { className: "row-label" }, label));
    if (hint) text.appendChild(el("span", { className: "row-desc" }, hint));
    row.appendChild(text);
    const sw = el("div", {
      className: "switch" + (checked ? " on" : ""),
      role: "switch",
      tabindex: "0",
      "aria-checked": checked ? "true" : "false",
    });

    let committedOn = !!checked;
    let pending = false;

    function applyVisual(on, isPending) {
      sw.classList.toggle("on", !!on);
      sw.classList.toggle("pending", !!isPending);
      sw.setAttribute("aria-checked", on ? "true" : "false");
    }

    async function runToggle() {
      if (pending) return;
      const next = !committedOn;
      pending = true;
      applyVisual(next, true);
      try {
        const result = await onChange(next);
        if (result && (result.ok === true || result.status === "ok")) {
          committedOn = next;
          applyVisual(next, false);
        } else {
          applyVisual(committedOn, false);
        }
      } catch {
        applyVisual(committedOn, false);
      } finally {
        pending = false;
      }
    }

    sw.addEventListener("click", () => { void runToggle(); });
    sw.addEventListener("keydown", (ev) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        void runToggle();
      }
    });
    const ctl = el("div", { className: "row-control" });
    ctl.appendChild(sw);
    row.appendChild(ctl);
    return row;
  }

  // ── Input row ───────────────────────────────────────────────────────────
  function inputRow(label, placeholder, value, type = "text", onChange = null) {
    const row = el("div", { className: "row" });
    const text = el("div", { className: "row-text" });
    text.appendChild(el("span", { className: "row-label" }, label));
    row.appendChild(text);

    const ctl = el("div", { className: "row-control" });
    const input = el("input", {
      type,
      className: "minicpm-api-input",
      placeholder,
    });
    input.value = value || "";
    if (onChange) {
      input.addEventListener("change", () => onChange(input.value));
      input.addEventListener("blur", () => onChange(input.value));
    }
    ctl.appendChild(input);
    row.appendChild(ctl);
    return { row, input };
  }

  // ── Health probe ────────────────────────────────────────────────────────
  async function probeHealth(ctx) {
    const snap = ctx.healthSnapshot;
    snap.probing = true;
    try {
      const result = await window.minicpmSettings.getStatus();
      snap.h = result || {};
      snap.sidecarReady = !!(result && result.ok);
      snap.llamaReady = !!(result && result.alive);
      snap.modelName = result && result.model_name;
      snap.modelDir = result && result.model_dir;
      snap.apiBaseUrl = result && result.api_base_url;
      snap.apiModel = result && result.api_model;
      if (snap.sidecarReady && snap.llamaReady) ctx.everHealthy = true;
    } catch {
      snap.h = {};
      snap.sidecarReady = false;
      snap.llamaReady = false;
    }
    snap.probing = false;
  }

  function syncStatusPill(ctx) {
    if (!ctx.statusPillSlot) return;
    const snap = ctx.healthSnapshot;
    const { tone, label } = deriveStatus(snap.sidecarReady && snap.llamaReady, snap.probing);
    ctx.statusPillSlot.innerHTML = "";
    ctx.statusPillSlot.appendChild(statusPill(tone, label));
  }

  // ── Header ──────────────────────────────────────────────────────────────
  function renderHeader(ctx) {
    ctx.headerBox.innerHTML = "";
    const header = el("div", { className: "minicpm-header" });
    const left = el("div", { className: "minicpm-header-left" });
    left.appendChild(el("div", { className: "minicpm-header-title" }, "Open Desk Pet"));
    left.appendChild(el("div", { className: "minicpm-header-subtitle" }, t("minicpmHeaderSubtitle")));
    header.appendChild(left);
    const right = el("div", { className: "minicpm-header-right" });
    ctx.statusPillSlot = el("div", { className: "minicpm-status-pill-slot" });
    right.appendChild(ctx.statusPillSlot);
    header.appendChild(right);
    ctx.headerBox.appendChild(header);
    syncStatusPill(ctx);
  }

  // ── API Configuration Section ───────────────────────────────────────────
  async function renderApiSection(box, ctx) {
    box.innerHTML = "";

    // Read API config from prefs file (not from sidecar health)
    let apiConfig = { api_base_url: "", api_model: "" };
    try {
      if (window.minicpmSettings && typeof window.minicpmSettings.getApiConfig === "function") {
        apiConfig = await window.minicpmSettings.getApiConfig();
      }
    } catch (err) {
      console.error("[minicpm] getApiConfig error:", err);
    }

    box.appendChild(sectionTitle(t("minicpmSectionApi") || "API Configuration"));
    const section = helpers.buildSection("", []);
    const rows = section.querySelector(".section-rows");

    // API Base URL
    const { row: urlRow, input: urlInput } = inputRow(
      t("minicpmApiBaseUrl") || "API Base URL",
      t("minicpmApiBaseUrlPlaceholder") || "https://api.openai.com/v1",
      apiConfig.api_base_url || "",
      "text",
      async (value) => {
        await saveApiConfig({ api_base_url: value });
      }
    );
    rows.appendChild(urlRow);

    // API Key
    const { row: keyRow, input: keyInput } = inputRow(
      t("minicpmApiKey") || "API Key",
      t("minicpmApiKeyPlaceholder") || "sk-...",
      apiConfig.api_key || "", // Show saved key (masked by password type)
      "password",
      async (value) => {
        await saveApiConfig({ api_key: value });
      }
    );
    rows.appendChild(keyRow);

    // Model Name
    const { row: modelRow, input: modelInput } = inputRow(
      t("minicpmApiModel") || "Model Name",
      t("minicpmApiModelPlaceholder") || "gpt-4o-mini",
      apiConfig.api_model || "",
      "text",
      async (value) => {
        await saveApiConfig({ api_model: value });
      }
    );
    rows.appendChild(modelRow);

    // Test connection button
    const testRow = el("div", { className: "row" });
    const testText = el("div", { className: "row-text" });
    testRow.appendChild(testText);
    const testCtl = el("div", { className: "row-control" });
    const testBtn = softBtn(t("minicpmApiTestConnection") || "Test Connection", async () => {
      testBtn.disabled = true;
      testBtn.textContent = "Testing...";
      try {
        // Get current input values
        const testBaseUrl = urlInput.value.trim();
        const testKey = keyInput.value.trim();
        const testModel = modelInput.value.trim();

        if (!testBaseUrl) {
          if (ops && typeof ops.showToast === "function") {
            ops.showToast("Please enter API Base URL", { error: true });
          }
          return;
        }

        // Test connection directly to the API
        const result = await window.minicpmSettings.testApiConnection({
          api_base_url: testBaseUrl,
          api_key: testKey,
          api_model: testModel,
        });

        if (result.ok) {
          // Save config and restart sidecar
          await saveApiConfig({
            api_base_url: testBaseUrl,
            api_key: testKey,
            api_model: testModel,
          });

          const modelInfo = result.models && result.models.length > 0
            ? ` (${result.models.length} models available)`
            : "";
          if (ops && typeof ops.showToast === "function") {
            ops.showToast((t("minicpmApiTestSuccess") || "Connection successful!") + modelInfo, { error: false });
          }

          // Refresh status
          await probeHealth(ctx);
          syncStatusPill(ctx);
        } else {
          if (ops && typeof ops.showToast === "function") {
            ops.showToast((t("minicpmApiTestFailed") || "Connection failed") + ": " + (result.error || "Unknown error"), { error: true });
          }
        }
      } catch (err) {
        if (ops && typeof ops.showToast === "function") {
          ops.showToast((t("minicpmApiTestFailed") || "Connection failed") + ": " + (err.message || err), { error: true });
        }
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = t("minicpmApiTestConnection") || "Test Connection";
      }
    }, { accent: true });
    testCtl.appendChild(testBtn);
    testRow.appendChild(testCtl);
    rows.appendChild(testRow);

    box.appendChild(section);
  }

  async function saveApiConfig(partial) {
    try {
      // Read current prefs, merge, write back
      const result = await window.minicpmSettings.saveApiConfig(partial);
      return result;
    } catch (err) {
      console.error("[minicpm] saveApiConfig error:", err);
      return { ok: false, error: err.message };
    }
  }

  // ── Behavior Section ─────────────────────────────────────────────────────
  async function renderBehaviorSection(box, ctx) {
    box.innerHTML = "";
    box.appendChild(sectionTitle(t("minicpmSectionBehavior")));
    const section = helpers.buildSection("", []);
    const rows = section.querySelector(".section-rows");

    // Narration toggle
    const narrationResult = await window.minicpmSettings.getNarrationEnabled();
    const narrationEnabled = !!(narrationResult && narrationResult.enabled);
    rows.appendChild(switchRow(
      t("minicpmRowNarration"),
      t("minicpmRowNarrationHint"),
      narrationEnabled,
      async (on) => {
        return await window.minicpmSettings.setNarrationEnabled(on);
      }
    ));

    // Default thinking toggle
    const thinkingResult = await window.minicpmSettings.getDefaultThinking();
    const defaultThinking = !!(thinkingResult && thinkingResult.enabled);
    rows.appendChild(switchRow(
      t("minicpmRowThinking"),
      t("minicpmRowThinkingHint"),
      defaultThinking,
      async (on) => {
        return await window.minicpmSettings.setDefaultThinking(on);
      }
    ));

    box.appendChild(section);
  }

  // ── Advanced Section ─────────────────────────────────────────────────────
  function renderAdvancedSection(box, ctx) {
    box.innerHTML = "";

    const header = el("div", { className: "minicpm-advanced-header" });
    const title = el("span", { className: "minicpm-advanced-title" }, t("minicpmSectionAdvanced"));
    const chevron = el("span", { className: "minicpm-advanced-chevron" + (advancedExpanded ? " is-expanded" : "") });
    chevron.innerHTML = SVG_CHEVRON;
    header.appendChild(title);
    header.appendChild(chevron);
    header.addEventListener("click", () => {
      advancedExpanded = !advancedExpanded;
      chevron.classList.toggle("is-expanded", advancedExpanded);
      content.style.display = advancedExpanded ? "block" : "none";
    });
    box.appendChild(header);

    const content = el("div", {
      className: "minicpm-advanced-content",
      style: { display: advancedExpanded ? "block" : "none" },
    });

    const section = helpers.buildSection("", []);
    const rows = section.querySelector(".section-rows");

    // Open logs button
    const logsRow = el("div", { className: "row" });
    const logsText = el("div", { className: "row-text" });
    logsText.appendChild(el("span", { className: "row-label" }, t("minicpmRowLogs")));
    logsRow.appendChild(logsText);
    const logsCtl = el("div", { className: "row-control" });
    const logsBtn = softBtn(t("minicpmOpenLogs"), async () => {
      await window.minicpmSettings.openLogsDir();
    });
    logsCtl.appendChild(logsBtn);
    logsRow.appendChild(logsCtl);
    rows.appendChild(logsRow);

    content.appendChild(section);
    box.appendChild(content);
  }

  // ── Refresh all ──────────────────────────────────────────────────────────
  async function refreshAll(ctx) {
    if (!window.minicpmSettings || !ctx) return;
    await probeHealth(ctx);
    syncStatusPill(ctx);
    await renderApiSection(ctx.apiBox, ctx);
    await renderBehaviorSection(ctx.behaviorBox, ctx);
    renderAdvancedSection(ctx.advancedBox, ctx);
  }

  function nextHealthDelay(ctx) {
    if (!ctx.everHealthy && ctx.fastAttemptsLeft > 0) return HEALTH_INTERVAL_MS_FAST;
    return HEALTH_INTERVAL_MS_SLOW;
  }

  function startHealthPolling(ctx) {
    if (healthTimer) {
      clearTimeout(healthTimer);
      healthTimer = null;
    }
    const tick = async () => {
      healthTimer = null;
      if (!mounted || document.hidden || core.state.activeTab !== "minicpm") return;
      await probeHealth(ctx);
      syncStatusPill(ctx);
      await renderApiSection(ctx.apiBox, ctx);
      if (!ctx.everHealthy && ctx.fastAttemptsLeft > 0) ctx.fastAttemptsLeft -= 1;
      healthTimer = setTimeout(tick, nextHealthDelay(ctx));
    };
    healthTimer = setTimeout(tick, nextHealthDelay(ctx));
  }

  function armFastProbes(ctx) {
    ctx.fastAttemptsLeft = HEALTH_FAST_ATTEMPTS;
  }

  // ── Main render ──────────────────────────────────────────────────────────
  async function render(parent) {
    cleanupTimers();
    parent.innerHTML = "";

    const ctx = {
      headerBox: el("div", {}),
      apiBox: el("div", { className: "minicpm-section-box" }),
      behaviorBox: el("div", { className: "minicpm-section-box" }),
      advancedBox: el("div", { className: "minicpm-section-box" }),
      statusPillSlot: null,
      everHealthy: false,
      fastAttemptsLeft: HEALTH_FAST_ATTEMPTS,
      healthSnapshot: {
        h: {}, sidecarReady: false, llamaReady: false, probing: true,
        modelName: null, modelDir: null, apiBaseUrl: null, apiModel: null,
      },
      refreshAll: null,
    };
    ctx.refreshAll = () => {
      armFastProbes(ctx);
      const p = refreshAll(ctx);
      startHealthPolling(ctx);
      return p;
    };

    renderHeader(ctx);

    if (!window.minicpmSettings) {
      parent.appendChild(ctx.headerBox);
      const msg = el("div", { className: "minicpm-error" }, "minicpmSettings not available");
      parent.appendChild(msg);
      return;
    }

    parent.appendChild(ctx.headerBox);
    parent.appendChild(ctx.apiBox);
    parent.appendChild(ctx.behaviorBox);
    parent.appendChild(ctx.advancedBox);

    mounted = true;
    await ctx.refreshAll();
    startHealthPolling(ctx);

    visibilityHandler = () => {
      if (!document.hidden && mounted) {
        startHealthPolling(ctx);
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }

  // ── Export ───────────────────────────────────────────────────────────────
  function init(c) {
    core = c;
    helpers = c.helpers;
    ops = c.ops;
    // Register this tab to core.tabs so renderContent can find it
    core.tabs.minicpm = {
      render,
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { init };
  } else if (root) {
    root.ClawdSettingsTabMinicpm = { init };
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
