---
name: deploy-minicpm-pet
description: >-
  [开发者向] 帮 contributor / 开发者从源码 dev 模式跑通 MiniCPM-test。
  普通用户应直接下载 dmg 安装包，跟着 Onboarding 引导走，不应触发本 skill。
  Use when a developer clones the repo and wants to run it from source, or asks to
  "部署桌宠 (从源码)", "跑起来 MiniCPM dev 模式", or hits errors during go.sh / npm start / uv sync.
---

# Deploying MiniCPM-test (开发者从源码)

> **重要**：这个 Skill 只针对开发者。普通最终用户走的是 **下载 dmg → Onboarding** 流程，不应使用本 Skill。如果对方只是想"用一下这个应用"，请引导他们去 [Releases](https://github.com/EEEEEKKO/MiniCPM-test/releases) 下载 dmg。

This skill walks the agent through deploying the MiniCPM-test project on a colleague's machine **from source**. The project has 3 moving parts that need to come up in the right order.

## Quick assessment first

Before doing anything, check what state the colleague's machine is in:

```bash
# Are we in the repo root?
ls README.md go.sh clawd-on-desk minicpm-pet-bridge-uv 2>&1 | head -5

# What's already installed?
command -v node && node -v          # need 18+
command -v uv && uv --version       # optional, go.sh installs if missing
command -v conda                    # only needed for original (non-uv) path
```

If the user isn't in the repo root, `cd` to wherever they cloned it first.

## Critical prerequisite: base model

The base model (~2GB BF16) is **NOT** in the repo. Without it, nothing runs.

**Check first**:
```bash
ls -la models/minicpm5-0.9b/config.json 2>&1
```

If missing, the user needs the model. Three ways to get it:

1. **They already have it locally** (most likely — colleagues already do MiniCPM work):
   ```bash
   mkdir -p models
   ln -s /absolute/path/to/their/minicpm5-0.9b models/minicpm5-0.9b
   ```
2. **From a teammate's machine** (`scp -r`):
   ```bash
   scp -r teammate@host:/path/to/minicpm5-0.9b ./models/
   ```
3. **From Hugging Face** (if there's a public/internal HF repo):
   ```bash
   pip install -U huggingface_hub
   hf download openbmb/MiniCPM5-0.9B --local-dir models/minicpm5-0.9b
   ```

**Do not proceed past this step** until `models/minicpm5-0.9b/config.json` exists.

## Two install paths — pick one

### Path A: uv (recommended, what go.sh uses)

```bash
./go.sh
```

`go.sh` is idempotent. It will:

1. Check macOS / Node 18+ (auto-install Node via brew or fnm if missing)
2. Auto-install `uv` if missing (`curl install.sh`)
3. `uv sync` in `minicpm-pet-bridge-uv/` (downloads ~700MB torch + transformers, first time only)
4. `npm install` in `clawd-on-desk/` (~1 minute, first time only)
5. Set `MINICPM_BRIDGE_DIR` + `MINICPM_PYTHON` env vars
6. `npm start` to launch Electron

If only the dependency-install part is needed (no launch yet):
```bash
./go.sh setup
```

If something seems broken, environment-check only:
```bash
./go.sh doctor
```

### Path B: conda + pip (legacy, more familiar)

If the colleague refuses uv or has conda muscle memory:

```bash
# Create env
conda create -n minicpm-pet python=3.11 -y
conda activate minicpm-pet

# Python deps
cd minicpm-pet-bridge
pip install -r requirements.txt
cd ..

# Node deps
cd clawd-on-desk
npm install
cd ..

# Launch (the Electron app spawns the Python sidecar itself)
cd clawd-on-desk
npm start
```

The Electron app's `Sidecar` class auto-detects the conda env named `minicpm-pet` (override with env vars `MINICPM_PYTHON` / `MINICPM_BRIDGE_DIR`).

## Verifying the deploy

Once Electron starts, you should see:

1. **Menu bar icon** — small paw, top-right
2. **Floating pet** — sitting on the desktop, can be dragged
3. **Sidecar log** in terminal — `[engine] ready` then `[engine] warming up kernels…` then `warmup done`

Quick sanity check (in another terminal):
```bash
curl -s http://127.0.0.1:18765/api/health | python3 -m json.tool
```

Expected:
```json
{"ok": true, "device": "mps", "dtype": "bfloat16", "model_dir": "...", ...}
```

Then click the pet (or `⌘⇧M`), type "你好" — pet should think and reply within a few seconds.

## Common deploy failures & fixes

### `Cannot find module 'electron'` / `npm start` fails immediately
```bash
cd clawd-on-desk && npm install
```

### `ModuleNotFoundError: torch` (or transformers)
```bash
# uv path
cd minicpm-pet-bridge-uv && uv sync
# conda path
conda activate minicpm-pet && cd minicpm-pet-bridge && pip install -r requirements.txt
```

### Sidecar log says `RuntimeError: ... No such file ... config.json`
Base model isn't where the bridge expects. Either fix the symlink:
```bash
ls -la models/minicpm5-0.9b/config.json
```
or override the model dir:
```bash
MINICPM_MODEL_DIR=/abs/path npm start
```

### Pet starts but "气泡聊天没反应 / 卡住"
Probably the sidecar didn't come up. In `clawd-on-desk` terminal, look for `[sidecar]` lines.
- If sidecar can't find Python: set `MINICPM_PYTHON` to the right interpreter path
- If sidecar crashed during model load: check Activity Monitor for memory pressure (model needs ~2GB RAM resident)

### `port 18765 in use`
Old sidecar didn't die cleanly. Kill it:
```bash
lsof -ti:18765 | xargs kill -9
```

### `~/.cursor/hooks.json` doesn't get the cursor-hook
This is supposed to auto-register on first launch. If it didn't, force a sync:
```bash
# In Electron app: Settings → 🐾 MiniCPM (or just restart the pet)
# OR manually:
cd clawd-on-desk
node -e "require('./hooks/cursor-install.js').registerCursorHooks({silent:false})"
```

## Updating someone else's already-deployed install

If a teammate already has v0.1 / older v0.2 and wants the latest:

```bash
git pull
./go.sh setup     # re-syncs deps if anything changed
./go.sh start
```

`uv sync` and `npm install` are idempotent — no-op if nothing changed.

## What "success" looks like

The deploy is done when:
- ✅ Pet visible on desktop
- ✅ `curl -s http://127.0.0.1:18765/api/health` returns `ok:true`
- ✅ Click pet → bubble pops up → type a message → reply within a few seconds
- ✅ In Cursor: ask Cursor anything → after Cursor finishes → pet says a one-line reaction (proves cursor-hook is wired)
- ✅ `Settings → 🐾 MiniCPM` shows current model + adapter status

If any of these fail, walk back through the corresponding "Common failure" section above.
