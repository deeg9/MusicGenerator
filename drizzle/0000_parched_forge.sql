CREATE TYPE "public"."song_status" AS ENUM('generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'pro', 'unlimited');--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_token" text,
	"status" "song_status" DEFAULT 'generating' NOT NULL,
	"heartbula_job_id" text NOT NULL,
	"recipient_name" text NOT NULL,
	"relationship" text NOT NULL,
	"genre" text NOT NULL,
	"quiz_data" jsonb NOT NULL,
	"r2_wav_key" text,
	"r2_mp3_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "songs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"tier" "subscription_tier" NOT NULL,
	"status" "subscription_status" DEFAULT 'inactive' NOT NULL,
	"songs_remaining" integer DEFAULT 0 NOT NULL,
	"songs_per_month" integer DEFAULT 0 NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "songs_user_id_idx" ON "songs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "songs_session_token_idx" ON "songs" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "songs_status_idx" ON "songs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE POLICY "songs-authenticated-select" ON "songs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "songs-authenticated-update" ON "songs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "songs-authenticated-delete" ON "songs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "songs-anon-deny-all" ON "songs" AS PERMISSIVE FOR ALL TO "anon" USING (false);--> statement-breakpoint
CREATE POLICY "subscriptions-authenticated-select" ON "subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "subscriptions-anon-deny-all" ON "subscriptions" AS PERMISSIVE FOR ALL TO "anon" USING (false);