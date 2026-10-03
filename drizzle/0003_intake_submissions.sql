CREATE TABLE "intake_submissions" (
  "id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "goal" text NOT NULL,
  "portfolio" text NOT NULL,
  "time_horizon" text NOT NULL,
  "liquidity_preference" text NOT NULL,
  "risk_preference" text NOT NULL,
  "crypto_experience" text NOT NULL,
  "additional_context" text,
  "email" text NOT NULL,
  "contact_handle" text,
  "status" text DEFAULT 'new' NOT NULL
);
