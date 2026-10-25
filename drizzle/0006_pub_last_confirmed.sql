ALTER TABLE "pubs" ADD COLUMN "last_confirmed_at" timestamp with time zone;--> statement-breakpoint
-- Backfill from check-ins made before this migration: the latest one confirms the pub,
-- and marks it open if it found it open.
UPDATE "pubs" SET "last_confirmed_at" = latest."created_at"
FROM (SELECT DISTINCT ON ("pub_id") "pub_id", "created_at" FROM "checkins" ORDER BY "pub_id", "created_at" DESC) AS latest
WHERE latest."pub_id" = "pubs"."id";--> statement-breakpoint
UPDATE "pubs" SET "status" = 'open', "closed_year" = NULL
FROM (SELECT DISTINCT ON ("pub_id") "pub_id", "pub_was_open" FROM "checkins" ORDER BY "pub_id", "created_at" DESC) AS latest
WHERE latest."pub_id" = "pubs"."id" AND latest."pub_was_open";
