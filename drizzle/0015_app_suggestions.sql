CREATE TABLE "app_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"message" text NOT NULL,
	"page" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_suggestions_message_check" CHECK (char_length("app_suggestions"."message") <= 2000),
	CONSTRAINT "app_suggestions_page_check" CHECK (char_length("app_suggestions"."page") <= 300)
);
--> statement-breakpoint
ALTER TABLE "app_suggestions" ADD CONSTRAINT "app_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_suggestions_created_idx" ON "app_suggestions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "app_suggestions_user_idx" ON "app_suggestions" USING btree ("user_id","created_at");