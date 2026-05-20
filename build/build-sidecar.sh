#!/usr/bin/env bash
# Build the MiniCPM sidecar into a self-contained PyInstaller dir.
#
# Output:
#   clawd-on-desk/dist/sidecar/<os>-<arch>/minicpm-sidecar/
#
# Used by:
#   - npm run build:mac (electron-builder picks up via extraResources)
#   - manual smoke tests of the binary outside Electron
#
# First run installs PyInstaller into the uv-managed .venv. Subsequent
# runs are incremental — PyInstaller caches into build/build/ next to
# this spec.

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
BRIDGE="$REPO/minicpm-pet-bridge-uv"
DIST_ROOT="$REPO/clawd-on-desk/dist/sidecar"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }

# Map host to <os>-<arch> conventionally consumed by electron-builder
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)  TARGET="mac-arm64" ;;
  Darwin-x86_64) TARGET="mac-x64" ;;
  Linux-x86_64)  TARGET="linux-x64" ;;
  Linux-aarch64) TARGET="linux-arm64" ;;
  *) red "unsupported host: $(uname -s) $(uname -m)"; exit 1 ;;
esac

cyan "==> Target: $TARGET"
cyan "==> Bridge: $BRIDGE"

if ! command -v uv >/dev/null 2>&1; then
  red "uv 未安装。请先 curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

if [[ ! -d "$BRIDGE/.venv" ]]; then
  cyan "==> 首次安装 sidecar 依赖 (uv sync, 这会下载 ~700 MB torch)..."
  ( cd "$BRIDGE" && uv sync )
fi

# Install PyInstaller into the same venv if missing. We don't pin it in
# pyproject.toml because it's a build-only dep.
if [[ ! -x "$BRIDGE/.venv/bin/pyinstaller" ]]; then
  cyan "==> 安装 PyInstaller..."
  ( cd "$BRIDGE" && uv pip install "pyinstaller>=6.0" )
fi

cyan "==> 清理上次产物..."
rm -rf "$HERE/build" "$HERE/dist"

cyan "==> 运行 PyInstaller..."
( cd "$HERE" && "$BRIDGE/.venv/bin/pyinstaller" \
    sidecar.spec \
    --distpath "$HERE/dist" \
    --workpath "$HERE/build" \
    --clean \
    --noconfirm )

OUT="$DIST_ROOT/$TARGET"
rm -rf "$OUT"
mkdir -p "$(dirname "$OUT")"
mv "$HERE/dist/minicpm-sidecar" "$OUT"

green "==> OK -> $OUT/minicpm-sidecar"
green "    试跑: $OUT/minicpm-sidecar --help"
