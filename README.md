# CommuteRadar

A lightweight, local-first Progressive Web App for tracking a recurring commute — by bike, on foot, running, or by train — without turning into a full mapping application.

CommuteRadar deliberately does **not** render a continuous map, pull map tiles, or do turn-by-turn navigation. It uses the browser's own Geolocation, Performance, and Notifications APIs to log GPS samples, compute distance/speed/time, detect when you arrive at a place you've marked (like "Office" or "Home"), and store everything locally in IndexedDB.

## Project overview

- **Stack:** React + TypeScript + Vite, `vite-plugin-pwa` for the service worker/manifest, `idb` as a thin IndexedDB wrapper.
- **No backend.** No account, no server, no analytics, no ad SDK. Everything lives in the browser's local storage.
- **Core screens:** Dashboard (start a trip), active trip (large glanceable metrics), history (past trips with export), settings (units, battery/GPS profile, checkpoints, privacy controls).

See `src/` for the full structure — `components/`, `hooks/`, `services/`, `types/`, `utils/`, and `pages/` are organized by responsibility, with business logic kept out of UI components as much as practical.

## Installation

```bash
npm install
```

> **Note:** this project was scaffolded without network access, so dependencies have never actually been installed or built in this environment. Run `npm install` and then `npm run build` / `npm test` yourself and fix anything that surfaces — the code has been written carefully but not machine-verified end-to-end.

**Dependency versions are pinned exactly (no `^`/`~`)** in `package.json` on purpose — Vite 5, `@vitejs/plugin-react` 4.3.x, `vite-plugin-pwa` 0.20.x, and Vitest 1.6.x are a known-compatible set. Don't run a blanket `npm update`/`npm install <pkg>@latest` on these without checking that the new versions still support each other (Vite's major version bumps frequently break `@vitejs/plugin-react`/`vite-plugin-pwa` compatibility for a release or two). If you do commit a `package-lock.json`, the CI workflow currently runs `npm install` rather than `npm ci` for that reason — switch it back to `npm ci` once you have a lockfile you trust, for fully reproducible installs.

## Development commands

```bash
npm run dev        # start the Vite dev server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest run (unit tests for geo/metrics/checkpoints/whatsapp logic)
```

## Production build

```bash
npm run build      # tsc -b && vite build — outputs to dist/
npm run preview    # serve the production build locally
```

The build includes a generated service worker (via `vite-plugin-pwa`) that precaches the app shell only — there are no map tiles or remote assets to cache.

## Deploying to GitHub Pages

The project is preconfigured for GitHub Pages as a project site (`https://<user>.github.io/<repo>/`):

- `vite.config.ts` sets `base: './'`, so every built asset reference is relative — no repo name to hardcode, and it also works fine if you later move to a custom domain at the root.
- Routing is hash-based (`#/trip`, `#/history`, …), so there's no server-side rewrite needed for client-side routes and no 404-page workaround required.
- `.github/workflows/deploy.yml` builds the app and deploys `dist/` on every push to `main` using GitHub's official `upload-pages-artifact` / `deploy-pages` actions — no `gh-pages` npm package or manual branch pushes needed.

To turn it on:

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab). The site publishes to `https://<user>.github.io/<repo>/`.

If you'd rather deploy manually, `npm run build` and publish the `dist/` folder with any static host — nothing here is GitHub-Pages-specific beyond the workflow file.

## PWA setup

- The manifest is generated from `vite.config.ts` (name, theme colors, icons, `display: 'standalone'`).
- Icons are simple SVGs in `public/icons/`. **These are placeholders** — for a real release, generate proper PNG icons (192×192, 512×512, and a maskable variant) since some platforms (notably iOS home-screen icons) don't handle SVG manifest icons well. This project's sandbox had no network access, so PNGs couldn't be generated here.
- `registerType: 'prompt'` is used deliberately: updates never silently reload the app out from under an active trip. `src/registerServiceWorker.ts` shows an in-app "update available" banner instead.
- Install: use the browser's native "Add to Home Screen" / "Install app" prompt. There's a short explainer in Settings.

## Browser compatibility notes

- **Geolocation, `watchPosition`:** supported in all modern mobile/desktop browsers. iOS Safari requires HTTPS (or localhost) and may throttle/suspend GPS updates when the tab is backgrounded — this is a platform limitation, not something a web app can override. `useGeolocation`/`GeolocationTracker` handles `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, and `TIMEOUT` (with an automatic one-time fallback to lower accuracy on timeout) but cannot force background execution.
- **Wake Lock API:** supported in Chromium-based browsers and recent Safari; unsupported browsers simply skip it (screen may sleep during a trip, which is expected and battery-friendly).
- **Notifications API:** unsupported in some iOS Safari contexts outside of an installed, standalone PWA. The app checks support and permission state and degrades gracefully — checkpoint arrivals still show as an in-app badge either way.
- **IndexedDB:** required for any persistence. If unavailable (e.g. very restrictive private-browsing modes), storage calls reject and the app should be treated as unable to save trips — this is surfaced as a `StorageUnavailableError` from `services/storage.ts` for callers to handle.

## Geolocation permission requirements

CommuteRadar never requests location on page load. The Home screen shows a rationale card ("CommuteRadar needs your location while a trip is active…") and only triggers the actual browser permission prompt when the user taps **Start Trip** for the first time — a genuine user gesture, as required by browsers' permission UX guidelines.

## Notification permission requirements

Similarly, notification permission is requested from a dedicated card in Settings, only on an explicit tap, and only once — the app never re-prompts after a denial (browsers ignore repeat `Notification.requestPermission()` calls once a choice has been made anyway).

## WhatsApp limitations

**A browser cannot silently send a WhatsApp message on your behalf.** There is no such API. What CommuteRadar does instead:

1. You configure a phone number and a message template (with `{checkpoint}`, `{tripTime}`, `{distance}`, `{averageSpeed}`, `{date}`, `{time}` variables) per checkpoint.
2. When the checkpoint is reached, the app renders the template and opens a `https://wa.me/<phone>?text=<encoded message>` deep link.
3. This opens WhatsApp (native app on mobile, WhatsApp Web on desktop) with the message pre-filled. **You still have to tap Send.** That confirmation step is enforced by WhatsApp/the OS, not a bug here.

The `WhatsAppService` interface (`src/services/whatsapp.ts`) is deliberately abstracted so a future official WhatsApp Business API integration (which *can* send without user confirmation, from a backend) could replace `DeepLinkWhatsAppService` without touching checkpoint-detection logic anywhere else.

## Privacy architecture

- Location data, trip history, and checkpoints are stored only in this browser's IndexedDB, scoped to this device.
- No location data is ever sent to a server — there is no server.
- No analytics or advertising SDKs are included.
- No account or sign-in exists.
- Settings → Privacy provides three destructive actions (delete all trips, delete all checkpoints, clear all data), each behind a confirmation dialog.

## Battery considerations

Continuous GPS tracking inherently uses power — this app does not pretend otherwise. What it does to keep overhead well below a full navigation app:

- **No continuous map rendering** — the only visual "route" is an optional, static SVG polyline sketch computed once per view, not a live-updating map.
- **Configurable GPS profile** (Settings → Battery & GPS accuracy): Battery saver / Balanced / High accuracy, trading `enableHighAccuracy`, `maximumAge`, and sample-acceptance thresholds against each other (`src/types/settings.ts`).
- **Throttled UI updates** — the active-trip screen re-renders at most once per second regardless of how often GPS callbacks fire.
- **Batched persistence** — the in-progress trip is written to IndexedDB at most every 5 seconds, not on every GPS tick.
- **Sample filtering** — poor-accuracy fixes, stationary GPS noise, and implausible jumps are rejected before they ever reach distance/speed math (`src/utils/geo.ts`).
- **Sample decimation** — long trips are periodically thinned to bound storage growth without needing a full route-simplification algorithm.
- **Wake Lock only while tracking** — the screen is allowed to sleep as soon as a trip is paused or stopped.

## Known gaps / things to verify after `npm install`

- Nothing in this repository has been run through `tsc`, `vite build`, `eslint`, or `vitest` in this environment (no network access to install dependencies). Please run all four and fix anything that surfaces.
- PNG app icons still need to be generated for full iOS/Android install compatibility (see PWA setup above).
- The optional SVG route preview is a flat equirectangular-ish projection for a quick visual sanity check, not a distance-accurate rendering — this is intentional per the "no mapping app" requirement, but worth knowing.
