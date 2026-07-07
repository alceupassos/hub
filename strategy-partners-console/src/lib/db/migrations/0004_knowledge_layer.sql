CREATE TABLE "strategy_partners"."assumptions_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"unit" text,
	"sector" text,
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."deal_precedents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector" text NOT NULL,
	"thesis" text,
	"ev" numeric(18, 2),
	"ev_ebitda" numeric(8, 2),
	"ev_revenue" numeric(8, 2),
	"structure" text,
	"synergy_promised" numeric(18, 2),
	"synergy_captured" numeric(18, 2),
	"outcome" text,
	"lessons" text,
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."golden_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text,
	"keywords" text,
	"curated_by" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."market_multiples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector" text NOT NULL,
	"metric" text NOT NULL,
	"low" numeric(8, 2),
	"median" numeric(8, 2),
	"high" numeric(8, 2),
	"period" text,
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."sector_benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector" text NOT NULL,
	"stage" text,
	"metric" text NOT NULL,
	"p25" numeric(10, 2),
	"p50" numeric(10, 2),
	"p75" numeric(10, 2),
	"unit" text,
	"source" text,
	"as_of_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
