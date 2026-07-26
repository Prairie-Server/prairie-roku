# Repository Guidelines

## Project Structure

- `src/` — Roku channel package (`manifest`, `source/`, `components/`, `images/`)
- `src/source/lib/` — typed BrighterScript logic modules (coverage-gated)
- `scripts/` — package, headless test runner, coverage gate
- `docs/ROADMAP.md` — 1.0 PR sequence

## Prairie Workspace Context

- `prairie-server` — Go backend and `/api/v1` contracts
- `prairie-smarttv` — Tizen/webOS client; keep feature parity with its 1.0 surface
- `prairie-apple` / `prairie-android` — mobile/TV clients for behavior reference

Prefer native `/api/v1` over Jellyfin-primary paths.

## Quality Rules

- BrighterScript diagnostics are errors. Do not add `diagnosticFilters` for app
  code, bsc ignore comments, or bslint disables in `src/`.
- Prefer typed signatures (`as string`, `as object`, …). Avoid `as dynamic`
  except at Roku platform boundaries (e.g. `main` args, optional tokens).
- Every change to `src/source/lib/**` needs Rooibos specs; CI enforces **75%**
  line coverage on that tree.
- Do not merge while CodeRabbit still has open comments or nitpicks.

## Commands

```bash
npm install
npm run validate
```
