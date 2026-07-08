-- Fase C — Camada Quantitativa (K2): premissas calibradas que alimentam o motor determinístico
-- (LBO/DCF/tributário/retornos). Idempotente (IF NOT EXISTS) — seguro para reaplicar.

CREATE TABLE IF NOT EXISTS "strategy_partners"."lbo_assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector" text NOT NULL,
	"entry_multiple_low" numeric(8, 2),
	"entry_multiple_high" numeric(8, 2),
	"exit_multiple_low" numeric(8, 2),
	"exit_multiple_high" numeric(8, 2),
	"total_leverage_turns" numeric(6, 2),
	"senior_turns" numeric(6, 2),
	"senior_rate" numeric(6, 4),
	"mezz_turns" numeric(6, 2),
	"mezz_rate" numeric(6, 4),
	"typical_hold_years" integer,
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_partners"."tax_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"unit" text,
	"jurisdiction" text DEFAULT 'BR',
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_partners"."financing_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument" text NOT NULL,
	"label" text NOT NULL,
	"all_in_rate_low" numeric(6, 4),
	"all_in_rate_high" numeric(6, 4),
	"tenor_years" integer,
	"notes" text,
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_partners"."returns_benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_class" text NOT NULL,
	"metric" text NOT NULL,
	"p25" numeric(8, 2),
	"p50" numeric(8, 2),
	"p75" numeric(8, 2),
	"unit" text,
	"region" text DEFAULT 'BR/LatAm',
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
