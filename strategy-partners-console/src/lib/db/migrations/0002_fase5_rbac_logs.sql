CREATE TYPE "strategy_partners"."user_role" AS ENUM('admin', 'partner', 'analyst', 'client_viewer');--> statement-breakpoint
CREATE TABLE "strategy_partners"."execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"agent_id" text NOT NULL,
	"route" text NOT NULL,
	"question" text NOT NULL,
	"response_preview" text,
	"model_used" text,
	"duration_ms" integer,
	"confidence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "strategy_partners"."users" ADD COLUMN "role" "strategy_partners"."user_role" DEFAULT 'analyst' NOT NULL;--> statement-breakpoint
ALTER TABLE "strategy_partners"."users" ADD COLUMN "active" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "strategy_partners"."execution_logs" ADD CONSTRAINT "execution_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "strategy_partners"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_partners"."execution_logs" ADD CONSTRAINT "execution_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "strategy_partners"."projects"("id") ON DELETE no action ON UPDATE no action;