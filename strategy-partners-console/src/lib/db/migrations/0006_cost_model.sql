-- X1 — Modelo de custo/esforço: colunas de custo em execution_logs, persistidas a partir de
-- src/lib/server/costModel.ts (nunca um número inventado). Idempotente (ADD COLUMN IF NOT EXISTS)
-- — seguro para reaplicar.

ALTER TABLE "strategy_partners"."execution_logs" ADD COLUMN IF NOT EXISTS "task_type" text;
--> statement-breakpoint
ALTER TABLE "strategy_partners"."execution_logs" ADD COLUMN IF NOT EXISTS "tokens_output" integer;
--> statement-breakpoint
ALTER TABLE "strategy_partners"."execution_logs" ADD COLUMN IF NOT EXISTS "cost_brl" numeric(12, 4);
--> statement-breakpoint
ALTER TABLE "strategy_partners"."execution_logs" ADD COLUMN IF NOT EXISTS "analyst_hours_eq" numeric(8, 2);
