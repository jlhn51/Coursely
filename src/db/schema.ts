import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    professor: text("professor"),
    semester: text("semester"),
    // none | parsing | parsed | failed
    syllabusStatus: text("syllabus_status").notNull().default("none"),
    // Machine-readable reason set only when syllabusStatus === "failed".
    // Values: scanned | no_text | download | parse | anthropic_request |
    // invalid_json | schema_mismatch | empty_input | no_content_extracted |
    // db_insert | unauthorized | course_not_found | unhandled
    syllabusFailedReason: text("syllabus_failed_reason"),
    syllabusParsedAt: timestamp("syllabus_parsed_at", { withTimezone: true }),
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

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
