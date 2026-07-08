import { NewCourseForm } from "./new-course-form";

export default function NewCoursePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 md:py-20">
      <h1 className="font-serif text-[36px] leading-[1.1] text-ink md:text-[44px]">
        Add a <em className="italic text-accent">course.</em>
      </h1>
      <p className="mt-3 text-[16px] leading-[1.55] text-muted">
        Give Coursely a course name and it&apos;ll build the rest around it.
      </p>
      <NewCourseForm />
    </div>
  );
}
