import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getUserCourses } from "@/actions/courses";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { FocusClient } from "./focus-client";

// Focus route. The landing state, active session, and complete-modal all
// live inside FocusClient so the timer never trips a route transition.
// Server-side we just gather the "attach a task / course" pickers.
export default async function FocusPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [courses, openTasks] = await Promise.all([
    getUserCourses(),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        courseId: tasks.courseId,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.isCompleted, false),
          isNull(tasks.deletedAt),
        ),
      )
      .orderBy(asc(tasks.dueDate))
      .limit(50),
  ]);

  return (
    <FocusClient
      courses={courses.map((c) => ({ id: c.id, name: c.name }))}
      openTasks={openTasks.map((t) => ({
        id: t.id,
        title: t.title,
        courseId: t.courseId,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      }))}
    />
  );
}
