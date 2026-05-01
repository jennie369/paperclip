CREATE TABLE "timetable_manual_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"agent_id" uuid,
	"kind" text DEFAULT 'manual_task' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"note" text,
	"issue_id" uuid,
	"created_by_user_id" text,
	"created_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_row_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_table" text NOT NULL,
	"source_id" text NOT NULL,
	"result_override" text,
	"note" text,
	"updated_by_user_id" text,
	"updated_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_timetable_row_notes" UNIQUE("company_id","source_table","source_id")
);
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "timetable_manual_rows" ADD CONSTRAINT "timetable_manual_rows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_manual_rows" ADD CONSTRAINT "timetable_manual_rows_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_manual_rows" ADD CONSTRAINT "timetable_manual_rows_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_manual_rows" ADD CONSTRAINT "timetable_manual_rows_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_manual_rows" ADD CONSTRAINT "timetable_manual_rows_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_row_notes" ADD CONSTRAINT "timetable_row_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_row_notes" ADD CONSTRAINT "timetable_row_notes_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_row_notes" ADD CONSTRAINT "timetable_row_notes_updated_by_agent_id_agents_id_fk" FOREIGN KEY ("updated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_timetable_manual_company_starts" ON "timetable_manual_rows" USING btree ("company_id","starts_at");--> statement-breakpoint
CREATE INDEX "idx_timetable_manual_agent" ON "timetable_manual_rows" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_timetable_manual_issue" ON "timetable_manual_rows" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_timetable_row_notes_company" ON "timetable_row_notes" USING btree ("company_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_timetable_row_notes_source" ON "timetable_row_notes" USING btree ("source_table","source_id");