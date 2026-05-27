<p align="center">
  <img src="assets/readme%20logo.png" alt="Open Desk Pet" width="760">
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Version-0.7.1--r--r1-orange" alt="Version">
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey" alt="Platform">
</p>

<p align="center">
  <a href="README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  一个由远程 OpenAI 兼容 API 驱动的桌面宠物。配置你自己的 API 端点，和桌面上的小伙伴聊天。
</p>

---

> **说明：** 本项目是 [MiniCPM Desk Pet](https://github.com/OpenBMB/MiniCPM-Desk-Pet) 的 fork，由 **remynan** 维护。
>
> 主要区别：**Open Desk Pet** 使用远程 OpenAI 兼容 API（OpenAI、DeepSeek、Moonshot、Ollama 等），而非本地 llama.cpp 推理。这意味着无需下载本地模型、无需 GPU 要求、设置更简单。

---

## 项目亮点

- **远程 API 驱动**：连接任意 OpenAI 兼容 API 服务
- **无需本地模型**：无需下载大型模型文件
- **灵活配置**：支持 OpenAI、DeepSeek、Moonshot、本地 Ollama 或任意兼容服务
- **设置简单**：只需配置 API URL、密钥和模型名称
- **桌面聊天伙伴**：打开悬浮聊天气泡，和桌宠对话
- **感知工作状态**：可根据 Cursor、Claude Code、Codex 等工具的活动展示不同状态

## 快速开始

### 系统要求

| 项目 | 推荐配置 |
| --- | --- |
| macOS | 14.0+，Apple Silicon 或 Intel |
| Windows | x64 |
| 网络 | 需要 API 调用 |

### 安装

**macOS**

1. 前往 [Releases](https://github.com/remynan/Open-Desk-Pet/releases) 下载最新 `Open Desk Pet-*-arm64.dmg`。
2. 打开 DMG，将 **Open Desk Pet** 拖入 `Applications`。
3. 启动应用，配置 API 设置。

如果 macOS 阻止首次打开，可以右键应用选择 **打开**。必要时也可以移除隔离标记：

```bash
xattr -cr /Applications/Open\ Desk\ Pet.app
```

**Windows**

1. 前往 [Releases](https://github.com/remynan/Open-Desk-Pet/releases) 下载最新 `.exe` 安装程序。
2. 运行安装向导，按提示完成安装。
3. 启动应用，配置 API 设置。

### 配置

首次启动时，打开 **Settings → Open Desk Pet** 配置：

1. **API Base URL**：你的 API 端点（如 `https://api.openai.com/v1`）
2. **API Key**：你的 API 密钥
3. **Model Name**：要使用的模型（如 `gpt-4o-mini`、`deepseek-chat`）

点击 **Test Connection** 验证设置。

## 功能介绍

### 和桌宠聊天

打开悬浮聊天气泡，就可以直接和桌宠对话。

常用快捷键（macOS 为 `Cmd`，Windows 为 `Ctrl`）：

- `Cmd/Ctrl+Shift+M`：打开或关闭聊天气泡
- `Cmd/Ctrl+Shift+T`：显示或隐藏思考模式
- `Esc`：输入框聚焦时关闭气泡

### 工作时的状态反应

桌宠可以停留在你的工作区旁边，根据 coding agent 的状态表现出思考、工作、完成、等待关注、休息等不同反应。

## 支持的 API 提供商

Open Desk Pet 支持任意 OpenAI 兼容 API：

- **OpenAI**：`https://api.openai.com/v1`
- **DeepSeek**：`https://api.deepseek.com/v1`
- **Moonshot**：`https://api.moonshot.cn/v1`
- **本地 Ollama**：`http://localhost:11434/v1`
- **任意 OpenAI 兼容服务**

## 与 MiniCPM Desk Pet 的区别

| 功能 | MiniCPM Desk Pet | Open Desk Pet |
|------|------------------|---------------|
| 推理 | 本地 llama.cpp | 远程 API |
| 模型 | MiniCPM5-1B GGUF | 任意 OpenAI 兼容模型 |
| 磁盘空间 | ~2GB（模型） | 最小 |
| GPU | 推荐 | 不需要 |
| 设置 | 下载模型 | 配置 API |
| 离线 | 是 | 否 |

## 开发者说明

开发环境、打包流程和仓库结构见 [`docs/development.md`](docs/development.md)。

## 致谢

- Fork 自 [MiniCPM Desk Pet](https://github.com/OpenBMB/MiniCPM-Desk-Pet) by OpenBMB
- 桌宠 UI 基于 [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
- 完整归属信息见 [`NOTICE.md`](./NOTICE.md)

## 许可证

本仓库使用 [GNU AGPL-3.0-only](./LICENSE) 分发。

原 MiniCPM Desk Pet 使用 [GNU AGPL-3.0-only](https://github.com/OpenBMB/MiniCPM-Desk-Pet/blob/main/LICENSE) 许可。
