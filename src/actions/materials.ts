"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { courses, type Material, materials } from "@/db/schema";
import { FILE_CATEGORIES } from "@/lib/file-categories";
import { embedMaterialForUser } from "./embed-material";

export type UserMaterialRow = Material & { courseName: string };

const createMaterialSchema = z.object({
  courseId: z.string().uuid(),
  name: z.string().trim().min(1, "File name is required").max(300),
  url: z.string().url("File URL is required"),
  fileType: z.string().max(100).default("application/octet-stream"),
  fileSize: z.number().int().nonnegative().default(0),
  fileCategory: z.enum(FILE_CATEGORIES).default("other"),
});

export type CreateMaterialInput = z.input<typeof createMaterialSchema>;
export type CreateMaterialResult =
  | { success: true; materialId: string }
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

export async function createMaterial(
  input: CreateMaterialInput,
): Promise<CreateMaterialResult> {
  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  if (!(await verifyCourseOwnership(parsed.data.courseId, userId))) {
    return { error: "Course not found" };
  }

  const [row] = await db
    .insert(materials)
    .values({
      courseId: parsed.data.courseId,
      userId,
      name: parsed.data.name,
      url: parsed.data.url,
      fileType: parsed.data.fileType,
      fileSize: parsed.data.fileSize,
      fileCategory: parsed.data.fileCategory,
    })
    .returning({ id: materials.id });

  if (!row) return { error: "Failed to save material" };

  // Fire-and-forget the embedding pipeline. `after()` schedules the work on
  // Next.js' waitUntil so the upload response returns immediately while the
  // embedding still runs to completion (unlike a bare Promise, which would
  // be killed when the response finishes on Vercel).
  const isPdf =
    parsed.data.fileType.includes("pdf") ||
    parsed.data.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const materialId = row.id;
    after(async () => {
      try {
        await embedMaterialForUser(materialId, userId);
      } catch (err) {
        console.error("[embed:background_error]", {
          materialId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  revalidatePath(`/courses/${parsed.data.courseId}`);
  revalidatePath("/materials");
  return { success: true, materialId: row.id };
}

// User-scoped read across all courses. Joined with course name for the
// dashboard, ordered by uploadedAt desc, capped at `limit`.
// Filters by userId AND materials.deletedAt IS NULL AND courses.deletedAt IS NULL.
export async function getUserMaterials(limit = 20): Promise<UserMaterialRow[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select({
      id: materials.id,
      courseId: materials.courseId,
      userId: materials.userId,
      name: materials.name,
      url: materials.url,
      fileType: materials.fileType,
      fileSize: materials.fileSize,
      fileCategory: materials.fileCategory,
      uploadedAt: materials.uploadedAt,
      deletedAt: materials.deletedAt,
      courseName: courses.name,
    })
    .from(materials)
    .innerJoin(courses, eq(materials.courseId, courses.id))
    .where(
      and(
        eq(materials.userId, userId),
        isNull(materials.deletedAt),
        isNull(courses.deletedAt),
      ),
    )
    .orderBy(desc(materials.uploadedAt))
    .limit(limit);
}

// Course-scoped read: filter by courseId AND userId AND deletedAt IS NULL.
export async function getCourseMaterials(
  courseId: string,
): Promise<Material[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select()
    .from(materials)
    .where(
      and(
        eq(materials.courseId, courseId),
        eq(materials.userId, userId),
        isNull(materials.deletedAt),
      ),
    )
    .orderBy(desc(materials.uploadedAt));
}

// Lightweight preview lookup by id — used by the tutor to open a citation
// inline in the material preview modal. Ownership-scoped like every other
// materials query.
export async function getMaterialPreview(
  materialId: string,
): Promise<UserMaterialRow | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [row] = await db
    .select({
      id: materials.id,
      courseId: materials.courseId,
      userId: materials.userId,
      name: materials.name,
      url: materials.url,
      fileType: materials.fileType,
      fileSize: materials.fileSize,
      fileCategory: materials.fileCategory,
      uploadedAt: materials.uploadedAt,
      deletedAt: materials.deletedAt,
      courseName: courses.name,
    })
    .from(materials)
    .innerJoin(courses, eq(materials.courseId, courses.id))
    .where(
      and(
        eq(materials.id, materialId),
        eq(materials.userId, userId),
        isNull(materials.deletedAt),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

const softDeleteSchema = z.object({ materialId: z.string().uuid() });

export async function softDeleteMaterial(
  input: unknown,
): Promise<{ success: true } | { success?: false; error: string }> {
  const parsed = softDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid material id" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [row] = await db
    .select({ id: materials.id, courseId: materials.courseId })
    .from(materials)
    .where(
      and(
        eq(materials.id, parsed.data.materialId),
        eq(materials.userId, userId),
        isNull(materials.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return { error: "Material not found" };

  await db
    .update(materials)
    .set({ deletedAt: new Date() })
    .where(and(eq(materials.id, row.id), eq(materials.userId, userId)));

  revalidatePath("/materials");
  revalidatePath(`/courses/${row.courseId}`);
  return { success: true };
}
