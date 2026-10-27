CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge" text NOT NULL,
	"level" smallint NOT NULL,
	"complete" boolean DEFAULT false NOT NULL,
	"checkin_id" integer,
	"earned_at" timestamp with time zone NOT NULL,
	"seen_at" timestamp with time zone,
	CONSTRAINT "user_badges_level_check" CHECK ("user_badges"."level" >= 1)
);
--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_checkin_id_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."checkins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_level_idx" ON "user_badges" USING btree ("user_id","badge","level");--> statement-breakpoint
CREATE INDEX "user_badges_unseen_idx" ON "user_badges" USING btree ("user_id","seen_at");