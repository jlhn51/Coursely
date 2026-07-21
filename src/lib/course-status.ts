import type { Task } from "@/db/schema";

// Shared course-status computation. The dashboard card, the course-detail
// eyebrow, and any future surface must agree — so all of them go through
// this one function. Split off from lib/dashboard.ts on purpose: dashboard.ts
// pulls in greeting/subtitle/formatters that course-scoped code doesn't need.

export type CourseStatusLevel = "clear" | "attention" | "overdue";

export type CourseStatus = {
  level: CourseStatusLevel;
  overdueCount: number;
  dueThisWeekCount: number;
};

type StatusInput = Pick<Task, "dueDate" | "isCompleted">;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function computeCourseStatus(
  tasks: StatusInput[],
  now: Date = new Date(),
): CourseStatus {
  const t0 = startOfDay(now);
  const t7 = addDays(t0, 7);
  let overdueCount = 0;
  let dueThisWeekCount = 0;
  for (const t of tasks) {
    if (t.isCompleted || !t.dueDate) continue;
    if (t.dueDate < t0) overdueCount += 1;
    else if (t.dueDate < t7) dueThisWeekCount += 1;
  }
  const level: CourseStatusLevel =
    overdueCount > 0
      ? "overdue"
      : dueThisWeekCount > 0
        ? "attention"
        : "clear";
  return { level, overdueCount, dueThisWeekCount };
}

// UI helpers that keep colors/copy in one place so cards, dots, and banners
// stay consistent without duplicating switch statements.
export function statusDotColor(level: CourseStatusLevel): string {
  return level === "overdue"
    ? "bg-red-500"
    : level === "attention"
      ? "bg-amber-500"
      : "bg-emerald-500";
}

export function statusShortText(status: CourseStatus): string {
  if (status.level === "overdue") {
    return `${status.overdueCount} overdue`;
  }
  if (status.level === "attention") {
    return `${status.dueThisWeekCount} due this week`;
  }
  return "All clear";
}
