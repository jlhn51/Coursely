-- v2 build: pgvector for course-material embeddings, chat sessions/messages
-- for the AI tutor, focus_sessions for the pomodoro timer, plus
-- courses.last_embedded_at so we can show "last synced" info per course.
--
-- Order matters:
--   1. CREATE EXTENSION vector — needed before any vector column
--   2. tables that reference vector
--   3. HNSW cosine index for retrieval

CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

ALTER TABLE "courses" ADD COLUMN "last_embedded_at" timestamp with time zone;--> statement-breakpoint

CREATE TABLE "material_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "material_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "chunk_index" integer NOT NULL,
  "text" text NOT NULL,
  "page_number" integer,
  "embedding" vector(1024) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_material_id_materials_id_fk"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX "material_chunks_course_id_idx" ON "material_chunks" ("course_id");--> statement-breakpoint
CREATE INDEX "material_chunks_user_id_idx" ON "material_chunks" ("user_id");--> statement-breakpoint
CREATE INDEX "material_chunks_material_id_idx" ON "material_chunks" ("material_id");--> statement-breakpoint

-- Cosine HNSW: matches the `embedding <=> $1` operator used at query time.
CREATE INDEX "material_chunks_embedding_idx" ON "material_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint

CREATE TABLE "chat_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "course_id" uuid,
  "title" text DEFAULT 'New chat' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_course_id_idx" ON "chat_sessions" ("course_id");--> statement-breakpoint

CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "citations" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk"
  FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages" ("session_id");--> statement-breakpoint

CREATE TABLE "focus_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "course_id" uuid,
  "task_id" uuid,
  "preset_type" text DEFAULT 'custom' NOT NULL,
  "work_duration" integer NOT NULL,
  "break_duration" integer NOT NULL,
  "planned_cycles" integer NOT NULL,
  "completed_cycles" integer DEFAULT 0 NOT NULL,
  "total_work_seconds" integer DEFAULT 0 NOT NULL,
  "total_break_seconds" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  "status" text DEFAULT 'active' NOT NULL
);--> statement-breakpoint

ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint

ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_task_id_tasks_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX "focus_sessions_user_id_idx" ON "focus_sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "focus_sessions_started_at_idx" ON "focus_sessions" ("started_at");
