"""FastAPI gateway for Open Desk Pet.

Uses OpenAI-compatible API for remote inference.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .clawd_state import ClawdBridge
from .log_setup import get_logger
from .openai_client import OpenAIClient
from .think_filter import ThinkBlockFilter


# ── Request / response shapes ────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(..., description="'system' | 'user' | 'assistant'")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    max_new_tokens: int = 512
    temperature: float = 0.6
    top_p: float = 0.95
    top_k: int = 0
    repetition_penalty: float = 1.05
    stream: bool = True
    system: Optional[str] = None
    thinking: bool = False
    silent: bool = False
    disable_adapter: bool = False


THINKING_MIN_MAX_NEW_TOKENS = 1280
MAX_NEW_TOKENS_CAP = 4096


def _effective_max_new_tokens(req: ChatRequest) -> int:
    base = int(max(1, min(req.max_new_tokens, MAX_NEW_TOKENS_CAP)))
    if req.thinking:
        return min(MAX_NEW_TOKENS_CAP, max(base, THINKING_MIN_MAX_NEW_TOKENS))
    return base


# ── App factory ──────────────────────────────────────────────────────────────


def build_app(
    *,
    initial_model: Optional[Path] = None,  # Ignored in remote mode
    update_source: str = "",  # Ignored
    ctx_size: int = 4096,  # Ignored
    n_gpu_layers: int = -1,  # Ignored
    threads: Optional[int] = None,  # Ignored
    # Remote API configuration
    api_mode: str = "remote",
    api_base_url: str = "",
    api_key: str = "",
    api_model: str = "",
) -> FastAPI:
    log = get_logger()
    bridge = ClawdBridge(enabled=True, debug=False)

    # Check if API is configured
    api_configured = bool(api_base_url and api_model)

    # Create OpenAI client only if configured
    server: Optional[OpenAIClient] = None
    if api_configured:
        server = OpenAIClient(
            base_url=api_base_url,
            api_key=api_key,
            model=api_model,
        )
        log.info("Using remote API: base_url=%s, model=%s", api_base_url, api_model)
    else:
        log.warning("API not configured. Please set API Base URL and Model Name in Settings.")

    # State
    state: dict = {
        "api_mode": "remote",
        "api_base_url": api_base_url,
        "api_model": api_model,
        "api_configured": api_configured,
    }

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        bridge.post("idle", title="Open Desk Pet")
        if server:
            try:
                await server.start()
            except Exception as exc:
                log.exception("OpenAI client start failed: %s", exc)
        try:
            yield
        finally:
            bridge.post("sleeping")
            if server:
                try:
                    await server.stop()
                finally:
                    pass
            bridge.close()

    app = FastAPI(title="Open Desk Pet Sidecar Gateway", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Health / introspection ────────────────────────────────────────

    @app.get("/api/health")
    async def health():
        if not api_configured:
            return {
                "ok": True,
                "alive": False,
                "backend": "openai",
                "api_mode": "remote",
                "api_configured": False,
                "error": "API not configured. Please set API Base URL and Model Name in Settings.",
                "accel": "remote",
                "device": "remote",
                "dtype": "api",
                "model_dir": None,
                "model_name": None,
                "adapter": None,
                "persona": "default",
                "api_base_url": None,
            }
        sub_health = await server.health() if server else None
        return {
            "ok": True,
            "alive": server.alive if server else False,
            "backend": "openai",
            "api_mode": "remote",
            "api_configured": True,
            "accel": "remote",
            "device": "remote",
            "dtype": "api",
            "model_dir": None,
            "model_name": state.get("api_model"),
            "adapter": None,
            "persona": "default",
            "api_base_url": state.get("api_base_url"),
            "openai_health": sub_health,
        }

    @app.get("/api/devices")
    def list_devices():
        return {
            "available": ["remote"],
            "recommended": "remote",
            "current": "remote",
            "reasons": {"remote": "Remote OpenAI-compatible API"},
        }

    @app.post("/api/set-device")
    async def set_device(payload: dict):
        return JSONResponse(
            {"error": "Device selection not available in remote mode"},
            status_code=400,
        )

    @app.get("/api/onboarding")
    def onboarding():
        return {
            "model_present": api_configured,
            "model_dir": None,
            "device": "remote",
            "dtype": "api",
            "adapter": None,
            "persona": "default",
            "stage_hint": "ready" if api_configured else "config",
            "api_mode": "remote",
            "api_base_url": state.get("api_base_url"),
            "api_model": state.get("api_model"),
        }

    # ─── Model / adapter listing ───────────────────────────────────────

    @app.get("/api/models")
    def list_models():
        return {
            "items": [],
            "current": state.get("api_model"),
            "current_name": state.get("api_model"),
        }

    @app.post("/api/load-model")
    async def load_model(payload: dict):
        return JSONResponse(
            {"error": "Model loading not available in remote mode. Configure API Model Name instead."},
            status_code=400,
        )

    @app.get("/api/adapters")
    def list_adapters():
        return {
            "items": [],
            "current": None,
            "current_name": None,
            "adapter_dir": None,
        }

    @app.post("/api/load-adapter")
    async def load_adapter(payload: dict):
        return JSONResponse(
            {"error": "LoRA adapters not available in remote mode"},
            status_code=400,
        )

    @app.post("/api/classify")
    def classify_endpoint(payload: dict):
        return JSONResponse(
            {"error": "/api/classify not implemented"},
            status_code=501,
        )

    # ─── Updater ───────────────────────────────────────────────────────

    @app.get("/api/update-check")
    async def update_check():
        return {"available": False, "note": "Remote mode: updates managed by API provider"}

    @app.post("/api/update-apply")
    async def update_apply():
        return JSONResponse(
            {"error": "Model updates not available in remote mode"},
            status_code=400,
        )

    # ─── Chat ──────────────────────────────────────────────────────────

    @app.post("/api/warmup")
    async def warmup():
        return {"ok": True, "elapsed_ms": 0, "note": "remote mode"}

    @app.post("/api/chat")
    async def chat(req: ChatRequest):
        if not api_configured:
            return JSONResponse(
                {"error": "API not configured. Please set API Base URL and Model Name in Settings."},
                status_code=503,
            )
        if not req.messages:
            return JSONResponse({"error": "messages is empty"}, status_code=400)
        if not server or not server.alive:
            return JSONResponse({"error": "backend not running"}, status_code=503)
        if req.stream:
            return StreamingResponse(
                _stream_chat(server, bridge, req),
                media_type="text/event-stream",
            )
        return JSONResponse(await _blocking_chat(server, bridge, req))

    @app.post("/api/state")
    def manual_state(payload: dict):
        st = str(payload.get("state") or "idle")
        bridge.post(st, event=payload.get("event"))
        return {"ok": True}

    @app.get("/")
    def index():
        return JSONResponse({
            "ok": True,
            "note": "Open Desk Pet sidecar gateway (OpenAI API backend)",
            "api_mode": "remote",
            "api_configured": api_configured,
            "api_base_url": state.get("api_base_url") if api_configured else None,
            "api_model": state.get("api_model") if api_configured else None,
            "endpoints": [
                "/api/health", "/api/chat", "/api/warmup",
                "/api/models", "/api/load-model",
                "/api/devices", "/api/set-device", "/api/onboarding",
                "/api/update-check", "/api/update-apply",
                "/api/adapters", "/api/load-adapter", "/api/classify",
                "/api/state",
            ],
        })

    return app


# ── Chat plumbing ───────────────────────────────────────────────────────────


async def _stream_chat(
    server: OpenAIClient,
    bridge: ClawdBridge,
    req: ChatRequest,
) -> AsyncGenerator[bytes, None]:
    if not req.silent:
        bridge.new_session()
        bridge.post("thinking")

    messages = _build_messages(req)

    try:
        agen = server.stream_chat(
            messages=messages,
            max_tokens=_effective_max_new_tokens(req),
            temperature=max(0.0, float(req.temperature)),
            top_p=float(req.top_p),
            top_k=int(req.top_k),
            repetition_penalty=float(req.repetition_penalty),
            enable_thinking=bool(req.thinking),
        )
    except Exception as exc:
        if not req.silent:
            bridge.post("error")
        yield _sse({"event": "error", "message": str(exc)})
        return

    yield _sse({"event": "start"})
    if not req.silent:
        bridge.post("working")

    last_pet_ping = time.time()
    think_filter = ThinkBlockFilter(expose=req.thinking, start_inside=False)

    try:
        async for kind, piece in agen:
            if kind == "reasoning":
                if req.thinking:
                    yield _sse({"event": "think", "content": piece})
            else:
                for ev in think_filter.feed(piece):
                    yield _sse(ev)
            now = time.time()
            if now - last_pet_ping > 6.0:
                if not req.silent:
                    bridge.post("working")
                last_pet_ping = now
    except asyncio.CancelledError:
        if not req.silent:
            bridge.post("attention")
        raise
    except Exception as exc:
        get_logger().exception("chat stream error: %s", exc)
        if not req.silent:
            bridge.post("error")
        yield _sse({"event": "error", "message": str(exc)})
        return
    finally:
        for ev in think_filter.flush():
            yield _sse(ev)

    yield _sse({"event": "end"})
    if not req.silent:
        bridge.post("attention")


async def _blocking_chat(
    server: OpenAIClient,
    bridge: ClawdBridge,
    req: ChatRequest,
) -> dict:
    if not req.silent:
        bridge.new_session()
        bridge.post("thinking")
    messages = _build_messages(req)
    think_filter = ThinkBlockFilter(expose=req.thinking, start_inside=False)
    content_parts: list[str] = []
    think_parts: list[str] = []
    if not req.silent:
        bridge.post("working")
    try:
        async for kind, piece in server.stream_chat(
            messages=messages,
            max_tokens=_effective_max_new_tokens(req),
            temperature=max(0.0, float(req.temperature)),
            top_p=float(req.top_p),
            top_k=int(req.top_k),
            repetition_penalty=float(req.repetition_penalty),
            enable_thinking=bool(req.thinking),
        ):
            if kind == "reasoning":
                think_parts.append(piece)
            else:
                for ev in think_filter.feed(piece):
                    (think_parts if ev["event"] == "think" else content_parts).append(ev["content"])
        for ev in think_filter.flush():
            (think_parts if ev["event"] == "think" else content_parts).append(ev["content"])
    finally:
        if not req.silent:
            bridge.post("attention")
    return {
        "content": "".join(content_parts),
        "thinking": "".join(think_parts) if req.thinking else None,
    }


def _build_messages(req: ChatRequest) -> list[dict]:
    out: list[dict] = []
    if req.system:
        out.append({"role": "system", "content": req.system})
    for m in req.messages:
        out.append({"role": m.role, "content": m.content})
    return out


def _sse(payload: dict) -> bytes:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")
