CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
ALTER TABLE "app_suggestions" ADD COLUMN "status" "suggestion_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_suggestions" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_suggestions" ADD COLUMN "decided_by" text;--> statement-breakpoint
ALTER TABLE "app_suggestions" ADD CONSTRAINT "app_suggestions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_suggestions_status_idx" ON "app_suggestions" USING btree ("status","created_at");