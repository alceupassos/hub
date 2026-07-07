CREATE TABLE "strategy_partners"."deal_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."deal_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."deal_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"arr" numeric(18, 2),
	"mrr" numeric(18, 2),
	"growth_rate" numeric(8, 2),
	"burn" numeric(18, 2),
	"team_size" integer,
	"churn" numeric(8, 2),
	"source" text,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."deal_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"thesis_id" uuid,
	"score" integer NOT NULL,
	"breakdown" text,
	"recommendation" text DEFAULT 'watch' NOT NULL,
	"rationale" text,
	"model_used" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."theses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"criteria" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "strategy_partners"."projects" ADD COLUMN "stage" text DEFAULT 'sourcing' NOT NULL;--> statement-breakpoint
ALTER TABLE "strategy_partners"."projects" ADD COLUMN "score_cache" integer;--> statement-breakpoint
ALTER TABLE "strategy_partners"."projects" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "strategy_partners"."projects" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "strategy_partners"."deal_activity" ADD CONSTRAINT "deal_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."deal_comments" ADD CONSTRAINT "deal_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."deal_comments" ADD CONSTRAINT "deal_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "strategy_partners"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."deal_metrics" ADD CONSTRAINT "deal_metrics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."deal_scores" ADD CONSTRAINT "deal_scores_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."deal_scores" ADD CONSTRAINT "deal_scores_thesis_id_theses_id_fk" FOREIGN KEY ("thesis_id") REFERENCES "strategy_partners"."theses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."theses" ADD CONSTRAINT "theses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "strategy_partners"."users"("id") ON DELETE no action ON UPDATE no action;