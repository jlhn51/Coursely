import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { courses } from "@/db/schema";

const paramsSchema = z.object({
  courseId: z.string().uuid(),
});

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const { userId } = await auth();
  if (!userId) notFound();

  // Course-scoping: filter by userId AND deletedAt IS NULL. A caller
  // supplying someone else's courseId gets a 404, not the row.
  const [course] = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.id, parsed.data.courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);

  if (!course) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        {course.semester ?? "Course"}
      </p>
      <h1 className="mt-3 font-serif text-[40px] leading-[1.05] text-ink md:text-[56px]">
        {course.name}
      </h1>
      {course.professor ? (
        <p className="mt-2 text-[15px] text-muted">{course.professor}</p>
      ) : null}

      <div className="mt-14 rounded-2xl border border-dashed border-hairline bg-white p-10 text-center dark:bg-[#141414]">
        <p className="font-serif text-[22px] text-ink">
          Course view coming soon.
        </p>
        <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] leading-[1.55] text-muted">
          Syllabus upload, weekly topics, tasks, and the AI tutor land here
          next.
        </p>
      </div>
    </div>
  );
}
