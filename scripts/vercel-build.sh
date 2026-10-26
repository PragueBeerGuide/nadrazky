#!/bin/sh
# Vercel runs this instead of "npm run build" (the "vercel-build" script in package.json).
# It applies migrations, fills an empty database and syncs the rail lines and stations over Neon's direct connection
# (DATABASE_URL is the pooled one, for the app), then builds.
set -e
DIRECT_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
DATABASE_URL="$DIRECT_URL" npm run db:migrate
DATABASE_URL="$DIRECT_URL" npm run db:import -- --if-empty
DATABASE_URL="$DIRECT_URL" npm run db:rail-lines
DATABASE_URL="$DIRECT_URL" npm run db:stations
npm run build
