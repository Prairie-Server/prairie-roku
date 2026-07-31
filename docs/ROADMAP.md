# Prairie Roku 1.0 Roadmap

Native Roku (BrightScript / SceneGraph) client for Prairie `/api/v1`, feature-aligned
with [prairie-smarttv](https://github.com/Prairie-Server/prairie-smarttv) 1.0.

## Quality bar (every PR)

- BrighterScript `diagnosticLevel: error` — no `diagnosticFilters` for app code, no
  lazy `as dynamic` escapes, no bsc/bslint suppressions in `src/`
- `bslint` + Prettier in CI
- Rooibos unit tests (headless via `brs-cli`) with **75%** line coverage on logic
  modules under `src/source/lib/**`
- Do **not** merge until CodeRabbit comments and nitpicks are addressed

## PR sequence

| PR  | Branch purpose                  | Ships                                                                 |
| --- | ------------------------------- | --------------------------------------------------------------------- |
| 1   | Foundation                      | AGPL/TRADEMARK, tooling, CI gates, MainScene shell, Url/Theme + tests |
| 2   | Registry persistence            | Session / last-server / settings via `roRegistrySection`              |
| 3   | HTTP API client                 | `Task` + auth/profiles/home/catalog helpers                           |
| 4   | Connect + profiles              | Prairie Dusk connect form, profile picker, PIN                        |
| 5   | Browse shell                    | Home rails, libraries, collections, search                            |
| 6   | Detail + playback               | Item detail, `Video` node, progress / session teardown                |
| 7   | Live TV + settings + 1.0 polish | Guide/channels, playback settings, store package docs                 |

## 1.0 feature checklist

- [x] Connect (username / password) to Prairie server _(implemented; device validation pending)_
- [x] Quick Connect device login on Connect screen _(QR + code + poll; approve from web/mobile Settings)_
- [x] Profile picker (+ PIN when required) _(implemented; device validation pending)_
- [x] Home sections from `/api/v1/home/sections` _(implemented; device validation pending)_
- [x] Libraries + catalog pagination _(implemented; device validation pending)_
- [x] Collections (library + personal) _(implemented; device validation pending)_
- [x] Search _(implemented; device validation pending)_
- [x] Item detail → seasons/episodes → play via watch + `/playback/start` with resume _(implemented; device validation pending)_
- [x] Player chrome: play/pause, ±15s, progress, audio switch, session teardown _(implemented; device validation pending)_
- [x] Live TV list + now/next (hidden when no channels) _(implemented; device validation pending)_
- [x] Upgrade-safe registry persistence (session + settings + last server URL)
- [x] Sideload `.zip` package script + Channel Store notes

## API surface (native `/api/v1`)

1. `POST /api/v1/auth/login`
2. `GET /api/v1/profiles` (+ `POST …/verify-pin`)
3. `GET /api/v1/home/sections`
4. `GET /api/v1/user/libraries` · `GET /api/v1/catalog`
5. `GET /api/v1/library/{id}/collections` · `GET /api/v1/collections`
6. `GET /api/v1/catalog/items/{id}` · seasons/episodes · `GET /api/v1/watch/{id}`
7. `POST /api/v1/playback/start` · progress · DELETE session
8. `GET /api/v1/livetv/channels` · guide · channel session

Device headers: `X-Prairie-Device-Platform: roku`, `X-Prairie-Device-Name: Prairie Roku`.
Server `deviceclass` does not yet map `roku` → TV (w200 posters); coordinate adding it.
Until then the client rewrites Prairie-signed non-original artwork URLs to `/w200.` via `Artwork.preferred(…, 200)`.
