import { BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserCourses } from "@/actions/courses";
import { Breadcrumbs } from "@/components/breadcrumbs";

// Top-level tutor entry — picks a course, then jumps into that course's
// tutor route. Single-course users skip the picker.
export default async function TutorIndexPage() {
  const courses = await getUserCourses();

  if (courses.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        <Breadcrumbs items={[{ label: "AI Tutor" }]} />
        <div className="mt-8 rounded-2xl border border-hairline bg-white p-10 text-center dark:bg-[#141414]">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
            AI Tutor
          </p>
          <h1 className="mt-3 font-serif text-[36px] leading-tight text-ink">
            Add a course first.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] text-muted">
            The tutor is course-aware — pick a class to start.
          </p>
          <Link
            href="/courses/new"
            className="mt-7 inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#2e3fef] dark:hover:bg-[#6a7bff]"
          >
            <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
            Add a course
          </Link>
        </div>
      </div>
    );
  }

  if (courses.length === 1) {
    redirect(`/courses/${courses[0]!.id}/tutor`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <Breadcrumbs items={[{ label: "AI Tutor" }]} />
      <p className="mt-6 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        AI Tutor
      </p>
      <h1 className="mt-3 font-serif text-[44px] leading-[1.05] text-ink md:text-[56px]">
        Which <em className="italic text-accent">course</em>?
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-[1.55] text-muted">
        The tutor grounds every answer in the course you pick.
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courses/${c.id}/tutor`}
              className="group flex h-full flex-col rounded-2xl border border-hairline bg-white p-5 transition-all duration-200 hover:-translate-y-px hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414]"
            >
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                <MessageSquare
                  size={11}
                  strokeWidth={2}
                  className="text-accent"
                  aria-hidden="true"
                />
                Ask the tutor
              </span>
              <p className="mt-3 font-serif text-[22px] leading-tight text-ink">
                {c.name}
              </p>
              {c.professor || c.semester ? (
                <p className="mt-2 text-[12.5px] text-muted">
                  {[c.professor, c.semester].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <span className="mt-auto pt-6 text-[13px] font-medium text-accent transition-opacity group-hover:opacity-80">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
