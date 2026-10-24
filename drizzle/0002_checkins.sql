CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pub_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"day" date NOT NULL,
	"had_beer" boolean DEFAULT false NOT NULL,
	"had_shot" boolean DEFAULT false NOT NULL,
	"had_non_alcoholic" boolean DEFAULT false NOT NULL,
	"had_snack" boolean DEFAULT false NOT NULL,
	"rating" smallint,
	"note" text,
	"pub_was_open" boolean NOT NULL,
	"distance_m" integer NOT NULL,
	"accuracy_m" integer,
	CONSTRAINT "checkins_rating_check" CHECK ("checkins"."rating" between 1 and 5),
	CONSTRAINT "checkins_note_check" CHECK (char_length("checkins"."note") <= 280)
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_user_pub_day_idx" ON "checkins" USING btree ("user_id","pub_id","day");--> statement-breakpoint
CREATE INDEX "checkins_pub_idx" ON "checkins" USING btree ("pub_id","created_at");