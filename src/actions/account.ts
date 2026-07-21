"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { courses, materials, tasks, topics } from "@/db/schema";

export type DeleteAllResult =
  | { success: true; deletedCourses: number }
  | { success?: false; error: string };

export async function deleteAllData(): Promise<DeleteAllResult> {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const now = new Date();

  const deletedCourses = await db
    .update(courses)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(courses.userId, userId), isNull(courses.deletedAt)))
    .returning({ id: courses.id });

  await db
    .update(tasks)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));

  await db
    .update(materials)
    .set({ deletedAt: now })
    .where(and(eq(materials.userId, userId), isNull(materials.deletedAt)));

  await db
    .update(topics)
    .set({ deletedAt: now })
    .where(and(eq(topics.userId, userId), isNull(topics.deletedAt)));

  revalidatePath("/dashboard");
  revalidatePath("/courses");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/materials");
  revalidatePath("/settings");

  return { success: true, deletedCourses: deletedCourses.length };
}
