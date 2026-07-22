"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  courses,
  focusSessions,
  type FocusSession,
  tasks,
} from "@/db/schema";

const PRESET_TYPES = ["25_5", "50_10", "custom"] as const;
const STATUS_VALUES = ["active", "completed", "abandoned"] as const;

// ---------- Create ----------

const createSchema = z.object({
  presetType: z.enum(PRESET_TYPES),
  workDuration: z.number().int().min(60).max(120 * 60),
  breakDuration: z.number().int().min(60).max(60 * 60),
  plannedCycles: z.number().int().min(1).max(12),
  courseId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
});

export type CreateFocusInput = z.input<typeof createSchema>;
export type CreateFocusResult =
  | { success: true; sessionId: string }
  | { success?: false; error: string };

/**
 * Create a new focus_sessions row. Status starts "active" and stays that way
 * until the timer completes or the user leaves the page.
 */
export async function createFocusSession(
  input: CreateFocusInput,
): Promise<CreateFocusResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  // Verify optional attachments belong to this user before we accept them.
  const courseId = parsed.data.courseId ?? null;
  const taskId = parsed.data.taskId ?? null;

  if (courseId) {
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
    if (!row) return { error: "Course not found" };
  }
  if (taskId) {
    const [row] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return { error: "Task not found" };
  }

  const [row] = await db
    .insert(focusSessions)
    .values({
      userId,
      presetType: parsed.data.presetType,
      workDuration: parsed.data.workDuration,
      breakDuration: parsed.data.breakDuration,
      plannedCycles: parsed.data.plannedCycles,
      courseId,
      taskId,
      status: "active",
    })
    .returning({ id: focusSessions.id });
  if (!row) return { error: "Failed to start session" };

  return { success: true, sessionId: row.id };
}

// ---------- Update ----------

const updateSchema = z.object({
  sessionId: z.string().uuid(),
  completedCycles: z.number().int().min(0).max(24).optional(),
  totalWorkSeconds: z.number().int().min(0).max(24 * 3600).optional(),
  totalBreakSeconds: z.number().int().min(0).max(24 * 3600).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  ended: z.boolean().optional(),
});

export type UpdateFocusInput = z.input<typeof updateSchema>;
export type UpdateFocusResult =
  | { success: true }
  | { success?: false; error: string };

export async function updateFocusSession(
  input: UpdateFocusInput,
): Promise<UpdateFocusResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [row] = await db
    .select({ id: focusSessions.id })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.id, parsed.data.sessionId),
        eq(focusSessions.userId, userId),
      ),
    )
    .limit(1);
  if (!row) return { error: "Session not found" };

  const patch: Partial<typeof focusSessions.$inferInsert> = {};
  if (parsed.data.completedCycles !== undefined)
    patch.completedCycles = parsed.data.completedCycles;
  if (parsed.data.totalWorkSeconds !== undefined)
    patch.totalWorkSeconds = parsed.data.totalWorkSeconds;
  if (parsed.data.totalBreakSeconds !== undefined)
    patch.totalBreakSeconds = parsed.data.totalBreakSeconds;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.ended) patch.endedAt = new Date();

  if (Object.keys(patch).length === 0) return { success: true };

  await db
    .update(focusSessions)
    .set(patch)
    .where(eq(focusSessions.id, row.id));

  revalidatePath("/focus/stats");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------- Reads for stats + dashboard ----------

export type FocusSessionRow = FocusSession & {
  courseName: string | null;
  taskTitle: string | null;
};

/**
 * Return all focus sessions for the user since `since`. Ordered by startedAt
 * desc so callers can slice off the most recent N cheaply.
 */
export async function getFocusSessionsSince(
  since: Date,
): Promise<FocusSessionRow[]> {
  const { userId } = await auth();
  if (!userId) return [];

  // Left joins so a session without an attached course/task still comes back.
  return db
    .select({
      id: focusSessions.id,
      userId: focusSessions.userId,
      courseId: focusSessions.courseId,
      taskId: focusSessions.taskId,
      presetType: focusSessions.presetType,
      workDuration: focusSessions.workDuration,
      breakDuration: focusSessions.breakDuration,
      plannedCycles: focusSessions.plannedCycles,
      completedCycles: focusSessions.completedCycles,
      totalWorkSeconds: focusSessions.totalWorkSeconds,
      totalBreakSeconds: focusSessions.totalBreakSeconds,
      startedAt: focusSessions.startedAt,
      endedAt: focusSessions.endedAt,
      status: focusSessions.status,
      courseName: courses.name,
      taskTitle: tasks.title,
    })
    .from(focusSessions)
    .leftJoin(courses, eq(focusSessions.courseId, courses.id))
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.startedAt, since),
      ),
    )
    .orderBy(desc(focusSessions.startedAt));
}
