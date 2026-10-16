# Nádražky

The database of railway station pubs in the Czech Republic — find a station pub on your line, check in, collect badges. Czech and English. Made by [Prague Beer Guides](https://pragueguide.beer).

## Stack

- Next.js 16 (App Router) + Tailwind CSS 4, with the "Departures" design: Czech railway signage tokens (sign blue, timetable yellow, departure board) in `src/app/globals.css`; Barlow Condensed, IBM Plex Sans and IBM Plex Mono via `next/font`
- next-intl for Czech (`/cs/...`, default) and English (`/en/...`) with translated URLs (`/cs/hospoda/…`, `/en/pub/…`); texts live in `messages/cs.json` and `messages/en.json`
- PostgreSQL + Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/`); PGlite (embedded Postgres) for local development
- MapLibre GL with free OpenFreeMap tiles (no API key)

## Run locally

Needs Node.js 20 or newer. The local database is an embedded Postgres (PGlite) in `data/pglite`, so nothing else has to be installed.

```bash
npm install
npm run setup      # create the database and import the 782 pubs (about 10 s)
npm run dev        # http://localhost:3000
```

To use a real Postgres server instead (Neon in production), set `DATABASE_URL=postgresql://…` in `.env.local` and run `npm run setup` again.

## Data

`data/seed/nadrazky-pubs-located.json` holds the 782 station pubs that are not marked closed on [nadrazky.eu](https://nadrazky.eu) (used with the author's consent), matched to their stations. Station positions, regions and rail lines come from [Wikidata](https://www.wikidata.org) (CC0). Positions are the station's, not the pub door's, until corrected.

`npm run db:import` is idempotent: it updates existing pubs by their nadrazky.eu id.

## Routes

| Czech | English | Page |
| --- | --- | --- |
| `/cs` | `/en` | Home |
| `/cs/mapa` | `/en/map` | Map of all pubs |
| `/cs/hospody` | `/en/pubs` | List, search (works without diacritics), region and status filters |
| `/cs/hospoda/[slug]` | `/en/pub/[slug]` | Pub detail |
| `/cs/kraje`, `/cs/kraj/[slug]` | `/en/regions`, `/en/region/[slug]` | Regions |
| `/cs/trate`, `/cs/trat/[number]` | `/en/lines`, `/en/line/[number]` | Rail lines |

## Next

Accounts (Auth.js), GPS-verified check-ins, badges, "report a change" and the moderation queue — see the app plan.
