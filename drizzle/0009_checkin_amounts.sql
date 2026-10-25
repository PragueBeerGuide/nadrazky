ALTER TABLE "checkins" ADD COLUMN "beers" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "checkins" ADD COLUMN "shots" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_beers_check" CHECK ("checkins"."beers" between 0 and 10);--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_shots_check" CHECK ("checkins"."shots" between 0 and 10);--> statement-breakpoint
-- Check-ins from before amounts: a ticked beer or shot counts as one.
UPDATE "checkins" SET "beers" = 1 WHERE "had_beer";--> statement-breakpoint
UPDATE "checkins" SET "shots" = 1 WHERE "had_shot";
