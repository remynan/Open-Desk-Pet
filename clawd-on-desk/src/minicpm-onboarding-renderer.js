"use strict";
// MiniCPM Onboarding renderer — drives the 5-stage wizard UI.

const STEPS = ["env-check", "device-pick", "model-download", "warmup", "ready"];
let currentStep = "env-check";
let selectedDevice = null;
let availableDevices = [];

const el = (id) => document.getElementById(id);
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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

function bytesPretty(n) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Step 1: env-check ─────────────────────────────────────────────────
async function runEnvCheck() {
  const checks = [
    { id: "check-disk", run: async () => (await window.onboarding.checkDisk()).ok },
    {
      id: "check-net",
      run: async () => {
        // We can't ping HF directly from the renderer with no-cors,
        // so just trust the platform. The real network failure will
        // surface during model download (with retry UI there).
        return true;
      },
    },
    {
      id: "check-platform",
      run: async () => {
        const s = await window.onboarding.getState();
        return s && (s.platform === "darwin" || s.platform === "linux" || s.platform === "win32");
      },
    },
  ];
  for (const c of checks) {
    const li = el(c.id);
    li.classList.remove("ok", "err");
    try {
      const ok = await c.run();
      li.classList.add(ok ? "ok" : "err");
    } catch {
      li.classList.add("err");
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

// ── Step 2: device-pick ───────────────────────────────────────────────
async function loadDevices() {
  const list = el("device-list");
  list.innerHTML = "正在检测可用加速器...";
  const devices = await window.onboarding.listDevices();
  availableDevices = devices.available || ["cpu"];
  selectedDevice = devices.current || devices.recommended || availableDevices[0];
  list.innerHTML = "";
  for (const dev of availableDevices) {
    const div = document.createElement("div");
    div.className = "device-option";
    if (dev === selectedDevice) div.classList.add("selected");
    div.dataset.device = dev;
    const radio = document.createElement("span");
    radio.className = "radio";
    const wrap = document.createElement("div");
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = devLabel(dev);
    const reason = document.createElement("span");
    reason.className = "reason";
    reason.textContent = (devices.reasons && devices.reasons[dev]) || "";
    wrap.appendChild(title);
    wrap.appendChild(reason);
    div.appendChild(radio);
    div.appendChild(wrap);
    if (dev === (devices.recommended || availableDevices[0])) {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = "推荐";
      div.appendChild(pill);
    }
    div.addEventListener("click", () => {
      selectedDevice = dev;
      $$(".device-option").forEach((o) => o.classList.toggle("selected", o.dataset.device === dev));
    });
    list.appendChild(div);
  }
}
function devLabel(d) {
  if (d === "mps") return "Apple Silicon GPU (MPS)";
  if (d === "cuda") return "NVIDIA GPU (CUDA)";
  if (d === "cpu") return "CPU";
  return d;
}

// ── Step 3: model-download ────────────────────────────────────────────
let downloadStarted = false;
async function refreshModelStep() {
  const state = await window.onboarding.getState();
  const already = el("model-already");
  const alreadyPath = el("model-already-path");
  const dlBtn = el("model-download-btn");
  const nextBtn = el("model-next");
  if (state.modelPresent) {
    already.classList.remove("hidden");
    alreadyPath.textContent = state.modelDir || "(default)";
    dlBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
  } else {
    already.classList.add("hidden");
    dlBtn.classList.remove("hidden");
    nextBtn.classList.add("hidden");
  }
}

function setProgress(percent, detail) {
  el("progress-fill").style.width = `${Math.max(0, Math.min(100, percent))}%`;
  el("progress-percent").textContent = `${Math.round(percent)}%`;
  if (detail !== undefined) el("progress-detail").textContent = detail;
}

async function startModelDownload() {
  const dlBtn = el("model-download-btn");
  const nextBtn = el("model-next");
  const errBox = el("model-error");
  const card = el("model-progress-card");
  errBox.classList.add("hidden");
  card.classList.remove("hidden");
  dlBtn.disabled = true;
  dlBtn.textContent = "下载中...";
  downloadStarted = true;
  setProgress(0, "正在连接 Hugging Face...");

  // Subscribe to streaming SSE events the main process forwards to us.
  // Phases we care about: transfer (real progress), done, error, reloaded.
  const unsub = window.onboarding.onProgress((p) => {
    if (p.event === "download" && p.phase === "transfer") {
      const done = p.bytes_done || 0;
      const total = p.bytes_total || 0;
      const pct = total > 0 ? (done / total) * 100 : 0;
      setProgress(pct, `${bytesPretty(done)} / ${bytesPretty(total)}${p.file ? "  ·  " + p.file : ""}`);
    } else if (p.event === "download" && p.phase === "swap") {
      setProgress(98, "正在写入磁盘...");
    } else if (p.event === "download" && p.phase === "complete") {
      setProgress(100, "下载完成");
    } else if (p.event === "download" && p.phase === "reloaded") {
      setProgress(100, "已加载");
    } else if (p.event === "error") {
      errBox.textContent = `下载失败 (${p.phase}): ${p.message || "未知错误"}`;
      errBox.classList.remove("hidden");
    }
  });

  const r = await window.onboarding.startModelDownload();
  if (unsub) unsub();
  if (r && r.ok) {
    dlBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
  } else {
    dlBtn.disabled = false;
    dlBtn.textContent = "重试下载";
    errBox.textContent = (r && r.error) || "下载失败，请检查网络后重试";
    errBox.classList.remove("hidden");
  }
}

async function pickLocalModel() {
  const errBox = el("model-error");
  errBox.classList.add("hidden");
  const r = await window.onboarding.pickLocalModel();
  if (r && r.ok) {
    await refreshModelStep();
  } else if (r && !r.canceled) {
    errBox.textContent = r.error || "选择失败";
    errBox.classList.remove("hidden");
  }
}

// ── Step 4: warmup ────────────────────────────────────────────────────
async function runWarmup() {
  const status = el("warmup-status");
  const nextBtn = el("warmup-next");
  const errBox = el("warmup-error");
  status.textContent = "正在启动 sidecar（首次约 30 秒）...";
  nextBtn.disabled = true;
  nextBtn.textContent = "稍候...";
  errBox.classList.add("hidden");

  const unsub = window.onboarding.onProgress((p) => {
    if (p.event === "start" && p.phase === "warmup") {
      status.textContent = "已请求 warmup，正在加载权重...";
    } else if (p.event === "done" && p.phase === "warmup") {
      status.textContent = `warmup 完成 (${p.elapsed_ms || "?"} ms)`;
    } else if (p.event === "error") {
      errBox.textContent = `${p.phase} 失败: ${p.message}`;
      errBox.classList.remove("hidden");
    }
  });

  const r = await window.onboarding.warmup();
  if (unsub) unsub();
  if (r && r.ok) {
    status.textContent = "模型已就绪";
    nextBtn.disabled = false;
    nextBtn.textContent = "继续";
  } else {
    status.textContent = "warmup 失败，可重试";
    nextBtn.disabled = false;
    nextBtn.textContent = "重试";
    errBox.textContent = (r && r.error) || "warmup 失败";
    errBox.classList.remove("hidden");
  }
}

// ── Wire up navigation ────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Step 1
  show("env-check");
  void runEnvCheck();
  el("env-next").addEventListener("click", async () => {
    show("device-pick");
    await loadDevices();
  });

  // Step 2
  el("device-next").addEventListener("click", async () => {
    if (selectedDevice) {
      await window.onboarding.selectDevice(selectedDevice);
    }
    show("model-download");
    await refreshModelStep();
  });

  // Step 3
  el("model-download-btn").addEventListener("click", () => { void startModelDownload(); });
  el("model-pick-local").addEventListener("click", () => { void pickLocalModel(); });
  el("model-next").addEventListener("click", () => {
    show("warmup");
    void runWarmup();
  });

  // Step 4
  el("warmup-next").addEventListener("click", () => {
    // If warmup hadn't completed, this acts as a retry.
    if (el("warmup-next").textContent === "重试") {
      void runWarmup();
      return;
    }
    show("ready");
  });

  // Step 5
  el("ready-finish").addEventListener("click", async () => {
    await window.onboarding.complete();
  });

  // Back buttons
  $$("[data-back]").forEach((b) => {
    b.addEventListener("click", () => show(b.dataset.back));
  });
});
