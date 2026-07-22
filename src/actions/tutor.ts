"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  type ChatMessage,
  chatMessages,
  chatSessions,
  courses,
  materialChunks,
  materials,
  topics,
} from "@/db/schema";

// ---------- Session list / creation ----------

export type ChatSessionListItem = {
  id: string;
  title: string;
  updatedAt: Date;
};

/**
 * List a course's chat sessions, most recently updated first.
 * Course-scoping enforced at the query layer per CLAUDE.md.
 */
export async function listSessionsForCourse(
  courseId: string,
): Promise<ChatSessionListItem[]> {
  const { userId } = await auth();
  if (!userId) return [];

  return db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.userId, userId),
        eq(chatSessions.courseId, courseId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .orderBy(desc(chatSessions.updatedAt))
    .limit(200);
}

const createSessionSchema = z.object({
  courseId: z.string().uuid(),
});

export type CreateSessionResult =
  | { success: true; sessionId: string }
  | { success?: false; error: string };

export async function createChatSession(
  input: z.input<typeof createSessionSchema>,
): Promise<CreateSessionResult> {
  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  // Verify course ownership before creating.
  const [course] = await db
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
  if (!course) return { error: "Course not found" };

  const [row] = await db
    .insert(chatSessions)
    .values({
      userId,
      courseId: parsed.data.courseId,
      title: "New chat",
    })
    .returning({ id: chatSessions.id });
  if (!row) return { error: "Failed to create chat" };

  revalidatePath(`/courses/${parsed.data.courseId}/tutor`);
  return { success: true, sessionId: row.id };
}

const renameSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
});

export async function renameChatSession(
  input: z.input<typeof renameSchema>,
): Promise<{ success: true } | { success?: false; error: string }> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [session] = await db
    .select({ id: chatSessions.id, courseId: chatSessions.courseId })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, parsed.data.sessionId),
        eq(chatSessions.userId, userId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .limit(1);
  if (!session) return { error: "Session not found" };

  await db
    .update(chatSessions)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(eq(chatSessions.id, session.id));

  if (session.courseId) {
    revalidatePath(`/courses/${session.courseId}/tutor`);
  }
  return { success: true };
}

const deleteSchema = z.object({ sessionId: z.string().uuid() });

export async function softDeleteChatSession(
  input: z.input<typeof deleteSchema>,
): Promise<{ success: true } | { success?: false; error: string }> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  const [session] = await db
    .select({ id: chatSessions.id, courseId: chatSessions.courseId })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, parsed.data.sessionId),
        eq(chatSessions.userId, userId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .limit(1);
  if (!session) return { error: "Session not found" };

  await db
    .update(chatSessions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(chatSessions.id, session.id));

  if (session.courseId) {
    revalidatePath(`/courses/${session.courseId}/tutor`);
  }
  return { success: true };
}

// ---------- Message read ----------

// Grouped citation type for hydrating existing sessions.
export type StoredMessage = ChatMessage;

export async function getSessionMessages(
  sessionId: string,
): Promise<StoredMessage[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const [session] = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .limit(1);
  if (!session) return [];

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt));
}

// ---------- Course-level info for the tutor UI ----------

/**
 * How many DISTINCT materials in this course have any embedded chunks?
 * Drives the "Grounded in N materials" pill and the "add more materials"
 * banner. Filters to non-deleted chunks so a soft-deleted material stops
 * counting immediately.
 */
export async function countEmbeddedMaterials(
  courseId: string,
): Promise<number> {
  const { userId } = await auth();
  if (!userId) return 0;

  // COUNT(DISTINCT material_id). Drizzle's count() runs SQL COUNT; we use
  // a raw distinct via .selectDistinct + count(*) subquery pattern... but
  // simpler: fetch distinct material ids and count the array. Cardinality
  // is small (per-course), so this is fine.
  const rows = await db
    .selectDistinct({ materialId: materialChunks.materialId })
    .from(materialChunks)
    .where(
      and(
        eq(materialChunks.courseId, courseId),
        eq(materialChunks.userId, userId),
        isNull(materialChunks.deletedAt),
      ),
    );
  return rows.length;
}

/**
 * Convenience for the empty-state starter chips. Returns the most recently
 * added topic name and most recently uploaded material name for a course.
 */
export async function getStarterChipContext(courseId: string): Promise<{
  latestTopicTitle: string | null;
  latestMaterialName: string | null;
}> {
  const { userId } = await auth();
  if (!userId) return { latestTopicTitle: null, latestMaterialName: null };

  const [topic] = await db
    .select({ title: topics.title })
    .from(topics)
    .where(
      and(
        eq(topics.courseId, courseId),
        eq(topics.userId, userId),
        isNull(topics.deletedAt),
      ),
    )
    .orderBy(desc(topics.createdAt))
    .limit(1);

  const [material] = await db
    .select({ name: materials.name })
    .from(materials)
    .where(
      and(
        eq(materials.courseId, courseId),
        eq(materials.userId, userId),
        isNull(materials.deletedAt),
      ),
    )
    .orderBy(desc(materials.uploadedAt))
    .limit(1);

  return {
    latestTopicTitle: topic?.title ?? null,
    latestMaterialName: material?.name ?? null,
  };
}

