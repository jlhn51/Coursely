CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"week_number" integer,
	"title" text NOT NULL,
	"description" text,
	"source_material_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "syllabus_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "syllabus_parsed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "file_category" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_source_material_id_materials_id_fk" FOREIGN KEY ("source_material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "topics_course_id_idx" ON "topics" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "topics_user_id_idx" ON "topics" USING btree ("user_id");