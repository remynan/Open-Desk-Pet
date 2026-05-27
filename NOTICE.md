# Notices

## Open Desk Pet

Copyright © 2026 remynan.

Open Desk Pet is a fork of [MiniCPM Desk Pet](https://github.com/OpenBMB/MiniCPM-Desk-Pet)
by OpenBMB, modified to use remote OpenAI-compatible APIs instead of local
llama.cpp inference. This enables support for OpenAI, DeepSeek, Moonshot,
local Ollama, and any OpenAI-compatible API service.

This project and its upstream are licensed under the GNU Affero General
Public License v3.0 (AGPL-3.0-only); see [LICENSE](./LICENSE) for the
full text. Source code is available at
https://github.com/remynan/Open-Desk-Pet.

---

## Upstream: MiniCPM Desk Pet

Copyright © 2026 OpenBMB.

The upstream MiniCPM Desk Pet combines a local MiniCPM5-0.9B inference sidecar
(via [llama.cpp](https://github.com/ggml-org/llama.cpp)) with an Electron
desktop pet UI. The Electron application (`clawd-on-desk/`) is a fork
of [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk).

Upstream source: https://github.com/OpenBMB/MiniCPM-Desk-Pet

---

## Third-party components

### clawd-on-desk subproject

`clawd-on-desk/` is a vendored fork that ships its own
[LICENSE](clawd-on-desk/LICENSE) (AGPL-3.0-only) and
[NOTICE.md](clawd-on-desk/NOTICE.md). The latter enumerates additional
third-party attributions (OpenClaw pixel-lobster icon under MIT,
artwork credits, etc.) — refer to that file for the authoritative list.

### Python gateway dependencies

The FastAPI gateway depends on, among others, `fastapi`, `uvicorn`,
`httpx`. See
[minicpm-sidecar/pyproject.toml](minicpm-sidecar/pyproject.toml) and
the generated `uv.lock` for the full transitive set and licenses.
