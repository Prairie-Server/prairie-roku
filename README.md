# Prairie Roku

AGPL-3.0 client for **Roku** (BrightScript / SceneGraph) that talks to Prairie over
native `/api/v1` (not Jellyfin-primary).

**Version 1.0.0** — Prairie Dusk UI: deep slate `#141820`, amber `#e0a84a`.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the 1.0 feature checklist and
[docs/STORE.md](docs/STORE.md) for sideload / Channel Store notes.

## Features

- Connect + profile picker (PIN) with registry session persistence
- Home rails, libraries, collections, and catalog search
- Item detail (seasons/episodes) → `Video` playback with progress and session teardown
- Live TV channel list with now/next guide (empty when unavailable)
- Playback settings (force direct / transcode, preferred subtitle language)

## Requirements

- Node.js 20+ (22 recommended)
- Optional: Roku device in developer mode for on-device runs

## Quick start

```bash
npm install
npm run validate
```

Sideload package:

```bash
npm run package
# upload out/prairie-roku.zip from the Roku installer
```

Optional device deploy (when `ROKU_HOST` / `ROKU_PASSWORD` are set):

```bash
npx roku-deploy --host "$ROKU_HOST" --password "$ROKU_PASSWORD" --sourceDir dist
```

## Scripts

| Command                 | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `npm run lint`          | bslint (strict rules, type annotations required)      |
| `npm run format:check`  | Prettier check (CI)                                   |
| `npm run typecheck`     | BrighterScript compile diagnostics as errors          |
| `npm test`              | Rooibos headless via brs-cli                          |
| `npm run test:coverage` | Tests + **75%** coverage gate on logic modules        |
| `npm run build`         | Typecheck + stage production channel under `dist/`    |
| `npm run package`       | Build + zip `out/prairie-roku.zip`                    |
| `npm run validate`      | format + lint + typecheck + coverage + production zip |

## Coverage CI

GitHub Actions runs format, lint, typecheck, `test:coverage`, then packages the
channel. The coverage gate is **75%** of executable lines under:

- `src/source/lib/**/*.bs` (excludes `*.spec.bs`)

SceneGraph screens and Tasks stay outside the percentage (thin UI wrappers),
matching the prairie-smarttv split between logic modules and platform chrome.

## License

AGPL-3.0-or-later. Trademark policy: [TRADEMARK.md](TRADEMARK.md).
