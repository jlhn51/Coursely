import type { Task } from "@/db/schema";

// Re-exported so existing dashboard imports don't need to change paths when
// the shared helper moved to its own module.
export {
  computeCourseStatus,
  statusDotColor,
  statusShortText,
  type CourseStatus,
  type CourseStatusLevel,
} from "@/lib/course-status";

// ---------- shared date helpers ----------

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

// ---------- task-window aggregates ----------

export type TaskWindows = {
  today: number;
  thisWeek: number;
  overdue: number;
  exams14d: number;
};

type WindowInput = Pick<Task, "dueDate" | "isCompleted" | "taskType">;

export function taskWindows(tasks: WindowInput[], now: Date): TaskWindows {
  const t0 = startOfDay(now);
  const t1 = addDays(t0, 1);
  const t7 = addDays(t0, 7);
  const t14 = addDays(t0, 14);

  let today = 0;
  let thisWeek = 0;
  let overdue = 0;
  let exams14d = 0;

  for (const t of tasks) {
    if (t.isCompleted || !t.dueDate) continue;
    const d = t.dueDate;
    if (d < t0) overdue += 1;
    else if (d < t1) today += 1;
    if (d >= t0 && d < t7) thisWeek += 1;
    if (t.taskType === "exam" && d >= t0 && d < t14) exams14d += 1;
  }

  return { today, thisWeek, overdue, exams14d };
}

// ---------- greeting ----------

export type Greeting = {
  prefix: string;
  italic: string;
  suffix: string;
  // When true, the phrase already contains the trailing period and no
  // ", firstName." is appended.
  noName?: boolean;
};

export function pickGreeting(input: {
  hasCourses: boolean;
  totalTasks: number;
  windows: TaskWindows;
  now: Date;
}): Greeting {
  const { hasCourses, totalTasks, windows, now } = input;

  if (!hasCourses) {
    return {
      prefix: "Let's set up your ",
      italic: "semester",
      suffix: ".",
      noName: true,
    };
  }
  if (totalTasks === 0) {
    return { prefix: "", italic: "Quiet", suffix: " week" };
  }

  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  if (hour >= 22 || hour < 5) {
    return { prefix: "Up ", italic: "late", suffix: "" };
  }
  if (hour < 9) {
    return { prefix: "Fresh ", italic: "morning", suffix: "" };
  }
  if (hour < 17) {
    if (!isWeekend) {
      if (windows.today > 0) {
        return { prefix: "", italic: "Big", suffix: " day" };
      }
      return { prefix: "", italic: "Focus", suffix: " time" };
    }
    return { prefix: "", italic: "Weekend", suffix: " push" };
  }
  // hour 17–22
  if (windows.exams14d > 0 && windows.thisWeek > 0) {
    return { prefix: "", italic: "Exam", suffix: " week" };
  }
  return { prefix: "", italic: "Evening", suffix: " block" };
}

// ---------- subtitle ----------

export function pickSubtitle(input: {
  hasCourses: boolean;
  windows: TaskWindows;
}): string {
  const { hasCourses, windows } = input;

  if (!hasCourses) {
    return "Add a course to get started. Your semester will build itself.";
  }
  if (windows.overdue > 0) {
    return `${windows.overdue} overdue. ${windows.thisWeek} due this week.`;
  }
  if (windows.today > 0) {
    const remaining = Math.max(0, windows.thisWeek - windows.today);
    return `${windows.today} due today. ${remaining} more this week.`;
  }
  if (windows.thisWeek > 0 && windows.exams14d > 0) {
    const exams = windows.exams14d === 1 ? "exam" : "exams";
    return `${windows.thisWeek} tasks this week. ${windows.exams14d} ${exams} coming.`;
  }
  if (windows.thisWeek > 0) {
    return `${windows.thisWeek} tasks this week. Steady pace.`;
  }
  return "All clear this week. Get ahead of what's next.";
}

// ---------- semester progress ----------

// State machine for the SEMESTER PULSE card. `unset` means no course has
// startDate + endDate populated yet; the UI shows a nudge to add dates.
// `before`/`during`/`after` all supply real numbers when we have them.
export type SemesterProgress =
  | { state: "unset"; weekLabel: string; pct: 0; note: string }
  | {
      state: "before";
      weekLabel: string;
      pct: 0;
      note: string;
      startDate: Date;
    }
  | {
      state: "during";
      weekLabel: string;
      pct: number;
      note: string;
      currentWeek: number;
      totalWeeks: number;
    }
  | {
      state: "after";
      weekLabel: string;
      pct: 1;
      note: string;
      endDate: Date;
    };

type SemesterRange = { start: Date; end: Date };

// Pick the semester envelope across courses. We collect every course with
// both dates set and prefer one that is currently active (today ∈ [start,end]).
// Falls back to the nearest upcoming, then the most recently ended.
function pickSemesterRange(
  courseDates: { startDate: Date | null; endDate: Date | null }[],
  now: Date,
): SemesterRange | null {
  const ranges = courseDates
    .filter(
      (c): c is { startDate: Date; endDate: Date } =>
        !!c.startDate && !!c.endDate && c.endDate >= c.startDate,
    )
    .map((c) => ({ start: c.startDate, end: c.endDate }));
  if (ranges.length === 0) return null;

  const today = startOfDay(now);
  const active = ranges.filter((r) => r.start <= today && today <= r.end);
  if (active.length > 0) {
    // Widen to the union of concurrent semesters so the pulse still tracks
    // the whole term when a student has two overlapping courses.
    const start = new Date(
      Math.min(...active.map((r) => startOfDay(r.start).getTime())),
    );
    const end = new Date(
      Math.max(...active.map((r) => startOfDay(r.end).getTime())),
    );
    return { start, end };
  }

  const upcoming = ranges
    .filter((r) => r.start > today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (upcoming) return upcoming;

  const past = ranges
    .filter((r) => r.end < today)
    .sort((a, b) => b.end.getTime() - a.end.getTime())[0];
  return past ?? null;
}

function formatSemesterDate(d: Date, now: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function semesterProgress(
  courseDates: { startDate: Date | null; endDate: Date | null }[],
  now: Date,
): SemesterProgress {
  const range = pickSemesterRange(courseDates, now);
  if (!range) {
    return {
      state: "unset",
      weekLabel: "No dates",
      pct: 0,
      note: "Add semester dates to your courses to track weekly progress.",
    };
  }

  const today = startOfDay(now);
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);

  if (today < start) {
    return {
      state: "before",
      weekLabel: `Starting ${formatSemesterDate(start, now)}`,
      pct: 0,
      note: "The clock hasn't started yet. Get set up.",
      startDate: start,
    };
  }

  if (today > end) {
    return {
      state: "after",
      weekLabel: "Semester over",
      pct: 1,
      note: `Ended ${formatSemesterDate(end, now)}. Nice work.`,
      endDate: end,
    };
  }

  const dayMs = 1000 * 60 * 60 * 24;
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  const totalWeeks = Math.max(1, Math.ceil(spanDays / 7));
  const daysIn = Math.max(
    0,
    Math.floor((today.getTime() - start.getTime()) / dayMs),
  );
  const currentWeek = Math.min(totalWeeks, Math.floor(daysIn / 7) + 1);
  const pct = Math.min(1, Math.max(0, (daysIn + 1) / spanDays));
  const note =
    currentWeek <= Math.ceil(totalWeeks / 3)
      ? "Early days. Set the pace."
      : currentWeek <= Math.ceil((2 * totalWeeks) / 3)
        ? "Halfway through. Momentum matters."
        : "Home stretch. Finish strong.";
  return {
    state: "during",
    weekLabel: `Week ${currentWeek} of ${totalWeeks}`,
    pct,
    note,
    currentWeek,
    totalWeeks,
  };
}

// ---------- urgency ----------

export type Urgency = "overdue" | "day" | "soon" | "later" | "none";

export function urgencyFor(
  due: Date | null,
  isCompleted: boolean,
  now: Date,
): Urgency {
  if (!due || isCompleted) return "none";
  const t0 = startOfDay(now);
  const t3 = addDays(t0, 3);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (due < t0) return "overdue";
  if (due < in24h) return "day";
  if (due < t3) return "soon";
  return "later";
}

// ---------- formatters ----------

export function formatDueShort(due: Date, now: Date): string {
  const t0 = startOfDay(now);
  const d0 = startOfDay(due);
  const diffDays = Math.round(
    (d0.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays}d`;
  if (diffDays < -1 && diffDays >= -7) return `${-diffDays}d ago`;
  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: due.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function relativeShort(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "just now";
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
