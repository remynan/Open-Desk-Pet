# MiniCPM-test

本地 MiniCPM5-0.9B 模型 + 桌宠交互的实验项目。Apple Silicon (Metal/MPS)
上跑一个 Python sidecar，Electron 桌宠当 UI 层，Cursor / Claude Code /
Codex 等 coding agent 完成事件触发桌宠主动旁白。

> **状态**：mac arm64 MVP 已打通"双击 dmg → Onboarding 引导 → 聊天"全链路；Windows / Linux 暂未支持。

---

## 给最终用户 (推荐路径)

### 安装

1. 从 [Releases](https://github.com/EEEEEKKO/MiniCPM-test/releases) 下载 `Clawd-on-Desk-*-arm64.dmg`（仅 macOS Apple Silicon）。
2. 双击 dmg，把应用拖进 Applications。
3. 首次打开应用时，macOS 可能提示 "无法验证开发者"：
   - **右键** 应用图标 → **打开** → 在弹窗里点 **打开**；或
   - 终端运行 `xattr -cr /Applications/Clawd\ on\ Desk.app`，再双击。
4. 跟着首次启动的 Onboarding 向导走完 5 步：
   1. 环境检查
   2. 加速器探测（mac 上自动选 MPS）
   3. 模型下载（~2 GB，从 Hugging Face 拉取，约 5–8 分钟）
   4. sidecar 启动 + warmup
   5. 就绪——桌宠登场

整个过程不需要打开终端、不需要装 Python / conda / uv。

### 日常使用

- `⌘⇧M`：开关聊天气泡
- `⌘⇧T`：切换"思考模式"显示
- `Esc`：在气泡内焦点时关闭气泡
- 右键桌宠 → **Settings → 🐾 MiniCPM**：换模型路径、切适配器、调整气泡位置、开关旁白、切换加速器

### 已知限制

- 仅 macOS Apple Silicon (M1+)
- dmg 暂未代码签名 / 公证（见上面的 Gatekeeper 绕开方式）
- packaged 安装不会自动检查应用更新——请手动到 Releases 看新版
- 模型可以由 sidecar 自身的 `/api/update-apply` 增量更新

---

## 给开发者

参见 [docs/development.md](docs/development.md)。简要：

```bash
git clone git@github.com:EEEEEKKO/MiniCPM-test.git
cd MiniCPM-test
mkdir -p models && ln -s /path/to/your/minicpm5-0.9b models/minicpm5-0.9b
./go.sh             # dev 模式启动
./go.sh build       # 出 dmg
```

---

## 主要功能

- 本地模型聊天（⌘⇧M 弹气泡）
- LoRA 人格切换（"用猫娘" / "切回原版"）
- 桌宠主动旁白（Cursor / Claude / Codex 完成事件）
- Settings → 🐾 MiniCPM：模型参数、气泡位置、旁白开关、加速器、本地模型路径、重跑 Onboarding
- 跨 agent 事件 merge：Cursor + Claude Code 同时为一个会话触发时自动选 transcript 上下文最丰富的那条

完整变更见 [CHANGELOG.md](./CHANGELOG.md)。

## 文档索引

- [docs/PRD-sidecar-cross-platform-refactor.md](docs/PRD-sidecar-cross-platform-refactor.md) — 产品需求文档
- [docs/architecture-and-cross-platform-report.md](docs/architecture-and-cross-platform-report.md) — 架构调研与三端打包改造报告
- [docs/development.md](docs/development.md) — 开发者指南
- [clawd-on-desk/AGENTS.md](clawd-on-desk/AGENTS.md) — 底座 Electron 桌宠的开发约束（fork from rullerzhou-afk/clawd-on-desk）
