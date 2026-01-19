CREATE TYPE "public"."circuit_state" AS ENUM('closed', 'open', 'half_open');--> statement-breakpoint
CREATE TYPE "public"."dead_letter_status" AS ENUM('pending', 'retried', 'archived');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('active', 'inactive', 'degraded');--> statement-breakpoint
CREATE TABLE "dead_letter_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_task_id" uuid,
	"queue" text NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"attempts_made" integer NOT NULL,
	"payload" jsonb,
	"status" "dead_letter_status" DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"retried_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"api_key_encrypted" text,
	"rate_limit_max" integer DEFAULT 100,
	"rate_limit_window" integer DEFAULT 60000,
	"default_timeout" integer DEFAULT 120000,
	"status" "provider_status" DEFAULT 'active' NOT NULL,
	"circuit_state" "circuit_state" DEFAULT 'closed' NOT NULL,
	"circuit_opened_at" timestamp,
	"failure_count" integer DEFAULT 0,
	"config_json" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"tool_id" uuid NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text,
	"price_config" jsonb NOT NULL,
	"usage_data" jsonb,
	"cost_usd" text,
	"latency_ms" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "provider_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "bull_job_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "attempts_made" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "price_config" jsonb;--> statement-breakpoint
ALTER TABLE "dead_letter_tasks" ADD CONSTRAINT "dead_letter_tasks_original_task_id_tasks_id_fk" FOREIGN KEY ("original_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_usage_logs" ADD CONSTRAINT "task_usage_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_usage_logs" ADD CONSTRAINT "task_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_usage_logs" ADD CONSTRAINT "task_usage_logs_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_usage_logs" ADD CONSTRAINT "task_usage_logs_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_idempotency_key_unique" UNIQUE("idempotency_key");