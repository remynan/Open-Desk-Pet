# MiniCPM-Desk-Pet

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![Upstream: clawd-on-desk](https://img.shields.io/badge/fork%20of-rullerzhou--afk%2Fclawd--on--desk-orange)](https://github.com/rullerzhou-afk/clawd-on-desk)
[![Model: MiniCPM5-0.9B](https://img.shields.io/badge/model-MiniCPM5--0.9B-green)](https://github.com/OpenBMB/MiniCPM)

**English** | [中文说明](#中文说明)

MiniCPM-Desk-Pet is a local-first desktop pet powered by
[MiniCPM5-0.9B](https://github.com/OpenBMB/MiniCPM). It combines an
Electron desktop companion with a lightweight `llama.cpp` inference sidecar,
so users can chat with MiniCPM locally and let the pet react to coding-agent
events from Cursor, Claude Code, Codex, and related tools.

> **Attribution.** The desktop pet UI in [`clawd-on-desk/`](clawd-on-desk/)
> is a vendored fork of
> [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
> at upstream commit `5b1f003`. MiniCPM-Desk-Pet adds local MiniCPM5
> inference, onboarding, GGUF model management, LoRA persona switching, and
> MiniCPM-powered narration on top of that work. See [`NOTICE.md`](./NOTICE.md)
> for the full attribution chain.

## Highlights

- **Local MiniCPM chat**: GGUF inference through `llama-server`, with Metal on
  Apple Silicon, CUDA on NVIDIA, and CPU fallback.
- **Desktop pet UI**: an Electron companion that can stay on your desktop and
  surface chat, task-completion, and agent-status cues.
- **Coding-agent narration**: Cursor / Claude Code / Codex events can trigger
  short MiniCPM-powered summaries and reactions.
- **First-run onboarding**: environment check, accelerator detection, model
  download, sidecar warmup, and ready state are handled in-app.
- **Persona LoRA support**: switch or import GGUF LoRA adapters from
  **Settings -> MiniCPM**; bundled adapters are loaded per request to avoid
  cross-session contamination.
- **Small app package**: the app ships a thin gateway and `llama-server`;
  model weights are downloaded separately on first launch.

## Status

The primary release target is **macOS Apple Silicon (M1+)**. The macOS MVP
path is working end to end: download the DMG, complete onboarding, download a
GGUF model, warm up the sidecar, and start chatting with the pet.

Windows and Linux builds share the same sidecar architecture, but they may lag
behind macOS in QA coverage. The DMG is not notarized yet; see the install
notes below if macOS Gatekeeper blocks the first launch.

## Install

1. Download the latest macOS Apple Silicon `.dmg` from
   [Releases](https://github.com/OpenBMB/MiniCPM-Desk-Pet/releases).
2. Open the DMG and drag the app into `Applications`.
3. If macOS says the developer cannot be verified, either:
   - right-click the app icon, choose **Open**, then confirm **Open**; or
   - run `xattr -cr /Applications/MiniCPM\ Desk\ Pet.app` and open it again.
4. Follow the five-step onboarding flow:
   - environment check
   - accelerator detection
   - GGUF model download from Hugging Face
   - sidecar launch and warmup
   - ready state

No Python, conda, uv, PyTorch, or terminal setup is required for normal use.

## Daily Use

- `Cmd+Shift+M`: toggle the MiniCPM chat bubble.
- `Cmd+Shift+T`: toggle thinking-mode display.
- `Esc`: close the bubble when it has focus.
- Right-click the pet, then open **Settings -> MiniCPM** to change the GGUF
  path, accelerator, chat-bubble position, narration toggle, onboarding state,
  or active LoRA persona.

## Persona Adapter

The bundled neko-style LoRA adapter is fine-tuned from MiniCPM5-0.9B using
[liumindmind/NekoQA-30K](https://huggingface.co/datasets/liumindmind/NekoQA-30K),
a Hugging Face dataset with 30,834 cat-girl QA samples across categories such
as ACG, emotional support, creative writing, safety, math, code, and workplace
scenarios. The Hugging Face dataset card lists the dataset license as
Apache-2.0.

The adapter is provided as both PEFT source artifacts and a GGUF LoRA file for
`llama-server`. See [`adapters/README.md`](adapters/README.md) and
[`adapters/lora_nekoqa_adapter_20260515_0738/USAGE.md`](adapters/lora_nekoqa_adapter_20260515_0738/USAGE.md)
for conversion details, smoke-test prompts, and known limitations.

## Developer Quickstart

See [`docs/development.md`](docs/development.md) for the full development
guide. The short path is:

```bash
git clone git@github.com:OpenBMB/MiniCPM-Desk-Pet.git
cd MiniCPM-Desk-Pet

mkdir -p models
# Drop a GGUF you already have, or let onboarding download one on first launch.
cp /path/to/your/minicpm5-0.9b.Q4_K_M.gguf models/

./go.sh        # dev mode: build llama-server if needed, sync gateway, launch app
./go.sh build  # package a macOS arm64 DMG
```

The inference sidecar lives in [`minicpm-sidecar/`](minicpm-sidecar/) and wraps
`llama.cpp` with a thin FastAPI gateway. The Electron desktop app lives in
[`clawd-on-desk/`](clawd-on-desk/).

## Documentation

- [`minicpm-sidecar/README.md`](minicpm-sidecar/README.md): sidecar overview,
  API, build flow, and vendored `llama.cpp` branch.
- [`docs/development.md`](docs/development.md): developer setup and repository
  layout.
- [`docs/llama-cpp-migration.md`](docs/llama-cpp-migration.md): migration from
  the older PyTorch sidecar to `llama.cpp`.
- [`adapters/README.md`](adapters/README.md): LoRA adapter format, conversion,
  loading, and packaging notes.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution workflow and test
  expectations.
- [`CHANGELOG.md`](CHANGELOG.md): version history.
- [`docs/archive/`](docs/archive/): archived v0.7 design and architecture docs.

## 中文说明

MiniCPM-Desk-Pet 是一个本地优先的 MiniCPM5-0.9B 桌宠实验项目：Electron 桌宠负责
交互和事件展示，`minicpm-sidecar/` 通过 `llama.cpp` 的 `llama-server` 加载 GGUF
模型，在 Apple Silicon 上走 Metal，在 NVIDIA 上走 CUDA，并保留 CPU fallback。

普通用户只需要从
[Releases](https://github.com/OpenBMB/MiniCPM-Desk-Pet/releases) 下载 macOS DMG，
双击安装后跟随 Onboarding 完成环境检查、加速器探测、模型下载、sidecar warmup 和
就绪流程。日常可用 `Cmd+Shift+M` 打开聊天气泡，或在右键菜单的
**Settings -> MiniCPM** 中切换模型路径、旁白、加速器和 LoRA 人格。

本项目的桌宠 UI 层 fork 自
[rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
（upstream commit `5b1f003`），并在此基础上加入 MiniCPM5 本地推理、模型下载、
Onboarding、LoRA 人格切换和 coding-agent 旁白。完整归属信息请见
[`NOTICE.md`](./NOTICE.md)。

内置猫娘风格 LoRA 使用 Hugging Face 上的
[liumindmind/NekoQA-30K](https://huggingface.co/datasets/liumindmind/NekoQA-30K)
数据集微调，该数据集包含 30,834 条猫娘问答样本，覆盖 ACG、心理疗愈、创意写作、
安全、数学、代码、职场等类别；Hugging Face 数据集卡片标注其许可证为 Apache-2.0。

## Acknowledgments

- **Desktop pet UI**: forked from
  [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
  at upstream commit `5b1f003`. Thanks to
  [@rullerzhou-afk](https://github.com/rullerzhou-afk) and all upstream
  contributors.
- **Inference backend**: built on
  [llama.cpp](https://github.com/ggml-org/llama.cpp) (MIT, © Georgi Gerganov
  and contributors). MiniCPM5 tokenizer support is currently vendored from
  [zhangtao2-1/llama.cpp@c5ede29](https://github.com/zhangtao2-1/llama.cpp).
- **Model weights**: loaded from
  [OpenBMB/MiniCPM](https://github.com/OpenBMB/MiniCPM); weights are not bundled
  in this repository.
- **Persona data**: the bundled neko LoRA uses
  [liumindmind/NekoQA-30K](https://huggingface.co/datasets/liumindmind/NekoQA-30K)
  for fine-tuning.
- See [`NOTICE.md`](./NOTICE.md) and
  [`clawd-on-desk/NOTICE.md`](clawd-on-desk/NOTICE.md) for the authoritative
  third-party attribution list.

## License

This repository is distributed under
[GNU AGPL-3.0-only](./LICENSE), matching the upstream `clawd-on-desk` license.

- **Source code** in this repository, including `clawd-on-desk/`,
  `minicpm-sidecar/`, and adapter tooling, is distributed under AGPL-3.0-only.
- **MiniCPM model weights** are downloaded separately and are governed by the
  [OpenBMB MiniCPM Model License](https://github.com/OpenBMB/MiniCPM/blob/main/MiniCPM%20Model%20License.md),
  not by AGPL.
- **Fine-tuning datasets** keep their own licenses; NekoQA-30K is cited above
  with its Hugging Face dataset page.
- **Artwork and theme assets** follow the rights and notices listed in the
  upstream `clawd-on-desk/NOTICE.md`.

Under AGPL-3.0 section 13, if you run a modified version of this project as a
network service, you must provide users with access to the complete
corresponding source code. The public source for this project is
https://github.com/OpenBMB/MiniCPM-Desk-Pet.
