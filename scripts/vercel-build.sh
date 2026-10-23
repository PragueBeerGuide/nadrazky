#!/bin/sh
# Vercel runs this instead of "npm run build" (the "vercel-build" script in package.json).
# It applies migrations and fills an empty database over Neon's direct connection
# (DATABASE_URL is the pooled one, for the app), then builds.
set -e
DIRECT_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
DATABASE_URL="$DIRECT_URL" npm run db:migrate
DATABASE_URL="$DIRECT_URL" npm run db:import -- --if-empty
npm run build
