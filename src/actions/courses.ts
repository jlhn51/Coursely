"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { type Course, courses, materials, tasks, topics } from "@/db/schema";

const emptyToUndefined = (v: string | undefined) =>
  v && v.length > 0 ? v : undefined;

// Zod refines a "YYYY-MM-DD" string from <input type="date"> into a Date at
// UTC midnight. Empty strings become undefined (cleared).
const dateInput = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    // Force UTC to avoid drifting a day when the server is in a different tz.
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  });

const createCourseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required").max(120),
  professor: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform(emptyToUndefined),
  semester: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform(emptyToUndefined),
});

export type CreateCourseInput = z.input<typeof createCourseSchema>;
export type CreateCourseResult =
  | { success: true; courseId: string }
  | { success?: false; error: string };

export async function createCourse(
  input: CreateCourseInput,
): Promise<CreateCourseResult> {
  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [row] = await db
    .insert(courses)
    .values({
      userId,
      name: parsed.data.name,
      professor: parsed.data.professor,
      semester: parsed.data.semester,
    })
    .returning({ id: courses.id });

  if (!row) return { error: "Failed to create course" };

  revalidatePath("/dashboard");
  return { success: true, courseId: row.id };
}

// Course-scoping enforced at query layer per CLAUDE.md: every read filters
// by userId AND deletedAt IS NULL. Never trust caller-supplied IDs.
export async function getUserCourses(): Promise<Course[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select()
    .from(courses)
    .where(and(eq(courses.userId, userId), isNull(courses.deletedAt)))
    .orderBy(desc(courses.createdAt));
}

// ---------- update ----------

const updateCourseSchema = z
  .object({
    courseId: z.string().uuid(),
    name: z.string().trim().min(1, "Course name is required").max(120),
    professor: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform(emptyToUndefined),
    semester: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform(emptyToUndefined),
    startDate: dateInput,
    endDate: dateInput,
  })
  .refine(
    (v) =>
      !v.startDate || !v.endDate || v.endDate.getTime() >= v.startDate.getTime(),
    { message: "End date can't be earlier than start date", path: ["endDate"] },
  );

export type UpdateCourseInput = z.input<typeof updateCourseSchema>;
export type UpdateCourseResult =
  | { success: true }
  | { success?: false; error: string };

export async function updateCourse(
  input: UpdateCourseInput,
): Promise<UpdateCourseResult> {
  const parsed = updateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [existing] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        eq(courses.id, parsed.data.courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Course not found" };

  await db
    .update(courses)
    .set({
      name: parsed.data.name,
      // `?? null` clears the column when the user erases the field.
      professor: parsed.data.professor ?? null,
      semester: parsed.data.semester ?? null,
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(courses.id, existing.id), eq(courses.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath(`/courses/${parsed.data.courseId}`);
  return { success: true };
}

// ---------- soft-delete (cascades) ----------

const deleteCourseSchema = z.object({
  courseId: z.string().uuid(),
  confirmName: z.string().min(1),
});

export type SoftDeleteCourseResult =
  | { success: true }
  | { success?: false; error: string };

export async function softDeleteCourse(
  input: unknown,
): Promise<SoftDeleteCourseResult> {
  const parsed = deleteCourseSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [course] = await db
    .select({ id: courses.id, name: courses.name })
    .from(courses)
    .where(
      and(
        eq(courses.id, parsed.data.courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  if (!course) return { error: "Course not found" };

  // Confirmation guard: names must match exactly (case-sensitive, trimmed).
  if (parsed.data.confirmName.trim() !== course.name) {
    return { error: "The confirmation text does not match the course name." };
  }

  const now = new Date();

  // Cascade: soft-delete every child scoped to this course. Do it in a
  // transaction so a partial cascade can't leave orphans.
  await db.transaction(async (tx) => {
    await tx
      .update(courses)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(courses.id, course.id), eq(courses.userId, userId)));

    await tx
      .update(tasks)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(tasks.courseId, course.id),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      );

    await tx
      .update(materials)
      .set({ deletedAt: now })
      .where(
        and(
          eq(materials.courseId, course.id),
          eq(materials.userId, userId),
          isNull(materials.deletedAt),
        ),
      );

    await tx
      .update(topics)
      .set({ deletedAt: now })
      .where(
        and(
          eq(topics.courseId, course.id),
          eq(topics.userId, userId),
          isNull(topics.deletedAt),
        ),
      );
  });

  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/materials");
  return { success: true };
}
