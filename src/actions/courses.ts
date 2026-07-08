"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { type Course, courses } from "@/db/schema";

const createCourseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required").max(120),
  professor: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  semester: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
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
