import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    professor: text("professor"),
    semester: text("semester"),
    // Nullable calendar bounds. When both are set the dashboard shows real
    // "Week X of Y" progress; otherwise it falls back to an empty state.
    startDate: date("start_date", { mode: "date" }),
    endDate: date("end_date", { mode: "date" }),
    // none | parsing | parsed | failed
    syllabusStatus: text("syllabus_status").notNull().default("none"),
    // Machine-readable reason set only when syllabusStatus === "failed".
    // Values: scanned | no_text | download | parse | anthropic_request |
    // invalid_json | schema_mismatch | empty_input | no_content_extracted |
    // db_insert | unauthorized | course_not_found | unhandled
    syllabusFailedReason: text("syllabus_failed_reason"),
    syllabusParsedAt: timestamp("syllabus_parsed_at", { withTimezone: true }),
    // Last time we ran the Voyage embedding pipeline over this course's
    // materials. Nullable because a course starts un-embedded.
    lastEmbeddedAt: timestamp("last_embedded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("courses_user_id_idx").on(t.userId)],
);

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    fileType: text("file_type").notNull().default("application/octet-stream"),
    fileSize: integer("file_size").notNull().default(0),
    // syllabus | slides | notes | other — user-supplied category
    fileCategory: text("file_category").notNull().default("other"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("materials_course_id_idx").on(t.courseId),
    index("materials_user_id_idx").on(t.userId),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id").notNull(),
    // Syllabi organize by lecture (1..N), week (1..15), module, chapter, or
    // unit — orderLabel names the axis so the timeline can render it back.
    // No upper cap: real syllabi go 36+ lectures.
    orderNumber: integer("order_number"),
    orderLabel: text("order_label"), // "Week" | "Lecture" | "Module" | "Chapter" | "Unit"
    // ISO date of the class meeting (nullable — schedule-less syllabi are fine).
    date: timestamp("date", { withTimezone: true, mode: "date" }),
    title: text("title").notNull(),
    description: text("description"),
    sourceMaterialId: uuid("source_material_id").references(() => materials.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("topics_course_id_idx").on(t.courseId),
    index("topics_user_id_idx").on(t.userId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    // pset | exam | paper | reading | other — validated at the app layer
    taskType: text("task_type").notNull().default("other"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    isCompleted: boolean("is_completed").notNull().default(false),
    // manual | syllabus
    source: text("source").notNull().default("manual"),
    sourceMaterialId: uuid("source_material_id").references(() => materials.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("tasks_course_id_idx").on(t.courseId),
    index("tasks_user_id_idx").on(t.userId),
    index("tasks_due_date_idx").on(t.dueDate),
  ],
);

// Per-material chunks with Voyage voyage-3.5 embeddings (1024 dims).
// Course-scoping is enforced at the query layer: every read filters by
// courseId + userId + deletedAt IS NULL, same rule as materials.
export const materialChunks = pgTable(
  "material_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    userId: text("user_id").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    pageNumber: integer("page_number"),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("material_chunks_course_id_idx").on(t.courseId),
    index("material_chunks_user_id_idx").on(t.userId),
    index("material_chunks_material_id_idx").on(t.materialId),
  ],
);

// One chat session per topic-of-conversation. v2 always scopes to a course.
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    // Nullable for future general-purpose chats; v2 always populates it.
    courseId: uuid("course_id").references(() => courses.id),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("chat_sessions_user_id_idx").on(t.userId),
    index("chat_sessions_course_id_idx").on(t.courseId),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    // "user" | "assistant" — enforced at the app layer with a Zod enum.
    role: text("role").notNull(),
    content: text("content").notNull(),
    // Array of { chunkId, materialId, materialName, pageNumber, textPreview }
    // Nullable for user messages and general-mode assistant messages.
    citations: jsonb("citations"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_messages_session_id_idx").on(t.sessionId)],
);

// Every focus mode timer run — active, completed, or abandoned. Aggregates
// power the /focus/stats page and the dashboard FOCUS card.
export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    courseId: uuid("course_id").references(() => courses.id),
    taskId: uuid("task_id").references(() => tasks.id),
    // "25_5" | "50_10" | "custom" — enforced at the app layer.
    presetType: text("preset_type").notNull().default("custom"),
    workDuration: integer("work_duration").notNull(),
    breakDuration: integer("break_duration").notNull(),
    plannedCycles: integer("planned_cycles").notNull(),
    completedCycles: integer("completed_cycles").notNull().default(0),
    totalWorkSeconds: integer("total_work_seconds").notNull().default(0),
    totalBreakSeconds: integer("total_break_seconds").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    // "active" | "completed" | "abandoned"
    status: text("status").notNull().default("active"),
  },
  (t) => [
    index("focus_sessions_user_id_idx").on(t.userId),
    index("focus_sessions_started_at_idx").on(t.startedAt),
  ],
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
export type MaterialChunk = typeof materialChunks.$inferSelect;
export type NewMaterialChunk = typeof materialChunks.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type FocusSession = typeof focusSessions.$inferSelect;
export type NewFocusSession = typeof focusSessions.$inferInsert;

// Citation payload persisted on chat_messages.citations. Kept here so the
// tutor UI, backend, and any admin tooling agree on the shape.
export type ChatCitation = {
  chunkId: string;
  materialId: string;
  materialName: string;
  pageNumber: number | null;
  textPreview: string;
};
