import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import {
  CalendarRange,
  FileText,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getCourseMaterials } from "@/actions/materials";
import { getCourseTasks } from "@/actions/tasks";
import { getCourseTopics } from "@/actions/topics";
import { db } from "@/db";
import { type Course, courses, type Task } from "@/db/schema";
import { JustUploadedScroll } from "./just-uploaded-scroll";
import { MaterialsSection } from "./materials-section";
import { SyllabusBanner } from "./syllabus-banner";
import { TasksSection } from "./tasks-section";
import { TimelineSection } from "./timeline-section";

const paramsSchema = z.object({ courseId: z.string().uuid() });

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const { userId } = await auth();
  if (!userId) notFound();

  // Course-scoping: id + userId + not-deleted. Anyone else's UUID → 404.
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

  const [tasks, materials, topics] = await Promise.all([
    getCourseTasks(course.id),
    getCourseMaterials(course.id),
    getCourseTopics(course.id),
  ]);

  const openTasks = tasks.filter((t) => !t.isCompleted).length;
  const doneTasks = tasks.filter((t) => t.isCompleted).length;
  const weeksIn = weeksSince(course.createdAt);
  const eyebrow = pickEyebrow(tasks, new Date());
  const hasTimeline = topics.length > 0;
  const latestSyllabus =
    materials.find((m) => m.fileCategory === "syllabus") ?? null;
  const syllabusTaskCount = tasks.filter((t) => t.source === "syllabus").length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <Header course={course} eyebrow={eyebrow} />

      <JustUploadedScroll status={course.syllabusStatus} />

      <SyllabusBanner
        courseId={course.id}
        status={course.syllabusStatus}
        failedReason={course.syllabusFailedReason}
        syllabus={
          latestSyllabus
            ? { id: latestSyllabus.id, url: latestSyllabus.url }
            : null
        }
        topicCount={topics.length}
        taskCount={syllabusTaskCount}
      />

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ZoneCard
          icon={FileText}
          label="Materials"
          count={materials.length}
          description="Your syllabus, slides, and notes."
          emptyText="No files yet. Drop in your syllabus, slides, or notes."
          cta={{ href: "#materials", label: "Add material" }}
          isEmpty={materials.length === 0}
        />
        <ZoneCard
          icon={CalendarRange}
          label="Timeline"
          indicator={
            hasTimeline
              ? `${topics.length} topic${topics.length === 1 ? "" : "s"}`
              : weeksIn >= 0
                ? `Week ${Math.max(weeksIn, 0) + 1}`
                : null
          }
          description="Where you are in the semester."
          emptyText="Upload your syllabus and Coursely will map out your weeks."
          cta={
            hasTimeline
              ? { href: "#timeline", label: "View timeline" }
              : { href: "#materials", label: "Upload syllabus" }
          }
          isEmpty={!hasTimeline}
        />
        <ZoneCard
          icon={ListChecks}
          label="Tasks"
          indicator={
            tasks.length === 0
              ? null
              : `${openTasks} open · ${doneTasks} done`
          }
          description="Everything due for this class."
          emptyText="Nothing due. Add a p-set or exam to get started."
          cta={{ href: "#tasks", label: "Add task" }}
          isEmpty={tasks.length === 0}
        />
      </div>

      <TimelineSection
        topics={topics}
        syllabusTaskCount={syllabusTaskCount}
      />
      <TasksSection courseId={course.id} tasks={tasks} />
      <MaterialsSection
        courseId={course.id}
        materials={materials}
        syllabusStatus={course.syllabusStatus}
      />
    </div>
  );
}

// ---------- Header ----------

function Header({
  course,
  eyebrow,
}: {
  course: Course;
  eyebrow: string;
}) {
  return (
    <header>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        {eyebrow}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h1 className="font-serif text-[40px] leading-[1.05] text-ink md:text-[56px]">
          {course.name}
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted dark:bg-[#141414]">
          <Sparkles size={11} strokeWidth={2} aria-hidden="true" className="text-accent" />
          Beta
        </span>
      </div>
      {course.professor || course.semester ? (
        <p className="mt-3 text-[14.5px] text-muted">
          {[course.professor, course.semester].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </header>
  );
}

// ---------- Zone card ----------

function ZoneCard({
  icon: Icon,
  label,
  count,
  indicator,
  description,
  emptyText,
  cta,
  isEmpty,
  comingSoon,
}: {
  icon: typeof FileText;
  label: string;
  count?: number;
  indicator?: string | null;
  description: string;
  emptyText: string;
  cta?: { href: string; label: string };
  isEmpty: boolean;
  comingSoon?: boolean;
}) {
  const meta =
    typeof count === "number"
      ? count > 0
        ? String(count)
        : null
      : (indicator ?? null);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-hairline bg-white p-6 dark:bg-[#141414]">
      <div className="flex items-center gap-2">
        <Icon size={14} strokeWidth={2} className="text-accent" aria-hidden="true" />
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
          {meta ? ` · ${meta}` : null}
        </p>
      </div>
      <p className="mt-3 text-[14.5px] leading-[1.5] text-ink">
        {description}
      </p>
      {isEmpty ? (
        <p className="mt-3 text-[13px] leading-[1.55] text-muted">
          {emptyText}
        </p>
      ) : null}

      {cta ? (
        <a
          href={cta.href}
          className="mt-auto inline-flex w-fit items-center gap-1 pt-6 text-[13px] font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {cta.label} <span aria-hidden="true">+</span>
        </a>
      ) : comingSoon ? (
        <p className="mt-auto pt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Coming soon
        </p>
      ) : null}
    </div>
  );
}

// ---------- Eyebrow logic ----------

function pickEyebrow(courseTasks: Task[], now: Date): string {
  const open = courseTasks.filter((t) => !t.isCompleted && t.dueDate);

  if (courseTasks.length === 0) return "No deadlines yet.";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const in3Days = new Date(startOfToday);
  in3Days.setDate(in3Days.getDate() + 3);
  const in7Days = new Date(startOfToday);
  in7Days.setDate(in7Days.getDate() + 7);

  const dueToday = open.some(
    (t) =>
      t.dueDate! >= startOfToday && t.dueDate! < startOfTomorrow,
  );
  if (dueToday) return "Something due today.";

  const hasOverdue = open.some((t) => t.dueDate! < startOfToday);
  if (hasOverdue) return "Overdue items in this class.";

  const examSoon = open.some(
    (t) =>
      t.taskType === "exam" &&
      t.dueDate! >= startOfToday &&
      t.dueDate! < in7Days,
  );
  if (examSoon) return "Exam this week.";

  const dueSoon = open.some(
    (t) => t.dueDate! >= startOfToday && t.dueDate! < in3Days,
  );
  if (dueSoon) return "Deadline coming up.";

  return "In session.";
}

function weeksSince(d: Date): number {
  const now = Date.now();
  const then = d.getTime();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24 * 7)));
}
