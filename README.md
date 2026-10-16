# Nádražky

The database of railway station pubs in the Czech Republic — find a station pub on your line, check in, collect badges. Czech and English. Made by [Prague Beer Guides](https://pragueguide.beer).

## Stack

- Next.js 16 (App Router) + Tailwind CSS 4, styled with the Prague Beer Guides design system tokens (`src/app/globals.css`)
- next-intl for Czech (`/cs/...`, default) and English (`/en/...`) with translated URLs (`/cs/hospoda/…`, `/en/pub/…`); texts live in `messages/cs.json` and `messages/en.json`
- PostgreSQL + Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/`)
- MapLibre GL with free OpenFreeMap tiles (no API key)

## Run locally

```bash
cp .env.example .env.local          # points at a local Postgres
# local Postgres, e.g.:
docker run -d --name nadrazky-db -e POSTGRES_USER=nadrazky -e POSTGRES_PASSWORD=nadrazky -e POSTGRES_DB=nadrazky -p 5432:5432 postgres:16
npm install
set -a; . ./.env.local; set +a
npm run db:setup                    # migrations + import of the pub list
npm run dev                         # http://localhost:3000
```

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
