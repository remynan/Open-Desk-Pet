"""CLI entry point for the gateway.

Invoked one of two ways:
  · python -m gateway --port 18765 --api-base-url ... --api-model ...
  · ./minicpm-sidecar --port 18765 --api-base-url ... --api-model ...
"""

from __future__ import annotations

import argparse
import os
import sys

import uvicorn

from gateway.log_setup import init_logging, install_broken_pipe_guard
from gateway.server import build_app


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="minicpm-sidecar", add_help=True)
    p.add_argument("--host", default=os.environ.get("MINICPM_HOST", "127.0.0.1"))
    p.add_argument("--port", type=int, default=int(os.environ.get("MINICPM_PORT", "18765")))

    # Remote API configuration (required)
    p.add_argument(
        "--api-base-url",
        default=os.environ.get("MINICPM_API_BASE_URL", ""),
        help="Base URL for OpenAI-compatible API (e.g., https://api.openai.com/v1)",
    )
    p.add_argument(
        "--api-key",
        default=os.environ.get("MINICPM_API_KEY", ""),
        help="API key for authentication",
    )
    p.add_argument(
        "--api-model",
        default=os.environ.get("MINICPM_API_MODEL", ""),
        help="Model name to use (e.g., gpt-4o-mini, deepseek-chat)",
    )

    # Legacy arguments (ignored, for backwards compatibility)
    p.add_argument("--model", default="", help=argparse.SUPPRESS)
    p.add_argument("--update-source", default="", help=argparse.SUPPRESS)
    p.add_argument("--ctx-size", type=int, default=4096, help=argparse.SUPPRESS)
    p.add_argument("--gpu-layers", type=int, default=-1, help=argparse.SUPPRESS)
    p.add_argument("--threads", type=int, default=0, help=argparse.SUPPRESS)
    p.add_argument("--api-mode", default="remote", help=argparse.SUPPRESS)

    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(list(sys.argv[1:] if argv is None else argv))
    init_logging()
    install_broken_pipe_guard()

    app = build_app(
        api_base_url=args.api_base_url,
        api_key=args.api_key,
        api_model=args.api_model,
    )

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info",
        reload=False,
        access_log=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
