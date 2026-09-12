import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// CommuteRadar is intentionally NOT a mapping app. The service worker here only
// caches the app shell (HTML/JS/CSS/icons) for offline use — it never caches
// map tiles because there are none. All trip/checkpoint data lives in
// IndexedDB (see src/services/storage.ts), not in the service worker cache.
//
// GitHub Pages serves project sites from a subpath (e.g.
// https://<user>.github.io/<repo>/), so every asset reference here is
// relative rather than root-absolute. `base: './'` makes the built HTML/JS
// reference assets relative to index.html regardless of which subpath (or
// custom domain) the site ends up served from — no repo name needs to be
// hardcoded. Routing is hash-based (see src/hooks/useHashRoute.ts) for the
// same reason: GitHub Pages has no server-side rewrite for client-side
// routes, and hash routes never hit the server on navigation.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // we surface our own "update available" banner instead of silent reloads
      includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'CommuteRadar',
        short_name: 'CommuteRadar',
        description: 'Track your recurring commute — distance, speed, and checkpoints — without a heavy map.',
        theme_color: '#0b1622',
        background_color: '#0b1622',
        display: 'standalone',
        orientation: 'portrait',
        // Relative, not root-absolute: correct whether the site is served
        // from a GitHub Pages subpath or a custom domain at the root.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App-shell precaching only. No runtime caching rules are added for
        // any map/tile provider — this app has none.
        globPatterns: ['**/*.{js,css,html,svg}'],
        // Left unset so the plugin derives the correct base-relative
        // fallback itself — hardcoding '/index.html' would 404 under a
        // GitHub Pages subpath.
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    host: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
