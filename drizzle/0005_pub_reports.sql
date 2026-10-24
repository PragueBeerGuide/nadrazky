CREATE TYPE "public"."pub_report_kind" AS ENUM('closed', 'reopened', 'name', 'hours', 'address', 'beers', 'location', 'other');--> statement-breakpoint
CREATE TYPE "public"."pub_report_status" AS ENUM('open', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "pub_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"pub_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"kind" "pub_report_kind" NOT NULL,
	"value" text,
	"message" text,
	"status" "pub_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "pub_reports_value_check" CHECK (char_length("pub_reports"."value") <= 200),
	CONSTRAINT "pub_reports_message_check" CHECK (char_length("pub_reports"."message") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "pub_reports" ADD CONSTRAINT "pub_reports_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pub_reports" ADD CONSTRAINT "pub_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pub_reports" ADD CONSTRAINT "pub_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pub_reports_status_idx" ON "pub_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "pub_reports_pub_idx" ON "pub_reports" USING btree ("pub_id");--> statement-breakpoint
CREATE INDEX "pub_reports_user_idx" ON "pub_reports" USING btree ("user_id","created_at");