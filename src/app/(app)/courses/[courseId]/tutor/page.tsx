import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  countEmbeddedMaterials,
  getSessionMessages,
  getStarterChipContext,
  listSessionsForCourse,
} from "@/actions/tutor";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TutorClient } from "./tutor-client";

const paramsSchema = z.object({ courseId: z.string().uuid() });
const searchSchema = z.object({
  session: z.string().uuid().optional(),
  prompt: z.string().max(500).optional(),
});

export default async function TutorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();

  const { userId } = await auth();
  if (!userId) notFound();

  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, parsedParams.data.courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  if (!course) notFound();

  // Normalize search params — Next 15/16 makes them a Promise of arrays.
  const rawSearch = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(rawSearch)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const parsedSearch = searchSchema.safeParse(flat);
  const activeSessionId = parsedSearch.success
    ? parsedSearch.data.session
    : undefined;
  const preloadedPrompt = parsedSearch.success
    ? parsedSearch.data.prompt
    : undefined;

  const [sessions, embeddedCount, chipCtx] = await Promise.all([
    listSessionsForCourse(course.id),
    countEmbeddedMaterials(course.id),
    getStarterChipContext(course.id),
  ]);

  // If the URL points to a valid session, hydrate its messages server-side
  // so the first paint isn't a spinner.
  const activeMessages = activeSessionId
    ? await getSessionMessages(activeSessionId)
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <Breadcrumbs
        items={[
          { label: "Courses", href: "/courses" },
          { label: course.name, href: `/courses/${course.id}` },
          { label: "AI Tutor" },
        ]}
      />
      <TutorClient
        course={{ id: course.id, name: course.name }}
        initialSessions={sessions.map((s) => ({
          id: s.id,
          title: s.title,
          updatedAt: s.updatedAt.toISOString(),
        }))}
        activeSessionId={activeSessionId ?? null}
        activeMessages={activeMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          // Drizzle types citations as `unknown` (jsonb). Passed through to
          // the client as-is; the client parses it against our type.
          citations: m.citations as
            | Array<{
                chunkId: string;
                materialId: string;
                materialName: string;
                pageNumber: number | null;
                textPreview: string;
              }>
            | null,
          createdAt: m.createdAt.toISOString(),
        }))}
        embeddedMaterialCount={embeddedCount}
        starterChipContext={chipCtx}
        preloadedPrompt={preloadedPrompt ?? null}
      />
    </div>
  );
}
