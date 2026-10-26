CREATE TYPE "public"."station_kind" AS ENUM('station', 'stop');--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "sr70" text;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "kind" "station_kind";--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_sr70_unique" UNIQUE("sr70");