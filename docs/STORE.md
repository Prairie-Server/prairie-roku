# Packaging and Channel Store notes

## Sideload package

```bash
npm run package
```

Upload `out/prairie-roku.zip` with the Roku developer installer
(`https://<roku-ip>/plugin_install`).

Optional direct deploy when `ROKU_HOST` and `ROKU_PASSWORD` are set:

```bash
npx roku-deploy --host "$ROKU_HOST" --password "$ROKU_PASSWORD" --sourceDir dist
```

## Channel Store checklist (1.0)

- Confirm `src/manifest` title, major/minor version, and build version before each store cut
- Include splash / poster / icon art under `src/images/` (Prairie Dusk)
- Privacy policy URL and support contact as required by Roku developer account
- Test connect → profile → home → library/search → detail → playback teardown on hardware
- Test Live TV empty state (no channels) and settings registry persistence across channel updates
- AGPL source offer: point Channel Store listing / app about text at the public repo

## Device headers

Prairie identifies this client as:

- `X-Prairie-Device-Platform: roku`
- `X-Prairie-Device-Name: Prairie Roku`
