import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getUserCourses } from "@/actions/courses";
import type { Course } from "@/db/schema";

export default async function DashboardPage() {
  const [user, coursesList] = await Promise.all([
    currentUser(),
    getUserCourses(),
  ]);
  const firstName = user?.firstName?.trim() || "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <h1 className="font-serif text-[40px] leading-[1.05] text-ink md:text-[56px]">
        Welcome back, <em className="italic text-accent">{firstName}</em>.
      </h1>
      <p className="mt-4 text-[17px] leading-[1.55] text-muted md:text-[19px]">
        Your semester starts here.
      </p>

      {coursesList.length === 0 ? (
        <EmptyState />
      ) : (
        <CoursesGrid courses={coursesList} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <section
      aria-labelledby="courses-empty"
      className="mt-14 rounded-2xl border border-hairline bg-white p-8 dark:bg-[#141414]"
    >
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        Your courses
      </p>
      <h2
        id="courses-empty"
        className="mt-3 font-serif text-[24px] leading-tight text-ink"
      >
        No courses yet
      </h2>
      <p className="mt-2 max-w-[440px] text-[14.5px] leading-[1.55] text-muted">
        Add a course to start turning your syllabus into a semester plan.
      </p>
      <Link
        href="/courses/new"
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
      >
        Add course <span aria-hidden="true">+</span>
      </Link>
    </section>
  );
}

function CoursesGrid({ courses }: { courses: Course[] }) {
  return (
    <section aria-labelledby="courses-heading" className="mt-14">
      <div className="flex items-center justify-between">
        <h2
          id="courses-heading"
          className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted"
        >
          Your courses
        </h2>
        <Link
          href="/courses/new"
          className="inline-flex items-center gap-1 rounded-md border border-hairline px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
        >
          <span aria-hidden="true">+</span> New course
        </Link>
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courses/${c.id}`}
              className="group flex h-full flex-col rounded-2xl border border-hairline bg-white p-6 transition-all duration-200 hover:border-ink/25 hover:shadow-[inset_0_-2px_0_0_rgb(59_76_255_/_0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:bg-[#141414] dark:hover:border-white/25 dark:hover:shadow-[inset_0_-2px_0_0_rgb(90_107_255_/_0.25)]"
            >
              <h3 className="font-serif text-[22px] leading-tight text-ink">
                {c.name}
              </h3>
              {c.professor || c.semester ? (
                <p className="mt-2 text-[13.5px] text-muted">
                  {[c.professor, c.semester].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <span
                aria-hidden="true"
                className="mt-auto flex justify-end pt-6 text-[15px] text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
