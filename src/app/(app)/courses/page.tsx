import { Plus } from "lucide-react";
import Link from "next/link";
import { getUserCourses } from "@/actions/courses";
import { getUserTasks, type UserTaskRow } from "@/actions/tasks";
import { CourseCard, NewCourseCard } from "@/components/course-card";
import { Reveal } from "@/components/reveal";

export default async function CoursesIndexPage() {
  const now = new Date();
  const [courses, tasks] = await Promise.all([
    getUserCourses(),
    getUserTasks(100),
  ]);

  const tasksByCourse = new Map<string, UserTaskRow[]>();
  for (const t of tasks) {
    const list = tasksByCourse.get(t.courseId);
    if (list) list.push(t);
    else tasksByCourse.set(t.courseId, [t]);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      <Reveal as="section">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-serif text-[36px] leading-[1.05] text-ink md:text-[52px]">
              Your <em className="italic text-accent">semester.</em>
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.55] text-muted md:text-[17px]">
              Every course you&apos;re taking, in one place.
            </p>
          </div>
          {courses.length > 0 ? (
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
            >
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" /> New course
            </Link>
          ) : null}
        </div>
      </Reveal>

      <Reveal as="section" className="mt-12 md:mt-16">
        {courses.length === 0 ? (
          <div className="rounded-2xl border border-hairline bg-white p-10 text-center dark:bg-[#141414] md:p-16">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              Get started
            </p>
            <h2 className="mt-3 font-serif text-[32px] leading-tight text-ink md:text-[40px]">
              Add your first <em className="italic text-accent">course.</em>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-[1.55] text-muted">
              Your semester starts here.
            </p>
            <Link
              href="/courses/new"
              className="mt-7 inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden="true" /> Add course
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <li key={c.id}>
                <CourseCard
                  course={c}
                  tasks={tasksByCourse.get(c.id) ?? []}
                  now={now}
                />
              </li>
            ))}
            <li>
              <NewCourseCard />
            </li>
          </ul>
        )}
      </Reveal>
    </div>
  );
}
