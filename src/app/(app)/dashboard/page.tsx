import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName?.trim() || "there";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
      <h1 className="font-serif text-[40px] leading-[1.05] text-ink md:text-[56px]">
        Welcome back, <em className="italic text-accent">{firstName}</em>.
      </h1>
      <p className="mt-4 text-[17px] leading-[1.55] text-muted md:text-[19px]">
        Your semester starts here.
      </p>

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
          Upload a syllabus and Coursely will lay out your weekly topics and
          every deadline for you.
        </p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-6 inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-hairline px-4 py-2 text-[13px] font-medium text-muted opacity-60"
        >
          Add course <span aria-hidden="true">+</span>
        </button>
      </section>
    </div>
  );
}
