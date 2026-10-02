CREATE TABLE "plan_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"wallet_address" text,
	"example_preset" text,
	"goal" text NOT NULL,
	"time_horizon" text NOT NULL,
	"drop_behavior" text NOT NULL,
	"portfolio_snapshot" jsonb,
	"status" text NOT NULL,
	"strategy" text,
	"allocation" jsonb,
	"deterministic_reasons" jsonb,
	"ruled_out" jsonb,
	"ai_explanation" jsonb,
	"error" text
);
