-- Rename week_number → order_number and add order_label + date so syllabi
-- can be organized by lecture, module, chapter, or unit — not just week.
-- Backfill legacy rows to keep them displayable.

ALTER TABLE "topics" RENAME COLUMN "week_number" TO "order_number";--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "order_label" text;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "date" timestamp with time zone;--> statement-breakpoint
UPDATE "topics" SET "order_label" = 'Week' WHERE "order_label" IS NULL AND "order_number" IS NOT NULL;
