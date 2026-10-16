CREATE TYPE "public"."location_match" AS ENUM('exact', 'prefix', 'manual', 'review', 'none');--> statement-breakpoint
CREATE TYPE "public"."pub_kind" AS ENUM('pub', 'restaurant', 'kiosk', 'cafe', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pub_status" AS ENUM('open', 'maybe_open', 'unknown', 'closed');--> statement-breakpoint
CREATE TABLE "pubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"station_id" integer NOT NULL,
	"kind" "pub_kind" DEFAULT 'unknown' NOT NULL,
	"status" "pub_status" DEFAULT 'unknown' NOT NULL,
	"closed_year" integer,
	"lat" double precision,
	"lon" double precision,
	"address" text,
	"opening_hours" text,
	"beers" text,
	"description_cs" text,
	"description_en" text,
	"location_match" "location_match" DEFAULT 'exact' NOT NULL,
	"source_id" integer,
	"source_url" text,
	"source_last_update_months_ago" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pubs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "pubs_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "rail_lines" (
	"number" text PRIMARY KEY NOT NULL,
	"name_cs" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_cs" text NOT NULL,
	"name_en" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_lines" (
	"station_id" integer NOT NULL,
	"line_number" text NOT NULL,
	CONSTRAINT "station_lines_station_id_line_number_pk" PRIMARY KEY("station_id","line_number")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"wikidata_id" text,
	"region_slug" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	CONSTRAINT "stations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "pubs" ADD CONSTRAINT "pubs_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_lines" ADD CONSTRAINT "station_lines_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_lines" ADD CONSTRAINT "station_lines_line_number_rail_lines_number_fk" FOREIGN KEY ("line_number") REFERENCES "public"."rail_lines"("number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_region_slug_regions_slug_fk" FOREIGN KEY ("region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pubs_station_idx" ON "pubs" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "pubs_status_idx" ON "pubs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stations_region_idx" ON "stations" USING btree ("region_slug");