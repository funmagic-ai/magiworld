CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "home_banners" RENAME COLUMN "media_id" TO "image_url";--> statement-breakpoint
ALTER TABLE "home_banners" DROP CONSTRAINT "home_banners_media_id_media_id_fk";
--> statement-breakpoint
ALTER TABLE "home_banners" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_types" DROP COLUMN "icon";