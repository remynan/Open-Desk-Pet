<p align="center">
  <img src="assets/readme%20logo.png" alt="Open Desk Pet" width="760">
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Version-0.7.1--r--r1-orange" alt="Version">
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey" alt="Platform">
</p>

<p align="center">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  A desktop pet powered by remote OpenAI-compatible APIs. Configure your own API endpoint and chat with a tiny companion that lives on your desktop.
</p>

---

> **Note:** This project is a fork of [MiniCPM Desk Pet](https://github.com/OpenBMB/MiniCPM-Desk-Pet) by **remynan**. 
> 
> The main difference: **Open Desk Pet** uses remote OpenAI-compatible APIs (OpenAI, DeepSeek, Moonshot, Ollama, etc.) instead of local llama.cpp inference. This means no local model download, no GPU requirements, and faster setup.

---

## Highlights

- **Remote API powered** — connect to any OpenAI-compatible API service
- **Zero local model** — no large model files to download or manage
- **Flexible configuration** — use OpenAI, DeepSeek, Moonshot, local Ollama, or any compatible service
- **Easy setup** — just configure your API URL, key, and model name
- **Desktop companion** — open a floating chat bubble and talk with your pet
- **Agent-aware reactions** — the pet can react to coding activity from tools such as Cursor, Claude Code, and Codex

## Getting Started

### System Requirements

| Item | Recommended |
| --- | --- |
| macOS | 14.0+, Apple Silicon or Intel |
| Windows | x64 |
| Network | Required for API calls |

### Installation

**macOS**

1. Go to [Releases](https://github.com/remynan/Open-Desk-Pet/releases) and download the latest `Open Desk Pet-*-arm64.dmg`.
2. Open the DMG and drag **Open Desk Pet** into `Applications`.
3. Launch the app and configure your API settings.

If macOS blocks the first launch, right-click the app and choose **Open**. If needed, remove the quarantine flag:

```bash
xattr -cr /Applications/Open\ Desk\ Pet.app
```

**Windows**

1. Go to [Releases](https://github.com/remynan/Open-Desk-Pet/releases) and download the latest `.exe` installer.
2. Run the installer and complete the wizard.
3. Launch the app and configure your API settings.

### Configuration

On first launch, open **Settings → Open Desk Pet** and configure:

1. **API Base URL** — your API endpoint (e.g., `https://api.openai.com/v1`)
2. **API Key** — your API key
3. **Model Name** — the model to use (e.g., `gpt-4o-mini`, `deepseek-chat`)

Click **Test Connection** to verify your settings.

## Features

### Chat With Your Desktop Pet

Use the floating chat bubble to talk with your pet from your desktop.

Useful shortcuts (macOS uses `Cmd`, Windows uses `Ctrl`):

- `Cmd/Ctrl+Shift+M` — open or close the chat bubble
- `Cmd/Ctrl+Shift+T` — show or hide thinking mode
- `Esc` — close the bubble when input is focused

### Reactions While You Work

Open Desk Pet can stay beside your workspace and react to coding-agent activity: thinking, working, finishing tasks, waiting for attention, or going idle.

## Supported API Providers

Open Desk Pet works with any OpenAI-compatible API:

- **OpenAI** — `https://api.openai.com/v1`
- **DeepSeek** — `https://api.deepseek.com/v1`
- **Moonshot** — `https://api.moonshot.cn/v1`
- **Local Ollama** — `http://localhost:11434/v1`
- **Any OpenAI-compatible service**

## Differences from MiniCPM Desk Pet

| Feature | MiniCPM Desk Pet | Open Desk Pet |
|---------|------------------|---------------|
| Inference | Local llama.cpp | Remote API |
| Model | MiniCPM5-1B GGUF | Any OpenAI-compatible model |
| Disk Space | ~2GB for model | Minimal |
| GPU | Recommended | Not required |
| Setup | Download model | Configure API |
| Offline | Yes | No |

## Developer Notes

For development setup, packaging, and repository layout, see [`docs/development.md`](docs/development.md).

## Acknowledgments

- Forked from [MiniCPM Desk Pet](https://github.com/OpenBMB/MiniCPM-Desk-Pet) by OpenBMB
- Desktop pet UI is based on [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
- Full attribution is listed in [`NOTICE.md`](./NOTICE.md)

## License

This repository is distributed under [GNU AGPL-3.0-only](./LICENSE).

Original MiniCPM Desk Pet is licensed under [GNU AGPL-3.0-only](https://github.com/OpenBMB/MiniCPM-Desk-Pet/blob/main/LICENSE).
