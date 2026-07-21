import { Plus } from "lucide-react";
import Link from "next/link";
import type { UserTaskRow } from "@/actions/tasks";
import type { Course } from "@/db/schema";
import { courseStatus, formatDueShort } from "@/lib/dashboard";

export function CourseCard({
  course,
  tasks,
  now,
}: {
  course: Course;
  tasks: UserTaskRow[];
  now: Date;
}) {
  const status = courseStatus(tasks, now);
  const dotColor =
    status.level === "red"
      ? "bg-red-500"
      : status.level === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const next =
    tasks
      .filter((t) => !t.isCompleted && t.dueDate)
      .sort(
        (a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime(),
      )[0] ?? null;

  const total = tasks.length;
  const done = tasks.filter((t) => t.isCompleted).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex h-full flex-col rounded-2xl border border-hairline bg-white p-6 transition-all duration-200 hover:border-ink/25 hover:shadow-[inset_0_-2px_0_0_rgb(59_76_255_/_0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:bg-[#141414] dark:hover:border-white/25 dark:hover:shadow-[inset_0_-2px_0_0_rgb(90_107_255_/_0.22)]"
    >
      <h3 className="font-serif text-[22px] leading-tight text-ink">
        {course.name}
      </h3>
      {course.professor || course.semester ? (
        <p className="mt-1.5 truncate text-[13px] text-muted">
          {[course.professor, course.semester].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${dotColor}`}
        />
        <span className="text-[12.5px] text-muted">{status.text}</span>
      </div>

      {next ? (
        <div className="mt-3 inline-flex min-w-0 max-w-full items-center gap-1.5 self-start rounded-full border border-hairline bg-paper px-2.5 py-1 text-[11.5px] dark:bg-[#0f0f10]">
          <span className="shrink-0 text-muted">Next:</span>
          <span className="min-w-0 truncate text-ink">{next.title}</span>
          <span className="shrink-0 text-muted/70" aria-hidden="true">
            ·
          </span>
          <span className="shrink-0 text-muted">
            {formatDueShort(next.dueDate as Date, now)}
          </span>
        </div>
      ) : null}

      <div className="mt-auto pt-6">
        {total > 0 ? (
          <>
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-hairline"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${course.name} progress`}
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
              {done}/{total} done
            </p>
          </>
        ) : (
          <p className="text-[11.5px] italic text-muted">No tasks yet.</p>
        )}
      </div>
    </Link>
  );
}

export function NewCourseCard() {
  return (
    <Link
      href="/courses/new"
      className="group flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-hairline bg-transparent p-6 text-center transition-colors hover:border-accent/60 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#141414]"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-muted transition-colors group-hover:border-accent group-hover:text-accent">
        <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <p className="mt-3 font-serif text-[20px] leading-tight text-ink">
        Add a course
      </p>
      <p className="mt-1 text-[12.5px] text-muted">
        Turn a syllabus into a semester.
      </p>
    </Link>
  );
}
