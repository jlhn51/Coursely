"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { type Topic, topics } from "@/db/schema";

export async function getCourseTopics(courseId: string): Promise<Topic[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select()
    .from(topics)
    .where(
      and(
        eq(topics.courseId, courseId),
        eq(topics.userId, userId),
        isNull(topics.deletedAt),
      ),
    )
    .orderBy(sql`${topics.orderNumber} asc nulls last`, asc(topics.createdAt));
}
