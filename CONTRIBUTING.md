# Contributing to Open Desk Pet

Thanks for your interest in this project. This file is the operational
entry point for developers; deeper background lives in
[docs/development.md](docs/development.md) and
[clawd-on-desk/AGENTS.md](clawd-on-desk/AGENTS.md).

> The Electron desktop pet layer (`clawd-on-desk/`) is a vendored fork of
> [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
> and is governed by the same AGPL-3.0-only license. When touching code
> under `clawd-on-desk/`, please keep the upstream coding conventions and
> avoid unnecessary divergence — see [`NOTICE.md`](./NOTICE.md) for the
> exact upstream commit we forked from.

> Looking to just use the app? Grab a prebuilt installer from
> [Releases](https://github.com/remynan/Open-Desk-Pet/releases). This
> document is only relevant if you plan to modify the code.

## Quickstart (dev mode)

```bash
git clone git@github.com:remynan/Open-Desk-Pet.git
cd Open-Desk-Pet

./go.sh doctor    # check that node 18+, uv are present
./go.sh setup     # install deps
./go.sh           # run sidecar + Electron pet in foreground

# Or build a packaged installer:
./go.sh build
```

The first launch will prompt you to configure your OpenAI-compatible API
settings in the Settings panel.

## Repository layout

```
Open-Desk-Pet/
├── clawd-on-desk/      Electron desktop pet (vendored fork)
├── minicpm-sidecar/    FastAPI gateway (OpenAI API proxy)
├── docs/               Developer docs
├── skills/             Cursor Agent Skills (dev deployment helper)
└── go.sh               One-shot dev launcher + build entry point
```

## Tests

Before opening a PR, please make sure both test suites pass:

```bash
# Electron host (Node built-in test runner)
cd clawd-on-desk && npm test

# Python gateway
cd minicpm-sidecar && uv run pytest -q
```

If you change CI workflows under `.github/workflows/`, run them via
`workflow_dispatch` on your fork to verify before merging.

## Commit style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: ...` — new user-visible feature
- `fix: ...` — bug fix
- `refactor: ...` — non-functional code change
- `chore: ...` — tooling, dependencies, build, docs
- `docs: ...` — documentation only

Scope optional, e.g. `feat(sidecar): add new API endpoint`.

## Pull request checklist

- [ ] Branch is rebased on the latest `main`
- [ ] `npm test` and `uv run pytest -q` pass locally
- [ ] User-facing changes have a one-line entry in
      [CHANGELOG.md](CHANGELOG.md) under an upcoming version section
- [ ] If you touch onboarding, sidecar lifecycle, or packaging, please
      include a short test plan (commands run, platform verified) in
      the PR description
- [ ] No `.venv`, `node_modules`, or `dist/` artifacts committed

## Issue templates

See `.github/ISSUE_TEMPLATE/` for bug-report / feature-request forms.
Please include:

- OS + architecture (e.g. macOS 14.5 / arm64)
- App version (from About menu) or git commit if running from source
- Steps to reproduce + observed vs expected behaviour
- Relevant log excerpts from
  `~/Library/Application Support/Open Desk Pet/logs/main.log` (macOS)
  or the equivalent on Linux/Windows

## License

By contributing, you agree that your contributions will be licensed
under the [AGPL-3.0-only](LICENSE) license that covers the project.
This matches the license of our upstream
[rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk),
so contributions touching `clawd-on-desk/` remain compatible with
upstream contribution flows.
