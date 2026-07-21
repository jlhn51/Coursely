"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { courses, tasks, topics } from "@/db/schema";

export type ParsingStatusRow = {
  courseId: string;
  courseName: string;
  status: "parsing" | "parsed" | "failed" | "none";
  failedReason: string | null;
  topicCount: number;
  taskCount: number;
};

// Returns the status of any course the caller owns whose syllabusStatus is
// currently "parsing", plus per-course topic/task counts for anything that
// just finished. Used by the top-bar pill + completion toast poller.
export async function getActiveParsingStatuses(): Promise<ParsingStatusRow[]> {
  const { userId } = await auth();
  if (!userId) return [];

  // Include "parsed" and "failed" too so the client can see the transition
  // from parsing → parsed and fire the completion toast. Client filters.
  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      status: courses.syllabusStatus,
      failedReason: courses.syllabusFailedReason,
    })
    .from(courses)
    .where(
      and(
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
        inArray(courses.syllabusStatus, ["parsing", "parsed", "failed"]),
      ),
    );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const topicCounts = await db
    .select({
      courseId: topics.courseId,
      c: sql<number>`count(*)::int`,
    })
    .from(topics)
    .where(
      and(
        inArray(topics.courseId, ids),
        eq(topics.userId, userId),
        isNull(topics.deletedAt),
      ),
    )
    .groupBy(topics.courseId);
  const taskCounts = await db
    .select({
      courseId: tasks.courseId,
      c: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(
      and(
        inArray(tasks.courseId, ids),
        eq(tasks.userId, userId),
        eq(tasks.source, "syllabus"),
        isNull(tasks.deletedAt),
      ),
    )
    .groupBy(tasks.courseId);

  const topicMap = new Map(topicCounts.map((r) => [r.courseId, r.c]));
  const taskMap = new Map(taskCounts.map((r) => [r.courseId, r.c]));

  return rows.map((r) => ({
    courseId: r.id,
    courseName: r.name,
    status: r.status as ParsingStatusRow["status"],
    failedReason: r.failedReason,
    topicCount: topicMap.get(r.id) ?? 0,
    taskCount: taskMap.get(r.id) ?? 0,
  }));
}
