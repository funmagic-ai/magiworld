CREATE TABLE "oem_software_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"software_id" text NOT NULL,
	"theme_config" jsonb,
	"allowed_tool_type_ids" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oem_software_brands_slug_unique" UNIQUE("slug"),
	CONSTRAINT "oem_software_brands_software_id_unique" UNIQUE("software_id")
);
--> statement-breakpoint
CREATE TABLE "payment_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"payment_id" text NOT NULL,
	"brand_id" uuid,
	"channel" text DEFAULT 'web' NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"referrer_url" text,
	"landing_page" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_attributions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_logins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_id" uuid,
	"channel" text DEFAULT 'web' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "theme" TO "color_mode";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_brand_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "registration_channel" text DEFAULT 'web';--> statement-breakpoint
ALTER TABLE "payment_attributions" ADD CONSTRAINT "payment_attributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attributions" ADD CONSTRAINT "payment_attributions_brand_id_oem_software_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."oem_software_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_attributions" ADD CONSTRAINT "user_attributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_logins" ADD CONSTRAINT "user_logins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_logins" ADD CONSTRAINT "user_logins_brand_id_oem_software_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."oem_software_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_registration_brand_id_oem_software_brands_id_fk" FOREIGN KEY ("registration_brand_id") REFERENCES "public"."oem_software_brands"("id") ON DELETE no action ON UPDATE no action;