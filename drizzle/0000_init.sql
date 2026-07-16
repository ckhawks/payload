CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"owner_id" text NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gists" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"language" text,
	"owner_id" text NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"target_url" text NOT NULL,
	"owner_id" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "registration_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"created_by" text NOT NULL,
	"used_by" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gists" ADD CONSTRAINT "gists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_codes" ADD CONSTRAINT "registration_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_codes" ADD CONSTRAINT "registration_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_owner_idx" ON "files" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gists_owner_idx" ON "gists" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "links_owner_idx" ON "links" USING btree ("owner_id");