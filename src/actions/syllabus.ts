"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { courses, tasks, topics } from "@/db/schema";
import { extractPdfText, PdfExtractError } from "@/lib/pdf-extract";
import {
  parseSyllabusText,
  ParseError,
  type ParsedSyllabus,
} from "@/lib/syllabus-parser";

const inputSchema = z.object({
  courseId: z.string().uuid(),
  fileUrl: z.string().url(),
  materialId: z.string().uuid(),
});

export type ParseSyllabusResult =
  | { success: true; topicCount: number; taskCount: number }
  | { success?: false; error: string; reason: FailedReason };

// Every string that can appear in courses.syllabus_failed_reason. Keeping
// this in one place makes the banner's copy map exhaustive-checkable.
export type FailedReason =
  | "invalid_input"
  | "not_authed"
  | "unauthorized"
  | "course_not_found"
  // PDF stage
  | "download"
  | "http_error"
  | "empty_file"
  | "not_pdf"
  | "parse"
  | "parse_timeout"
  | "no_text"
  | "scanned"
  // LLM stage
  | "no_api_key"
  | "empty_input"
  | "anthropic_request"
  | "anthropic_timeout"
  | "no_text_block"
  | "invalid_json"
  | "schema_mismatch"
  | "refused"
  // Post-parse
  | "no_content_extracted"
  | "db_insert"
  | "unhandled";

export async function parseSyllabus(
  input: unknown,
): Promise<ParseSyllabusResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    console.warn("[syllabus] invalid input", { issues: parsed.error.issues });
    return {
      error: "Invalid input.",
      reason: "invalid_input",
    };
  }

  const { userId } = await auth();
  if (!userId) {
    return { error: "Not authenticated.", reason: "not_authed" };
  }

  const { courseId, fileUrl, materialId } = parsed.data;

  const log = (event: string, extra?: Record<string, unknown>) =>
    console.info(`[syllabus] ${event}`, { courseId, materialId, ...extra });

  log("start", { fileUrl });

  // Track writes so a mid-flight failure can be rolled back by soft-delete.
  const startTime = new Date();

  try {
    // ---- Ownership & load ----
    const [course] = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, courseId),
          eq(courses.userId, userId),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);
    if (!course) {
      // Two cases: the course truly doesn't exist, OR it exists but belongs to
      // another user. From this action's POV both are indistinguishable and
      // both are "you can't do this" — return unauthorized (not throw).
      console.warn("[syllabus] ownership check failed", { courseId, userId });
      return {
        error: "You don't have access to this course.",
        reason: "unauthorized",
      };
    }
    log("ownership_ok");

    // Mark parsing FIRST so the banner appears immediately, before PDF work.
    await db
      .update(courses)
      .set({
        syllabusStatus: "parsing",
        syllabusFailedReason: null,
        updatedAt: new Date(),
      })
      .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
    revalidatePath(`/courses/${courseId}`);
    log("status set to parsing");

    // ---- Idempotency: clear any prior rows for this material ----
    // Retrying a parse must not double-count. Soft-delete anything the
    // previous run left behind for this specific material.
    const now = new Date();
    const clearedTopics = await db
      .update(topics)
      .set({ deletedAt: now })
      .where(
        and(
          eq(topics.sourceMaterialId, materialId),
          eq(topics.userId, userId),
          isNull(topics.deletedAt),
        ),
      )
      .returning({ id: topics.id });
    const clearedTasks = await db
      .update(tasks)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(tasks.sourceMaterialId, materialId),
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
        ),
      )
      .returning({ id: tasks.id });
    if (clearedTopics.length || clearedTasks.length) {
      log("cleared prior rows", {
        topics: clearedTopics.length,
        tasks: clearedTasks.length,
      });
    }

    // ---- Extract text ----
    let extractedText: string;
    try {
      extractedText = await extractPdfText(fileUrl);
      log("pdf_ok", { textLength: extractedText.length });
    } catch (err) {
      return await failWith(
        courseId,
        userId,
        err instanceof PdfExtractError
          ? (err.reason as FailedReason)
          : "parse",
        err instanceof PdfExtractError
          ? err.message
          : `PDF extract failed (${err instanceof Error ? err.message : "unknown"}).`,
        err,
      );
    }

    // ---- Call LLM ----
    let extracted: ParsedSyllabus;
    try {
      const outcome = await parseSyllabusText(extractedText);
      extracted = outcome.parsed;
      log("llm_ok", {
        topics: extracted.topics.length,
        tasks: extracted.tasks.length,
        courseName: extracted.courseName,
        professor: extracted.professor,
        semester: extracted.semester,
        attempts: outcome.attempts,
        truncated: outcome.truncated,
      });
    } catch (err) {
      return await failWith(
        courseId,
        userId,
        err instanceof ParseError
          ? (err.reason as FailedReason)
          : "anthropic_request",
        err instanceof ParseError
          ? err.message
          : `LLM parse failed (${err instanceof Error ? err.message : "unknown"}).`,
        err,
      );
    }

    // ---- Shape rows ----
    const topicRows = extracted.topics
      .map((t) => {
        const date = t.date ? new Date(t.date) : null;
        return {
          courseId,
          userId,
          orderNumber: t.orderNumber,
          orderLabel: t.orderLabel,
          date: date && !Number.isNaN(date.getTime()) ? date : null,
          title: t.title.slice(0, 200),
          description: t.description?.slice(0, 2000) ?? null,
          sourceMaterialId: materialId,
        };
      })
      .filter((t) => t.title.trim().length > 0);

    const taskRows = extracted.tasks
      .map((t) => {
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        return {
          courseId,
          userId,
          title: t.title.slice(0, 200),
          description: t.description?.slice(0, 2000) ?? null,
          taskType: t.taskType,
          dueDate:
            dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
          source: "syllabus" as const,
          sourceMaterialId: materialId,
        };
      })
      .filter((t) => t.title.trim().length > 0);

    log("rows_shaped", {
      topicsAttempted: topicRows.length,
      tasksAttempted: taskRows.length,
      topicsDropped: extracted.topics.length - topicRows.length,
      tasksDropped: extracted.tasks.length - taskRows.length,
    });

    // ---- Zero-content guard ----
    if (topicRows.length === 0 && taskRows.length === 0) {
      console.warn("[syllabus] no_content_extracted", {
        courseId,
        materialId,
        modelSaidCourseName: extracted.courseName,
        modelSaidSemester: extracted.semester,
      });
      return await failWith(
        courseId,
        userId,
        "no_content_extracted",
        "We read the syllabus but couldn't find any topics or deadlines.",
      );
    }

    // ---- Persist (sequential — Neon HTTP has no interactive transactions) ----
    // On any failure, soft-delete rows we wrote after `startTime` before marking
    // the course failed.
    try {
      const patch: {
        name?: string;
        professor?: string;
        semester?: string;
        syllabusStatus: string;
        syllabusFailedReason: string | null;
        syllabusParsedAt: Date;
        updatedAt: Date;
      } = {
        syllabusStatus: "parsed",
        syllabusFailedReason: null,
        syllabusParsedAt: new Date(),
        updatedAt: new Date(),
      };
      if (extracted.courseName && !course.name.trim().length) {
        patch.name = extracted.courseName.slice(0, 120);
      }
      if (extracted.professor && !course.professor) {
        patch.professor = extracted.professor.slice(0, 120);
      }
      if (extracted.semester && !course.semester) {
        patch.semester = extracted.semester.slice(0, 60);
      }

      if (topicRows.length > 0) {
        await db.insert(topics).values(topicRows);
      }
      if (taskRows.length > 0) {
        await db.insert(tasks).values(taskRows);
      }
      // Flip course status last so a mid-flight failure never leaves us
      // "parsed" without rows behind it.
      await db
        .update(courses)
        .set(patch)
        .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));

      log("writes_committed", {
        topicsInserted: topicRows.length,
        tasksInserted: taskRows.length,
      });
    } catch (err) {
      await cleanupNewRows(courseId, materialId, userId, startTime).catch(
        (cleanupErr) => {
          console.error("[syllabus] cleanup failed", { cleanupErr });
        },
      );
      return await failWith(
        courseId,
        userId,
        "db_insert",
        `Could not save parsed syllabus (${err instanceof Error ? err.message : "unknown"}).`,
        err,
      );
    }

    revalidatePath(`/courses/${courseId}`);
    log("done", {
      topicCount: topicRows.length,
      taskCount: taskRows.length,
    });
    return {
      success: true,
      topicCount: topicRows.length,
      taskCount: taskRows.length,
    };
  } catch (err) {
    // Safety net — anything not caught by a stage handler above lands here.
    await cleanupNewRows(courseId, materialId, userId, startTime).catch(
      (cleanupErr) => {
        console.error("[syllabus] cleanup failed", { cleanupErr });
      },
    );
    return await failWith(
      courseId,
      userId,
      "unhandled",
      `Syllabus parsing failed (${err instanceof Error ? err.message : "unknown"}).`,
      err,
    );
  }
}

async function cleanupNewRows(
  courseId: string,
  materialId: string,
  userId: string,
  startTime: Date,
) {
  const stamp = new Date();
  const [t, k] = await Promise.all([
    db
      .update(topics)
      .set({ deletedAt: stamp })
      .where(
        and(
          eq(topics.courseId, courseId),
          eq(topics.userId, userId),
          eq(topics.sourceMaterialId, materialId),
          gte(topics.createdAt, startTime),
          isNull(topics.deletedAt),
        ),
      )
      .returning({ id: topics.id }),
    db
      .update(tasks)
      .set({ deletedAt: stamp, updatedAt: stamp })
      .where(
        and(
          eq(tasks.courseId, courseId),
          eq(tasks.userId, userId),
          eq(tasks.sourceMaterialId, materialId),
          gte(tasks.createdAt, startTime),
          isNull(tasks.deletedAt),
        ),
      )
      .returning({ id: tasks.id }),
  ]);
  if (t.length || k.length) {
    console.info("[syllabus] cleanup", {
      courseId,
      materialId,
      topicsCleaned: t.length,
      tasksCleaned: k.length,
    });
  }
}

async function failWith(
  courseId: string,
  userId: string,
  reason: FailedReason,
  message: string,
  cause?: unknown,
): Promise<ParseSyllabusResult> {
  console.error("[syllabus] failed", {
    courseId,
    reason,
    message,
    cause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message, stack: cause.stack }
        : cause,
  });
  try {
    await db
      .update(courses)
      .set({
        syllabusStatus: "failed",
        syllabusFailedReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));
  } catch (dbErr) {
    console.error("[syllabus] failed to write failed status", { dbErr });
  }
  revalidatePath(`/courses/${courseId}`);
  return { error: message, reason };
}
