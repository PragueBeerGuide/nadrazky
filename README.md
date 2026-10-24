# Nádražky

The database of railway station pubs in the Czech Republic — find a station pub on your line, check in, collect badges. Czech and English. Made by [Prague Beer Guides](https://pragueguide.beer).

## Stack

- Next.js 16 (App Router) + Tailwind CSS 4, with the "Departures" design: Czech railway signage tokens (sign blue, timetable yellow, departure board) in `src/app/globals.css`; Barlow Condensed, IBM Plex Sans and IBM Plex Mono via `next/font`
- next-intl for Czech (`/cs/...`, default) and English (`/en/...`) with translated URLs (`/cs/hospoda/…`, `/en/pub/…`); texts live in `messages/cs.json` and `messages/en.json`
- PostgreSQL + Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/`); PGlite (embedded Postgres) for local development
- Auth.js (`next-auth` v5) for accounts: sign-in with a Google account only, no passwords (`src/auth.ts`)
- MapLibre GL with free OpenFreeMap tiles (no API key)

## Run locally

Needs Node.js 20 or newer. The local database is an embedded Postgres (PGlite) in `data/pglite`, so nothing else has to be installed.

```bash
npm install
npm run setup      # create the database and import the 782 pubs (about 10 s)
npm run dev        # http://localhost:3000
```

To use a real Postgres server instead (Neon in production), set `DATABASE_URL=postgresql://…` in `.env.local` and run `npm run setup` again.

Accounts work locally without any keys: under `npm run dev` the login page has a **dev login** that signs you in with any email. To try Google sign-in locally, put `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env.local` (see [Accounts](#accounts)).

## Tests

```bash
npm test             # unit tests (Vitest): line ordering, Czech letters, dates, messages, components, sign-in, check-in rules
npm run test:e2e     # end-to-end tests (Playwright) on a computer-sized and a phone-sized browser
```

Unit tests sit next to the code (`src/**/*.test.ts`). Pages are async Server Components, which Vitest can't render, so they are covered by the Playwright tests in `e2e/` instead: every route in Czech and English, filters, the map, and no errors in the browser console.

`npm run test:e2e` builds the app and starts it on port 3200 with its own database in `data/pglite-e2e`, so it can run next to `npm run dev`. The test server turns on the dev login (`AUTH_DEV_LOGIN=1`), so the tests sign up without Google or email; every test signs up a new user. The first time, install the browser with `npx playwright install chromium`. If a server is already running on port 3200, the tests reuse it.

GitHub Actions runs lint, the unit tests and the end-to-end tests on every push and pull request (`.github/workflows/test.yml`). If the end-to-end tests fail, the run uploads the Playwright report and traces as an artifact. To run the tests the way CI does (fresh server, retries, GitHub reporter), set `CI`:

```bash
CI=1 npm run test:e2e
```

## Data

Station positions, regions and rail lines come from [Wikidata](https://www.wikidata.org) (CC0). Positions are the station's, not the pub door's, until corrected.

`npm run db:import` is idempotent: it updates existing pubs by their nadrazky.eu id.

## Deploy

The app runs on Vercel (project `nadrazky`, functions in Frankfurt, `vercel.json`) with a Neon Postgres database in Frankfurt, added through the Vercel Marketplace. Neon sets `DATABASE_URL` (pooled, for the app) and `DATABASE_URL_UNPOOLED` (direct) on the project; every preview deployment gets its own Neon branch.

Pushing to `main` deploys production, and every pull request gets a preview. On Vercel the build runs `scripts/vercel-build.sh`: it applies migrations, imports the pubs only if the database has none (`db:import -- --if-empty`, so pubs fixed by hand are never overwritten), then runs `next build`. To re-import into a database that already has pubs, run `npm run db:import` against it.

## Accounts

Log in and sign up share one page (`/cs/prihlaseni`, `/en/login`), and the only way in is a Google account. The first sign-in creates the account; the user then picks a username and confirms they are 18 or over, and only then is sign-up finished. Sessions are signed cookies (JWT); users and their linked Google accounts are in the `users` and `accounts` tables. Each user has a role: `user` (default), `moderator` or `admin`. There is no admin screen yet; set a role in the database:

```sql
update users set role = 'admin' where email = 'you@example.com';
```

### Environment variables

Set these in Vercel (Project → Settings → Environment Variables) for Production and Preview, and in `.env.local` for local development. `.env.example` lists them all.

| Variable | Needed | What it is |
| --- | --- | --- |
| `DATABASE_URL` | always | Postgres connection (Neon sets it on Vercel). Locally `pglite://./data/pglite`. |
| `DATABASE_URL_UNPOOLED` | Vercel | Direct Postgres connection for migrations (set by Neon). |
| `AUTH_SECRET` | production | Signs the session cookies. Generate with `npx auth secret` or `openssl rand -base64 33`. Without it, the site runs with accounts switched off. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | production | Google OAuth client. Without them the login page says signing in isn't set up. |
| `AUTH_DEV_LOGIN` | tests only | `1` turns on the dev login in a local production build. It is on by default under `npm run dev` and never works on Vercel. |
| `AUTH_TRUST_HOST` | self-hosting only | `true` when running `next start` outside Vercel. |

### Setting up Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a project (or pick one), then set up the **OAuth consent screen**: app name Nádražky, your support email, scopes `email`, `profile` and `openid`. Publish it, or add testers while it is in testing.
2. **Create credentials → OAuth client ID → Web application.** Authorised redirect URIs:
   - `https://nadrazky.vercel.app/api/auth/callback/google` (and the same path on a custom domain, if you add one)
   - `http://localhost:3000/api/auth/callback/google` (local development)
3. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

Preview deployments have changing URLs that Google won't accept as redirect URIs, so Google sign-in works on production and locally, not on previews.

## Check-ins

Checking in needs an account but no location: the app never asks for or stores the visitor's position. Each user gets **one check-in per pub per day** (the day in Prague time), enforced by a unique index on `checkins (user_id, pub_id, day)`. Optional details: beer, a shot, a non-alcoholic drink, a snack (ticks), a rating from 1 to 5, a note (up to 280 characters), and whether the pub was open or closed. The pub page shows the number of check-ins, the last visit and the latest five check-ins.

## Routes

| Czech | English | Page |
| --- | --- | --- |
| `/cs` | `/en` | Home |
| `/cs/mapa` | `/en/map` | Map of all pubs |
| `/cs/hospody` | `/en/pubs` | List, search (works without diacritics), region and status filters |
| `/cs/hospoda/[slug]` | `/en/pub/[slug]` | Pub detail |
| `/cs/kraje`, `/cs/kraj/[slug]` | `/en/regions`, `/en/region/[slug]` | Regions |
| `/cs/trate`, `/cs/trat/[number]` | `/en/lines`, `/en/line/[number]` | Rail lines |
| `/cs/hospoda/[slug]/odbaveni` | `/en/pub/[slug]/check-in` | Check in at a pub (needs an account) |
| `/cs/prihlaseni` | `/en/login` | Log in, sign up, finish sign-up |
| `/cs/profil` | `/en/profile` | Your profile: pubs, stations, regions and lines visited (signed-in users) |
| `/cs/ochrana-soukromi` | `/en/privacy` | Privacy policy (controller and contact in `src/lib/privacy.ts`) |

## Next

Photos on check-ins, badges, "report a change" and the moderation queue — see the app plan.
