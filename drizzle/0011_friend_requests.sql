CREATE TYPE "public"."friend_request_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"status" "friend_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "friend_requests_not_self_check" CHECK ("friend_requests"."requester_id" <> "friend_requests"."recipient_id")
);
--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_pair_idx" ON "friend_requests" USING btree (least("requester_id", "recipient_id"),greatest("requester_id", "recipient_id"));--> statement-breakpoint
CREATE INDEX "friend_requests_recipient_idx" ON "friend_requests" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE INDEX "friend_requests_requester_idx" ON "friend_requests" USING btree ("requester_id","status");