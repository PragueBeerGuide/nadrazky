CREATE TYPE "public"."notification_kind" AS ENUM('friend_request', 'suggestion', 'report');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"actor_id" text,
	"friend_request_id" integer,
	"suggestion_id" integer,
	"report_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_friend_request_id_friend_requests_id_fk" FOREIGN KEY ("friend_request_id") REFERENCES "public"."friend_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_suggestion_id_app_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."app_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_pub_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."pub_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_friend_request_idx" ON "notifications" USING btree ("friend_request_id");--> statement-breakpoint
CREATE INDEX "notifications_report_idx" ON "notifications" USING btree ("report_id");