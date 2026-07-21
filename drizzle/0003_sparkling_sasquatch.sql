ALTER TABLE "courses" ALTER COLUMN "syllabus_status" SET DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "syllabus_failed_reason" text;--> statement-breakpoint
-- Backfill legacy rows created before the default was renamed.
UPDATE "courses" SET "syllabus_status" = 'none' WHERE "syllabus_status" = 'idle';