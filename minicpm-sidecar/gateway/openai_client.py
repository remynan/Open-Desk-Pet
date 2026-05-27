"""OpenAI-compatible API client for remote LLM inference.

This module provides a client that connects to OpenAI-compatible APIs
(OpenAI, DeepSeek, Moonshot, local Ollama, etc.) and can be used as a
drop-in replacement for the local llama-server backend.

The client supports:
  - Streaming chat completions (SSE)
  - Health checks via /models endpoint
  - Reasoning content extraction (DeepSeek-style)
  - Automatic retry with exponential backoff
  - Configurable timeouts
"""

from __future__ import annotations

import json
import time
from typing import AsyncIterator, Optional

import httpx

from .log_setup import get_logger


class OpenAIClient:
    """OpenAI-compatible API client with streaming support.

    This class provides an interface for connecting to OpenAI-compatible APIs
    (OpenAI, DeepSeek, Moonshot, local Ollama, etc.).
    """

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str = "",
        model: str,
        timeout: float = 120.0,
        connect_timeout: float = 10.0,
        max_retries: int = 3,
    ) -> None:
        """Initialize the OpenAI client.

        Args:
            base_url: Base URL for the API (e.g., "https://api.openai.com/v1")
            api_key: API key for authentication (optional for local APIs)
            model: Model name to use (e.g., "gpt-4o-mini", "deepseek-chat")
            timeout: Total request timeout in seconds
            connect_timeout: Connection timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.connect_timeout = connect_timeout
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None
        self._started = False
        self._last_error: Optional[str] = None

    # ── Lifecycle ───────────────────────────────────────────────────────

    async def start(self) -> None:
        """Initialize the HTTP client and verify connectivity.

        This method creates the httpx AsyncClient and optionally verifies
        that the API is reachable. It does NOT spawn any subprocess.
        """
        log = get_logger()
        if self._started:
            log.debug("OpenAIClient already started")
            return

        headers = {
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            timeout=httpx.Timeout(
                connect=self.connect_timeout,
                read=self.timeout,
                write=60.0,
                pool=5.0,
            ),
            follow_redirects=True,
        )

        self._started = True
        log.info(
            "OpenAIClient started: base_url=%s, model=%s",
            self.base_url,
            self.model,
        )

    async def stop(self) -> None:
        """Close the HTTP client."""
        log = get_logger()
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass
            self._client = None
        self._started = False
        log.info("OpenAIClient stopped")

    @property
    def alive(self) -> bool:
        """Check if the client is initialized."""
        return self._started and self._client is not None

    # ── Health Check ─────────────────────────────────────────────────────

    async def health(self) -> Optional[dict]:
        """Check API health by querying the /models endpoint.

        Returns:
            dict with health info if successful, None otherwise.
        """
        if not self._client:
            return None

        try:
            # Try to fetch models list as a health check
            resp = await self._client.get("/models", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ok": True,
                    "backend": "openai",
                    "model": self.model,
                    "models_available": len(data.get("data", [])),
                }
            # If /models fails but we're configured, consider it healthy
            # (some APIs don't expose /models)
            return {"ok": True, "backend": "openai", "model": self.model}
        except Exception as exc:
            self._last_error = str(exc)
            return None

    # ── Chat Streaming ───────────────────────────────────────────────────

    async def stream_chat(
        self,
        *,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int = 0,
        repetition_penalty: float = 1.0,
        stop: Optional[list[str]] = None,
        enable_thinking: bool = True,
        **kwargs,
    ) -> AsyncIterator[tuple[str, str]]:
        """Stream chat completions from the API.

        Yields (kind, text) tuples where kind is one of:
          - "content": Regular assistant text
          - "reasoning": Thinking/reasoning content (if supported by API)

        Args:
            messages: List of message dicts with "role" and "content"
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 to 2.0)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling (not supported by all APIs)
            repetition_penalty: Repetition penalty (not supported by all APIs)
            stop: Stop sequences
            enable_thinking: Whether to enable thinking/reasoning mode

        Yields:
            Tuples of (kind, text) where kind is "content" or "reasoning"
        """
        if not self._client:
            raise RuntimeError("OpenAIClient not started; did you await start()?")

        log = get_logger()

        # Build request body - OpenAI-compatible format
        body: dict = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "max_tokens": int(max_tokens),
            "temperature": float(temperature),
            "top_p": float(top_p),
        }

        # Add optional parameters
        if stop:
            body["stop"] = stop

        # Some APIs support these extended parameters
        extra_params: dict = {}
        if top_k and top_k > 0:
            extra_params["top_k"] = int(top_k)
        if repetition_penalty != 1.0:
            extra_params["repetition_penalty"] = float(repetition_penalty)

        # DeepSeek-style thinking parameter
        # Note: Different APIs use different parameter names
        if enable_thinking:
            # DeepSeek uses this format
            extra_params["reasoning_effort"] = "medium"

        # Merge extra params if the API might support them
        if extra_params:
            body.update(extra_params)

        # Retry logic with exponential backoff
        last_error: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                async with self._client.stream(
                    "POST",
                    "/chat/completions",
                    json=body,
                    timeout=self.timeout,
                ) as resp:
                    if resp.status_code != 200:
                        error_body = await resp.aread()
                        error_text = error_body.decode("utf-8", errors="ignore")[:500]
                        raise RuntimeError(
                            f"API error {resp.status_code}: {error_text}"
                        )

                    async for raw_line in resp.aiter_lines():
                        if not raw_line:
                            continue
                        if not raw_line.startswith("data:"):
                            continue
                        payload = raw_line[5:].strip()
                        if payload == "[DONE]":
                            return
                        try:
                            obj = json.loads(payload)
                        except json.JSONDecodeError:
                            continue

                        choices = obj.get("choices") or []
                        if not choices:
                            continue

                        delta = choices[0].get("delta") or {}

                        # Check for reasoning content (DeepSeek style)
                        reasoning = delta.get("reasoning_content")
                        if reasoning:
                            yield ("reasoning", reasoning)

                        # Regular content
                        text = delta.get("content")
                        if text:
                            yield ("content", text)

                        # Check finish reason
                        if choices[0].get("finish_reason"):
                            return

                # Success - exit retry loop
                return

            except httpx.TimeoutException as exc:
                last_error = exc
                log.warning(
                    "OpenAI API timeout (attempt %d/%d): %s",
                    attempt + 1,
                    self.max_retries,
                    exc,
                )
                if attempt < self.max_retries - 1:
                    await self._sleep_with_backoff(attempt)
                continue

            except httpx.HTTPStatusError as exc:
                # Don't retry client errors (4xx)
                if 400 <= exc.response.status_code < 500:
                    raise
                last_error = exc
                log.warning(
                    "OpenAI API HTTP error (attempt %d/%d): %s",
                    attempt + 1,
                    self.max_retries,
                    exc,
                )
                if attempt < self.max_retries - 1:
                    await self._sleep_with_backoff(attempt)
                continue

            except httpx.RequestError as exc:
                last_error = exc
                log.warning(
                    "OpenAI API request error (attempt %d/%d): %s",
                    attempt + 1,
                    self.max_retries,
                    exc,
                )
                if attempt < self.max_retries - 1:
                    await self._sleep_with_backoff(attempt)
                continue

        # All retries exhausted
        if last_error:
            raise RuntimeError(
                f"OpenAI API failed after {self.max_retries} attempts: {last_error}"
            )

    async def _sleep_with_backoff(self, attempt: int) -> None:
        """Sleep with exponential backoff."""
        import asyncio

        backoff = min(2**attempt, 10)  # Max 10 seconds
        await asyncio.sleep(backoff)

    async def complete_once(
        self,
        *,
        prompt: str,
        max_tokens: int = 1,
        temperature: float = 0.0,
    ) -> dict:
        """Fire a single non-streaming completion.

        Used for warmup and simple tests.

        Args:
            prompt: The prompt to complete
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            The API response as a dict
        """
        if not self._client:
            raise RuntimeError("OpenAIClient not started; did you await start()?")

        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": int(max_tokens),
            "temperature": float(temperature),
            "stream": False,
        }

        resp = await self._client.post("/chat/completions", json=body)
        resp.raise_for_status()
        return resp.json()

    # ── Compatibility Properties ─────────────────────────────────────────

    @property
    def model_path(self) -> Optional[str]:
        """Compatibility property - returns the model name for remote mode."""
        return self.model

    @property
    def port(self) -> int:
        """Compatibility property - returns 0 for remote mode."""
        return 0

    @property
    def adapter_paths(self) -> list:
        """Compatibility property - empty list for remote mode."""
        return []

    def adapter_id_for(self, path) -> Optional[int]:
        """Compatibility method - returns None for remote mode."""
        return None


# ── Backend Detection (Compatibility) ────────────────────────────────────


def detect_backend() -> dict:
    """Report available backends.

    For remote API mode, we only report 'remote' as available.
    """
    return {
        "available": ["remote"],
        "recommended": "remote",
        "reasons": {
            "remote": "远程 OpenAI 兼容 API",
        },
    }
