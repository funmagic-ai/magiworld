CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logto_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "admin_users_logto_id_unique" UNIQUE("logto_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logto_id" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"name" text,
	"avatar_url" text,
	"locale" "locale" DEFAULT 'en',
	"theme" text DEFAULT 'neutral',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_logto_id_unique" UNIQUE("logto_id")
);
--> statement-breakpoint
-- Clean migration: Drop existing tasks data since user_id is changing from text to uuid FK
TRUNCATE TABLE "tasks";
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;