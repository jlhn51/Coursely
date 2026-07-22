import { currentUser } from "@clerk/nextjs/server";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  CheckSquare,
  FileText,
  GraduationCap,
  type LucideIcon,
  Plus,
  ScrollText,
  Target,
  Timer,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getUserCourses } from "@/actions/courses";
import { getFocusSessionsSince } from "@/actions/focus";
import {
  getUserMaterials,
  type UserMaterialRow,
} from "@/actions/materials";
import { getUserTasks, type UserTaskRow } from "@/actions/tasks";
import { CourseCard, NewCourseCard } from "@/components/course-card";
import { Reveal } from "@/components/reveal";
import { PreferredNameNudge } from "./preferred-name-nudge";
import {
  formatDueShort,
  type Greeting,
  pickGreeting,
  pickSubtitle,
  relativeShort,
  type SemesterProgress,
  semesterProgress,
  type TaskWindows,
  taskWindows,
  urgencyFor,
} from "@/lib/dashboard";
import { type TaskType } from "@/lib/task-types";

const typeIcon: Record<TaskType, LucideIcon> = {
  pset: FileText,
  assignment: FileText,
  exam: GraduationCap,
  quiz: GraduationCap,
  paper: ScrollText,
  project: ScrollText,
  presentation: ScrollText,
  reading: BookOpen,
  other: CheckSquare,
};

export default async function DashboardPage() {
  const now = new Date();
  // 14-day window fuels the FOCUS card (this-vs-last-week comparison).
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);
  const [user, coursesList, tasksAll, materialsAll, focusSessions] =
    await Promise.all([
      currentUser(),
      getUserCourses(),
      // 500 keeps overdue tasks visible even for busy semesters. The per-course
      // status helper needs the full set to agree with the course-detail page.
      getUserTasks(500),
      getUserMaterials(20),
      getFocusSessionsSince(twoWeeksAgo),
    ]);

  const focusThisWeek = sumFocusSince(focusSessions, now, 0);
  const focusLastWeek = sumFocusSince(focusSessions, now, 7);

  // Preferred name (set in /settings) wins over Clerk's firstName, which is
  // often the user's full legal name typed into one field. ALWAYS split on
  // whitespace and take the first token — never render "Lewouo Nizegha Jerry"
  // as a greeting.
  const preferredName =
    typeof user?.unsafeMetadata?.preferredName === "string"
      ? user.unsafeMetadata.preferredName.trim() || undefined
      : undefined;
  const firstWord = (s?: string | null): string | undefined =>
    s?.trim().split(/\s+/)[0] || undefined;
  const firstName =
    preferredName ||
    firstWord(user?.firstName) ||
    firstWord(user?.fullName) ||
    "there";
  const clerkFirstName = user?.firstName?.trim() ?? "";

  // Nudge: firstName has whitespace AND user hasn't set a preferredName. The
  // dashboard shows a soft banner; the client marks it "dismissed" in
  // localStorage.
  const showPreferredNameNudge =
    !preferredName && /\s/.test(clerkFirstName);
  const hasCourses = coursesList.length > 0;

  const windows = taskWindows(tasksAll, now);
  const totalTasks = tasksAll.length;
  const completedTasks = tasksAll.filter((t) => t.isCompleted).length;

  const semester = semesterProgress(
    coursesList.map((c) => ({ startDate: c.startDate, endDate: c.endDate })),
    now,
  );

  const greeting = pickGreeting({
    hasCourses,
    totalTasks,
    windows,
    now,
  });
  const subtitle = pickSubtitle({ hasCourses, windows });

  const upcoming = tasksAll.filter((t) => !t.isCompleted && t.dueDate);
  const nextTask = upcoming[0] ?? null;
  const horizon = upcoming.slice(0, 10);

  const tasksByCourse = new Map<string, UserTaskRow[]>();
  for (const t of tasksAll) {
    const list = tasksByCourse.get(t.courseId);
    if (list) list.push(t);
    else tasksByCourse.set(t.courseId, [t]);
  }

  const newestCourseId = coursesList[0]?.id;
  const activity = buildActivity(tasksAll, materialsAll, now);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      {showPreferredNameNudge ? (
        <PreferredNameNudge firstName={firstName} />
      ) : null}
      <GreetingBlock
        greeting={greeting}
        firstName={firstName}
        subtitle={subtitle}
        hasCourses={hasCourses}
        newestCourseId={newestCourseId}
        totals={{ totalTasks, completedTasks }}
      />

      <Reveal as="section" className="mt-14 md:mt-20">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ThisWeekCard windows={windows} upcoming={upcoming} now={now} />
          <StudyFocusCard nextTask={nextTask} now={now} />
          <SemesterPulseCard
            semester={semester}
            hasCourses={hasCourses}
            newestCourseId={newestCourseId}
          />
        </div>
        <div className="mt-4">
          <FocusCard
            secondsThisWeek={focusThisWeek}
            secondsLastWeek={focusLastWeek}
          />
        </div>
      </Reveal>

      <Reveal as="section" className="mt-16 md:mt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-serif text-[32px] leading-[1.05] text-ink md:text-[40px]">
            Your <em className="italic text-accent">courses.</em>
          </h2>
          {hasCourses ? (
            <Link
              href="/courses/new"
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
            >
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" /> New course
            </Link>
          ) : null}
        </div>

        {hasCourses ? (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coursesList.map((c) => (
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
        ) : (
          <FullWidthCourseInvite />
        )}
      </Reveal>

      <Reveal as="section" className="mt-16 md:mt-20">
        <h2 className="font-serif text-[32px] leading-[1.05] text-ink md:text-[40px]">
          On the <em className="italic text-accent">horizon.</em>
        </h2>

        {horizon.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-hairline bg-white p-6 text-[14px] text-muted dark:bg-[#141414]">
            Nothing on the horizon. Enjoy it while it lasts.
          </p>
        ) : (
          <div className="-mx-6 mt-6 overflow-x-auto px-6 md:mx-0 md:overflow-visible md:px-0">
            <ul className="flex snap-x snap-mandatory gap-3 pb-2 md:flex-wrap md:snap-none md:pb-0">
              {horizon.map((t) => (
                <li
                  key={t.id}
                  className="snap-start shrink-0 basis-[240px] md:basis-[220px]"
                >
                  <HorizonPill task={t} now={now} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Reveal>

      <Reveal as="section" className="mt-16 md:mt-20">
        <h2 className="font-serif text-[24px] leading-[1.1] text-ink md:text-[28px]">
          <em className="italic text-accent">Recently.</em>
        </h2>

        {activity.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-muted">
            Nothing yet. Everything you do here will show up.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white dark:bg-[#141414]">
            {activity.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-muted">
                  <e.Icon size={13} strokeWidth={2} aria-hidden="true" />
                </span>
                <p className="min-w-0 flex-1 truncate text-[13.5px] leading-[1.5] text-ink">
                  {e.text}
                </p>
                <span className="shrink-0 text-[11.5px] text-muted">
                  {e.relative}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </div>
  );
}

// ---------- Greeting block ----------

function GreetingBlock({
  greeting,
  firstName,
  subtitle,
  hasCourses,
  newestCourseId,
  totals,
}: {
  greeting: Greeting;
  firstName: string;
  subtitle: string;
  hasCourses: boolean;
  newestCourseId?: string;
  totals: { totalTasks: number; completedTasks: number };
}) {
  return (
    <Reveal as="section">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
        <div className="max-w-3xl">
          <h1 className="font-serif text-[44px] leading-[1.02] tracking-[-0.01em] text-ink md:text-[68px] lg:text-[80px]">
            {greeting.prefix}
            <em className="italic text-accent">{greeting.italic}</em>
            {greeting.suffix}
            {greeting.noName ? null : (
              <>
                , <span>{firstName}</span>.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-[560px] text-[15.5px] leading-[1.55] text-muted md:text-[17px]">
            {subtitle}
          </p>
          {hasCourses && totals.totalTasks > 0 ? (
            <p className="mt-3 text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted">
              {totals.completedTasks} of {totals.totalTasks} tasks done
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
          >
            <Plus size={13} strokeWidth={2.5} aria-hidden="true" /> Course
          </Link>
          {hasCourses && newestCourseId ? (
            <Link
              href={`/courses/${newestCourseId}#tasks`}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
            >
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" /> Task
            </Link>
          ) : (
            <DisabledActionButton title="Add a course first">
              <Plus size={13} strokeWidth={2.5} aria-hidden="true" /> Task
            </DisabledActionButton>
          )}
          {hasCourses && newestCourseId ? (
            <Link
              href={`/courses/${newestCourseId}#materials`}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
            >
              <Upload size={13} strokeWidth={2} aria-hidden="true" /> Upload
            </Link>
          ) : (
            <DisabledActionButton title="Add a course first">
              <Upload size={13} strokeWidth={2} aria-hidden="true" /> Upload
            </DisabledActionButton>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function DisabledActionButton({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled
      title={title}
      aria-disabled="true"
      className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-hairline bg-paper px-3.5 py-2 text-[13px] font-medium text-muted opacity-60 dark:bg-[#0f0f10]"
    >
      {children}
    </button>
  );
}

// ---------- Focus row cards ----------

const cardShell =
  "group relative flex h-full min-h-[220px] flex-col rounded-2xl border border-hairline bg-white p-6 transition-all duration-200 hover:border-ink/25 hover:shadow-[inset_0_-2px_0_0_rgb(59_76_255_/_0.18)] dark:bg-[#141414] dark:hover:border-white/25 dark:hover:shadow-[inset_0_-2px_0_0_rgb(90_107_255_/_0.22)]";

const eyebrow =
  "text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted";

function ThisWeekCard({
  windows,
  upcoming,
  now,
}: {
  windows: TaskWindows;
  upcoming: UserTaskRow[];
  now: Date;
}) {
  const nextThree = upcoming.slice(0, 3);
  return (
    <div className={cardShell}>
      <div className="flex items-center gap-2">
        <Calendar
          size={13}
          strokeWidth={2}
          className="text-accent"
          aria-hidden="true"
        />
        <p className={eyebrow}>This week</p>
      </div>
      <p className="mt-4 font-serif text-[56px] leading-[0.95] text-ink">
        {windows.thisWeek}
      </p>
      <p className="mt-1 text-[13px] text-muted">tasks due in next 7 days</p>
      <div className="mt-auto pt-5">
        {nextThree.length === 0 ? (
          <p className="text-[12.5px] text-muted italic">Nothing due.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {nextThree.map((t) => (
              <li
                key={t.id}
                className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-hairline bg-paper px-2.5 py-1 text-[11.5px] dark:bg-[#0f0f10]"
              >
                <span className="max-w-[110px] truncate text-ink">
                  {t.title}
                </span>
                <span className="text-muted/70" aria-hidden="true">
                  ·
                </span>
                <span className="shrink-0 text-muted">
                  {formatDueShort(t.dueDate as Date, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StudyFocusCard({
  nextTask,
  now,
}: {
  nextTask: UserTaskRow | null;
  now: Date;
}) {
  return (
    <div className={cardShell}>
      <div className="flex items-center gap-2">
        <Target
          size={13}
          strokeWidth={2}
          className="text-accent"
          aria-hidden="true"
        />
        <p className={eyebrow}>Study focus</p>
      </div>
      {nextTask ? (
        <>
          <p className="mt-4 line-clamp-2 font-serif text-[24px] leading-[1.15] text-ink md:text-[26px]">
            {nextTask.title}
          </p>
          <p className="mt-1.5 truncate text-[12.5px] text-muted">
            {nextTask.courseName}
          </p>
          <div className="mt-3">
            <UrgencyPill
              due={nextTask.dueDate as Date}
              isCompleted={false}
              now={now}
            />
          </div>
          <p className="mt-auto pt-5 text-[12.5px] italic text-muted">
            Your next move.
          </p>
        </>
      ) : (
        <>
          <p className="mt-4 font-serif text-[24px] leading-[1.15] text-ink md:text-[26px]">
            Clear runway.
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            No pending deadlines.
          </p>
          <p className="mt-auto pt-5 text-[12.5px] italic text-muted">
            You&apos;re clear. Pick something to get ahead.
          </p>
        </>
      )}
    </div>
  );
}

function SemesterPulseCard({
  semester,
  hasCourses,
  newestCourseId,
}: {
  semester: SemesterProgress;
  hasCourses: boolean;
  newestCourseId?: string;
}) {
  const pct = Math.round(semester.pct * 100);
  const showProgressBar = semester.state !== "unset";
  return (
    <div className={cardShell}>
      <div className="flex items-center gap-2">
        <Activity
          size={13}
          strokeWidth={2}
          className="text-accent"
          aria-hidden="true"
        />
        <p className={eyebrow}>Semester pulse</p>
      </div>
      <p className="mt-4 font-serif text-[30px] leading-[1.05] text-ink md:text-[34px]">
        {semester.weekLabel}
      </p>
      {showProgressBar ? (
        <div
          className="mt-5 h-1 w-full overflow-hidden rounded-full bg-hairline"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Semester progress"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      <p className="mt-auto pt-5 text-[12.5px] text-muted">{semester.note}</p>
      {semester.state === "unset" && hasCourses && newestCourseId ? (
        <Link
          href={`/courses/${newestCourseId}`}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Add semester dates <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}

function FullWidthCourseInvite() {
  return (
    <div className="mt-8 rounded-2xl border border-hairline bg-white p-10 text-center dark:bg-[#141414] md:p-16">
      <p className={eyebrow}>Get started</p>
      <h3 className="mt-3 font-serif text-[32px] leading-tight text-ink md:text-[40px]">
        Add your first <em className="italic text-accent">course.</em>
      </h3>
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
  );
}

// ---------- Horizon pill ----------

function UrgencyPill({
  due,
  isCompleted,
  now,
}: {
  due: Date;
  isCompleted: boolean;
  now: Date;
}) {
  const level = urgencyFor(due, isCompleted, now);
  const style =
    level === "overdue"
      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      : level === "day"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : level === "soon"
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-hairline bg-paper text-muted dark:bg-[#0f0f10]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${style}`}
    >
      {formatDueShort(due, now)}
    </span>
  );
}

function HorizonPill({ task, now }: { task: UserTaskRow; now: Date }) {
  const type = (task.taskType as TaskType) ?? "other";
  const Icon = typeIcon[type] ?? CheckSquare;
  const level = urgencyFor(task.dueDate, task.isCompleted, now);
  const border =
    level === "overdue"
      ? "border-red-500/30 hover:border-red-500/60"
      : level === "day"
        ? "border-amber-500/30 hover:border-amber-500/60"
        : level === "soon"
          ? "border-accent/40 hover:border-accent/70"
          : "border-hairline hover:border-ink/30";
  const dueStyle =
    level === "overdue"
      ? "text-red-600 dark:text-red-400"
      : level === "day"
        ? "text-amber-700 dark:text-amber-400"
        : level === "soon"
          ? "text-accent"
          : "text-muted";
  return (
    <Link
      href={`/courses/${task.courseId}`}
      className={`flex h-full flex-col justify-between rounded-2xl border ${border} bg-white p-4 transition-all duration-200 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:bg-[#141414]`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">
          {task.title}
        </p>
        <Icon
          size={13}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-muted"
          aria-hidden="true"
        />
      </div>
      <div className="mt-4">
        <p className="line-clamp-1 text-[11.5px] text-muted">
          {task.courseName}
        </p>
        <p className={`mt-1 text-[11.5px] font-medium ${dueStyle}`}>
          {formatDueShort(task.dueDate as Date, now)}
        </p>
      </div>
    </Link>
  );
}

// ---------- Focus card ----------

function FocusCard({
  secondsThisWeek,
  secondsLastWeek,
}: {
  secondsThisWeek: number;
  secondsLastWeek: number;
}) {
  const hoursThisWeek = secondsThisWeek / 3600;
  const delta = secondsThisWeek - secondsLastWeek;
  const trend =
    Math.abs(delta) < 5 * 60
      ? "flat"
      : delta > 0
        ? "up"
        : "down";
  const oneLiner =
    hoursThisWeek >= 8
      ? "Deep week."
      : hoursThisWeek >= 3
        ? "Steady rhythm."
        : hoursThisWeek > 0
          ? "Warming up."
          : "Time to build the habit.";
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;
  const trendClass =
    trend === "up"
      ? "text-accent"
      : trend === "down"
        ? "text-red-500/80 dark:text-red-400/80"
        : "text-muted";

  return (
    <Link
      href="/focus/stats"
      className={`${cardShell} block cursor-pointer`}
    >
      <div className="flex items-center gap-2">
        <Timer
          size={13}
          strokeWidth={2}
          className="text-accent"
          aria-hidden="true"
        />
        <p className={eyebrow}>Focus</p>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <p className="font-serif text-[56px] leading-[0.95] text-ink">
          {formatFocus(secondsThisWeek)}
        </p>
        <span
          className={`inline-flex items-center gap-0.5 text-[12.5px] font-medium ${trendClass}`}
        >
          <TrendIcon size={13} strokeWidth={2} aria-hidden="true" />
          {formatDelta(delta)}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-muted">focused this week</p>
      <p className="mt-auto pt-5 text-[12.5px] italic text-muted">
        {oneLiner}
      </p>
    </Link>
  );
}

function formatFocus(sec: number): string {
  if (sec <= 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDelta(sec: number): string {
  const abs = Math.abs(sec);
  if (abs < 60) return "flat";
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const sign = sec > 0 ? "+" : "−";
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
}

// Sum the seconds of focus in the 7-day window ending N days before `now`.
// (dayShift=0 → this week; dayShift=7 → the previous week.)
function sumFocusSince(
  sessions: Array<{ startedAt: Date; totalWorkSeconds: number }>,
  now: Date,
  dayShift: number,
): number {
  const end = new Date(now);
  end.setDate(now.getDate() - dayShift);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return sessions
    .filter((s) => s.startedAt >= start && s.startedAt <= end)
    .reduce((acc, s) => acc + s.totalWorkSeconds, 0);
}

// ---------- Recent activity feed ----------

type ActivityEvent = {
  id: string;
  Icon: LucideIcon;
  text: ReactNode;
  relative: string;
};

function buildActivity(
  tasks: UserTaskRow[],
  materials: UserMaterialRow[],
  now: Date,
): ActivityEvent[] {
  type Raw =
    | { id: string; when: Date; kind: "add"; task: UserTaskRow }
    | { id: string; when: Date; kind: "complete"; task: UserTaskRow }
    | { id: string; when: Date; kind: "upload"; material: UserMaterialRow };

  const raw: Raw[] = [];
  for (const t of tasks) {
    raw.push({ id: `t-add-${t.id}`, when: t.createdAt, kind: "add", task: t });
    if (t.isCompleted) {
      raw.push({
        id: `t-done-${t.id}`,
        when: t.updatedAt,
        kind: "complete",
        task: t,
      });
    }
  }
  for (const m of materials) {
    raw.push({
      id: `m-${m.id}`,
      when: m.uploadedAt,
      kind: "upload",
      material: m,
    });
  }
  raw.sort((a, b) => b.when.getTime() - a.when.getTime());

  return raw.slice(0, 5).map((e) => {
    if (e.kind === "add") {
      return {
        id: e.id,
        Icon: Plus,
        relative: relativeShort(e.when, now),
        text: (
          <>
            <span className="text-muted">Added </span>
            <span className="font-medium">{e.task.title}</span>
            <span className="text-muted"> to </span>
            <span>{e.task.courseName}</span>
          </>
        ),
      };
    }
    if (e.kind === "complete") {
      return {
        id: e.id,
        Icon: Check,
        relative: relativeShort(e.when, now),
        text: (
          <>
            <span className="text-muted">Completed </span>
            <span className="font-medium">{e.task.title}</span>
          </>
        ),
      };
    }
    return {
      id: e.id,
      Icon: Upload,
      relative: relativeShort(e.when, now),
      text: (
        <>
          <span className="text-muted">Uploaded </span>
          <span className="font-medium">{e.material.name}</span>
          <span className="text-muted"> to </span>
          <span>{e.material.courseName}</span>
        </>
      ),
    };
  });
}
