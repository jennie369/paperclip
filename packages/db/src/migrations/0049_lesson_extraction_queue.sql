-- Layer 1.5 lesson extraction queue (2026-04-28)
-- Khi issue chuyển từ open → done/cancelled, server hook insert 1 row vào
-- queue này. Heartbeat agent Section 0.7 SELECT WHERE assignee_agent_id =
-- me AND status='pending' thay vì poll /api/issues. Lợi ích:
--   1. Audit trail (xem ai extract khi nào, retry counter, error message)
--   2. Cross-agent fan-out (CEO close issue ảnh hưởng Data Analyst → cả 2
--      cùng có row pending → cùng học)
--   3. Smaller scan (queue table nhỏ vs full issues)
--   4. Idempotent dedup ở DB level (UNIQUE issue_id, agent_id) thay vì
--      file-based marker memory/agents/{slug}/lesson_extracted.json
CREATE TABLE IF NOT EXISTS "lesson_extraction_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_status" text NOT NULL,           -- 'done' | 'cancelled'
	"trigger_actor_type" text,               -- 'agent' | 'user' | 'system'
	"trigger_actor_id" text,
	"status" text DEFAULT 'pending' NOT NULL, -- 'pending' | 'processing' | 'done' | 'failed' | 'skipped'
	"attempted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"lesson_summary" text,                   -- distilled lesson preview (first 500 chars)
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_lesson_extraction_queue" UNIQUE("issue_id","agent_id")
);
--> statement-breakpoint
ALTER TABLE "lesson_extraction_queue" ADD CONSTRAINT "lesson_extraction_queue_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_extraction_queue" ADD CONSTRAINT "lesson_extraction_queue_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_extraction_queue" ADD CONSTRAINT "lesson_extraction_queue_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lesson_queue_agent_status" ON "lesson_extraction_queue" USING btree ("agent_id","status");--> statement-breakpoint
CREATE INDEX "idx_lesson_queue_company_closed" ON "lesson_extraction_queue" USING btree ("company_id","closed_at");--> statement-breakpoint
CREATE INDEX "idx_lesson_queue_status_created" ON "lesson_extraction_queue" USING btree ("status","created_at");
