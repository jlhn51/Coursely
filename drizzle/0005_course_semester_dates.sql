-- Add nullable calendar bounds to courses so the semester-pulse card can
-- render real "Week X of Y" progress. Both columns default NULL — existing
-- rows show the empty state until the user edits the course.

ALTER TABLE "courses" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "end_date" date;
