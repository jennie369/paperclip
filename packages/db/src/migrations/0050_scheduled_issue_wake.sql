-- Scheduled one-shot wake for assigned issues (2026-08-03)
-- Issue hẹn giờ: nằm ở backlog với scheduled_wake_at; scheduler tick flip
-- sang todo + wake agent đúng giờ (server/src/services/scheduled-issue-wakeups.ts).
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "scheduled_wake_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issues_scheduled_wake_idx" ON "issues" ("scheduled_wake_at") WHERE "scheduled_wake_at" is not null;
