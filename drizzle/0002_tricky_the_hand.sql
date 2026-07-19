CREATE TABLE "file_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text,
	"note" text,
	"owner_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_uploads" integer,
	"max_bytes" bigint,
	"close_after_first" boolean DEFAULT false NOT NULL,
	"upload_count" integer DEFAULT 0 NOT NULL,
	"received_bytes" bigint DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_requests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "file_requests" ADD CONSTRAINT "file_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_requests_owner_idx" ON "file_requests" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_request_id_file_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."file_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_request_idx" ON "files" USING btree ("request_id");