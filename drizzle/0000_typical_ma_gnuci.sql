CREATE TABLE "policies" (
	"wallet_address" text NOT NULL,
	"version" integer NOT NULL,
	"id" text NOT NULL,
	"chain_id" text NOT NULL,
	"allowed_asset_ids" jsonb NOT NULL,
	"excluded_asset_ids" jsonb NOT NULL,
	"allowed_protocol_ids" jsonb NOT NULL,
	"max_single_transaction_micros" bigint NOT NULL,
	"max_autonomous_transaction_micros" bigint NOT NULL,
	"autonomy_enabled" boolean NOT NULL,
	"max_asset_concentration_bps" integer NOT NULL,
	"minimum_liquid_stable_reserve_bps" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policies_wallet_address_version_pk" PRIMARY KEY("wallet_address","version")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_wallet_address_users_wallet_address_fk" FOREIGN KEY ("wallet_address") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;