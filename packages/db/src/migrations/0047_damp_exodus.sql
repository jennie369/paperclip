ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "heartbeat_thread_issue_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sidebar_config" jsonb;