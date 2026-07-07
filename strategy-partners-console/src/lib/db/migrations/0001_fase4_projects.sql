CREATE TABLE "strategy_partners"."dd_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category" text NOT NULL,
	"item" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"document_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."legacy_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"status" text DEFAULT 'em_analise' NOT NULL,
	"annual_value" numeric(18, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"owner" text,
	"due_date" timestamp with time zone,
	"status" text DEFAULT 'pendente' NOT NULL,
	"is_day100" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."pmi_risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"mitigation" text,
	"owner" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."red_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"source_document_id" uuid,
	"detected_by_agent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."synergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"target_value" numeric(18, 2),
	"owner" text,
	"deadline" timestamp with time zone,
	"status" text DEFAULT 'planejada' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."talent_risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"risk_level" text DEFAULT 'media' NOT NULL,
	"retention_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_partners"."valuation_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"method" text NOT NULL,
	"low" numeric(18, 2),
	"base" numeric(18, 2),
	"high" numeric(18, 2),
	"assumptions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "strategy_partners"."dd_checklist_items" ADD CONSTRAINT "dd_checklist_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."dd_checklist_items" ADD CONSTRAINT "dd_checklist_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "strategy_partners"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."legacy_accounts" ADD CONSTRAINT "legacy_accounts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."pmi_risks" ADD CONSTRAINT "pmi_risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."red_flags" ADD CONSTRAINT "red_flags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."red_flags" ADD CONSTRAINT "red_flags_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "strategy_partners"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."synergies" ADD CONSTRAINT "synergies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."talent_risks" ADD CONSTRAINT "talent_risks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."valuation_estimates" ADD CONSTRAINT "valuation_estimates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE cascade ON UPDATE no action;