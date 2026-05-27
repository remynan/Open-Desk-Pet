# 开发者指南

> 普通用户请直接下载安装包（参见 [README.md](../README.md)），配置 API 设置即可。本文档只面向需要改代码 / 调试 / 出包的开发者。

---

## 目录

- [快速上手 (dev 模式)](#快速上手-dev-模式)
- [仓库结构](#仓库结构)
- [打包：从源码到安装包](#打包从源码到安装包)
- [常用调试技巧](#常用调试技巧)

---

## 快速上手 (dev 模式)

```bash
git clone git@github.com:remynan/Open-Desk-Pet.git
cd Open-Desk-Pet

./go.sh                  # 自动安装依赖 + 启动
```

`./go.sh doctor` 单独检查环境是否 OK；`./go.sh setup` 只装依赖不启动。

---

## 仓库结构

```
Open-Desk-Pet/
├── clawd-on-desk/              ← Electron 桌宠 (vendored fork of clawd-on-desk@5b1f003)
│                                  + Open Desk Pet 集成层：聊天气泡 / Settings
├── minicpm-sidecar/            ← FastAPI gateway (远程 OpenAI API 代理)
├── skills/deploy-minicpm-pet/  ← Cursor Agent Skill（dev 部署引导）
├── docs/                       ← 开发者文档
├── go.sh                       ← 开发者快捷脚本
└── README.md                   ← 用户向（安装 + 配置）
```

---

## 打包：从源码到安装包

最终用户拿到的安装包内含：
- Electron 主程序（clawd-on-desk）
- PyInstaller 打的 sidecar 二进制（无需用户装 Python）
- sidecar 源码（备用 / debug 用）

### 单步出包

```bash
./go.sh build
```

等价于：

```bash
# 1. uv sync gateway + PyInstaller 打 gateway
cd minicpm-sidecar && ./scripts/build-all.sh && cd ..

# 2. electron-builder 出安装包
cd clawd-on-desk
npx electron-builder --win
```

产物位置：`clawd-on-desk/dist/*.exe`。

### 仅重打安装包（不重跑 PyInstaller）

修改 Electron 端代码 / package.json 后，sidecar binary 不需要重打：

```bash
cd clawd-on-desk && npm run build
```

---

## 常用调试技巧

### 看 sidecar 实时日志

```bash
# dev 模式：Electron 的 stdout 已转发 [sidecar] 前缀的行
./go.sh start

# packaged 模式：sidecar stderr 写入 Electron 主进程日志
tail -f "$HOME/Library/Application Support/Open Desk Pet/logs/"main.log
```

### 直接 curl sidecar

```bash
curl -s http://127.0.0.1:18765/api/health | python3 -m json.tool
```

### 端口冲突

```bash
lsof -ti:18765 | xargs -r kill -9   # sidecar
lsof -ti:23333 | xargs -r kill -9  # clawd HTTP server
```

### 完全重置用户数据（小心，会丢失对话历史）

```bash
rm -rf "$HOME/Library/Application Support/Open Desk Pet/"
```
