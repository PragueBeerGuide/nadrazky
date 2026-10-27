# Turning the web app into a mobile app

Notes from October 2026. Nothing here is built yet.

## Why we can't just bundle the pages

The app relies on its server: server actions, NextAuth sessions, Postgres via Drizzle, and server-rendered `[locale]` routes on Vercel. A static export (`output: 'export'`) packed into an app won't work, so any mobile app has to load the hosted site.

## Step 1: make it a proper PWA (about a day of work)

At the moment there's no web app manifest and no service worker.

- **`src/app/manifest.ts`**: the App Router handles this natively. Include the name, icons (192, 512 and a maskable one), `display: "standalone"`, and theme colours from the Departures palette in `src/app/globals.css`.
- **A service worker** that caches the app shell, the MapLibre worker (`public/maplibre`) and map tiles, so the app opens quickly and survives a weak signal at a station.
- **Safe-area handling**: `viewport-fit=cover` plus `env(safe-area-inset-*)`, so the UI clears the notch and the home bar.

Users can then "Add to Home Screen" on iOS and Android, and Android shows an install prompt. Web push works on both platforms, but on iOS only once the app is installed. This may be enough on its own.

## Step 2: wrap it with Capacitor to get into the app stores

[Capacitor](https://capacitorjs.com) puts the site in a native shell. Point `server.url` at the production domain so the server keeps doing its work, and there is still only one codebase. Add native plugins where they help: geolocation ("pubs near me"), push notifications, share, haptics.

Watch out for these:

- **Google sign-in breaks in a WebView.** Google blocks OAuth in embedded browsers (`disallowed_useragent`). Run the sign-in in the system browser and return to the app through a deep link, or use a native Google Sign-In plugin and pass its ID token to a NextAuth Credentials-style provider (see `src/auth.ts`).
- **Sign in with Apple becomes mandatory on iOS.** App Store guideline 4.8 requires it once Google login is offered.
- **Apple rejects thin website wrappers** (guideline 4.2). Native features like location, push and offline support, plus an app-like feel, are what get the app approved. Steps 1 and 2 together cover this.
- **Cookies and sessions** need the WebView to treat our domain as first-party. With `server.url` on our own domain this mostly just works, but test logging in on a real device early.

## What we decided against for now

We're skipping a React Native or Expo rewrite. It would give the best native feel, especially for the map with `@maplibre/maplibre-react-native`. But every screen would have to be built twice and the server actions would have to become a real API. That's only worth it if the app becomes the main product and the Capacitor wrapper's feel turns out to be a real problem.

## Recommended order

1. PWA: manifest, service worker, safe areas.
2. Capacitor shell pointing at production, with native Google sign-in and Sign in with Apple.
3. Native plugins (geolocation, push) before submitting to the App Store.
