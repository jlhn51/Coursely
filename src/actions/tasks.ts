"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { courses, type Task, tasks } from "@/db/schema";
import { TASK_TYPES } from "@/lib/task-types";

export type UserTaskRow = Task & { courseName: string };

const emptyToUndefined = (v: string | undefined) =>
  v && v.length > 0 ? v : undefined;

const createTaskSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1, "Task title is required").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform(emptyToUndefined),
  taskType: z.enum(TASK_TYPES).default("other"),
  dueDate: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskResult =
  | { success: true; taskId: string }
  | { success?: false; error: string };

async function verifyCourseOwnership(courseId: string, userId: string) {
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        eq(courses.id, courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
}

export async function createTask(
  input: CreateTaskInput,
): Promise<CreateTaskResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  if (!(await verifyCourseOwnership(parsed.data.courseId, userId))) {
    return { error: "Course not found" };
  }

  const [row] = await db
    .insert(tasks)
    .values({
      courseId: parsed.data.courseId,
      userId,
      title: parsed.data.title,
      description: parsed.data.description,
      taskType: parsed.data.taskType,
      dueDate: parsed.data.dueDate,
      source: "manual",
    })
    .returning({ id: tasks.id });

  if (!row) return { error: "Failed to create task" };

  revalidatePath(`/courses/${parsed.data.courseId}`);
  return { success: true, taskId: row.id };
}

// User-scoped read across all courses. Joined with course name for the
// dashboard, ordered by due date asc nulls last, capped at `limit`.
// Filters by userId AND tasks.deletedAt IS NULL AND courses.deletedAt IS NULL.
export async function getUserTasks(limit = 100): Promise<UserTaskRow[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select({
      id: tasks.id,
      courseId: tasks.courseId,
      userId: tasks.userId,
      title: tasks.title,
      description: tasks.description,
      taskType: tasks.taskType,
      dueDate: tasks.dueDate,
      isCompleted: tasks.isCompleted,
      source: tasks.source,
      sourceMaterialId: tasks.sourceMaterialId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      deletedAt: tasks.deletedAt,
      courseName: courses.name,
    })
    .from(tasks)
    .innerJoin(courses, eq(tasks.courseId, courses.id))
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
        isNull(courses.deletedAt),
      ),
    )
    .orderBy(sql`${tasks.dueDate} asc nulls last`)
    .limit(limit);
}

// Course-scoped read: filter by courseId AND userId AND deletedAt IS NULL.
export async function getCourseTasks(courseId: string): Promise<Task[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.courseId, courseId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    )
    // sort by due date ascending, nulls last handled in the client view
    .orderBy(asc(tasks.dueDate));
}

// ---------- update ----------

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1, "Task title is required").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform(emptyToUndefined),
  taskType: z.enum(TASK_TYPES).default("other"),
  dueDate: z
    .string()
    .optional()
    // Empty string clears the date. A valid string becomes a Date; anything
    // unparseable is silently dropped.
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === "") return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }),
  isCompleted: z.boolean().optional(),
});

export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateTaskResult =
  | { success: true }
  | { success?: false; error: string };

export async function updateTask(
  input: UpdateTaskInput,
): Promise<UpdateTaskResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [existing] = await db
    .select({ id: tasks.id, courseId: tasks.courseId })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, parsed.data.taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Task not found" };

  const patch: Partial<typeof tasks.$inferInsert> = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    taskType: parsed.data.taskType,
    updatedAt: new Date(),
  };
  if (parsed.data.dueDate !== undefined) {
    patch.dueDate = parsed.data.dueDate;
  }
  if (parsed.data.isCompleted !== undefined) {
    patch.isCompleted = parsed.data.isCompleted;
  }

  await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, existing.id), eq(tasks.userId, userId)));

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${existing.courseId}`);
  return { success: true };
}

const softDeleteSchema = z.object({ taskId: z.string().uuid() });

export async function softDeleteTask(
  input: unknown,
): Promise<{ success: true } | { success?: false; error: string }> {
  const parsed = softDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid task id" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [row] = await db
    .select({ id: tasks.id, courseId: tasks.courseId })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, parsed.data.taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return { error: "Task not found" };

  await db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tasks.id, row.id), eq(tasks.userId, userId)));

  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath(`/courses/${row.courseId}`);
  return { success: true };
}

const toggleSchema = z.object({ taskId: z.string().uuid() });

export async function toggleTaskCompletion(
  input: unknown,
): Promise<
  | { success: true; isCompleted: boolean }
  | { success?: false; error: string }
> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid task id" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [task] = await db
    .select({
      id: tasks.id,
      isCompleted: tasks.isCompleted,
      courseId: tasks.courseId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, parsed.data.taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  if (!task) return { error: "Task not found" };

  const [updated] = await db
    .update(tasks)
    .set({ isCompleted: !task.isCompleted, updatedAt: new Date() })
    .where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)))
    .returning({ isCompleted: tasks.isCompleted });

  revalidatePath(`/courses/${task.courseId}`);
  return { success: true, isCompleted: updated?.isCompleted ?? !task.isCompleted };
}
