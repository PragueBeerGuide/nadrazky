ALTER TABLE "pubs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pubs" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "pubs" ADD CONSTRAINT "pubs_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;