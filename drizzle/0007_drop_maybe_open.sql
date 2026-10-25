ALTER TABLE "pubs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
-- "Maybe open" is gone: those pubs become "unknown" until a check-in or report says otherwise.
UPDATE "pubs" SET "status" = 'unknown' WHERE "status" = 'maybe_open';--> statement-breakpoint
ALTER TABLE "pubs" ALTER COLUMN "status" SET DEFAULT 'unknown'::text;--> statement-breakpoint
DROP TYPE "public"."pub_status";--> statement-breakpoint
CREATE TYPE "public"."pub_status" AS ENUM('open', 'unknown', 'closed');--> statement-breakpoint
ALTER TABLE "pubs" ALTER COLUMN "status" SET DEFAULT 'unknown'::"public"."pub_status";--> statement-breakpoint
ALTER TABLE "pubs" ALTER COLUMN "status" SET DATA TYPE "public"."pub_status" USING "status"::"public"."pub_status";