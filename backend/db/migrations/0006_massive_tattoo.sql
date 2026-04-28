ALTER TABLE "audit_log" ADD COLUMN "uuid" text NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log_archive" ADD COLUMN "uuid" text NOT NULL;