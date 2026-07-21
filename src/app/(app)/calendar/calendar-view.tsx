"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FileText,
  GraduationCap,
  type LucideIcon,
  Pencil,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { softDeleteTask, toggleTaskCompletion } from "@/actions/tasks";
import { Reveal } from "@/components/reveal";
import { type TaskType } from "@/lib/task-types";

export type CalendarTask = {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  taskType: string;
  isCompleted: boolean;
  dueDate: string;
};

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

const typePill: Record<TaskType, string> = {
  pset: "bg-accent/10 text-accent border-accent/25",
  assignment: "bg-accent/10 text-accent border-accent/25",
  exam: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
  quiz: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
  paper: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  project: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  presentation: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  reading: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  other: "bg-hairline text-muted border-hairline",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthName = MONTHS[cursor.getMonth()]!;
  const year = cursor.getFullYear();

  // Bucket tasks by YYYY-MM-DD in local time.
  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const t of tasks) {
      const d = new Date(t.dueDate);
      const key = dayKey(d);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
    }
    return map;
  }, [tasks]);

  const monthTaskCount = useMemo(() => {
    let count = 0;
    for (const t of tasks) {
      const d = new Date(t.dueDate);
      if (d.getFullYear() === year && d.getMonth() === cursor.getMonth()) {
        count += 1;
      }
    }
    return count;
  }, [tasks, cursor, year]);

  const gridDays = useMemo(() => {
    if (view === "month") return buildMonthGrid(cursor);
    return buildWeekGrid(cursor);
  }, [cursor, view]);

  const selectedTasks = selectedDay
    ? tasksByDay.get(dayKey(selectedDay)) ?? []
    : [];

  const goPrev = () => {
    setCursor((c) =>
      view === "month"
        ? new Date(c.getFullYear(), c.getMonth() - 1, 1)
        : addDays(c, -7),
    );
  };
  const goNext = () => {
    setCursor((c) =>
      view === "month"
        ? new Date(c.getFullYear(), c.getMonth() + 1, 1)
        : addDays(c, 7),
    );
  };
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      <Reveal as="section">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-serif text-[36px] leading-[1.05] text-ink md:text-[52px]">
              Your <em className="italic text-accent">{monthName.toLowerCase()}.</em>
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.55] text-muted md:text-[17px]">
              Every deadline for {monthName} {year}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="mt-10 md:mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
            >
              <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
            >
              <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="ml-1 rounded-md border border-hairline px-3 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:border-white/25"
            >
              Today
            </button>
          </div>
          <p className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-muted">
            {monthTaskCount === 0
              ? "0 deadlines"
              : `${monthTaskCount} deadline${monthTaskCount === 1 ? "" : "s"} this month`}
          </p>
        </div>

        {monthTaskCount === 0 ? (
          <p className="mt-6 rounded-2xl border border-hairline bg-white p-6 text-center text-[14px] italic text-muted dark:bg-[#141414]">
            Nothing scheduled for {monthName}. Nice and open.
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-white dark:bg-[#141414]">
          <div className="grid grid-cols-7 border-b border-hairline bg-paper dark:bg-[#0f0f10]">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gridDays.map((day) => {
              const inMonth =
                view === "week" || day.getMonth() === cursor.getMonth();
              const isToday = day.getTime() === today.getTime();
              const dayTasks = tasksByDay.get(dayKey(day)) ?? [];
              return (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  inMonth={inMonth}
                  isToday={isToday}
                  tasks={dayTasks}
                  onOpen={() => setSelectedDay(day)}
                />
              );
            })}
          </div>
        </div>
      </Reveal>

      {selectedDay ? (
        <DayDrawer
          day={selectedDay}
          tasks={selectedTasks}
          onClose={() => setSelectedDay(null)}
        />
      ) : null}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "month" | "week";
  onChange: (v: "month" | "week") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-hairline bg-white p-0.5 dark:bg-[#141414]">
      {(["month", "week"] as const).map((v) => {
        const active = view === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-[12px] font-medium capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active
                ? "bg-accent text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  isToday,
  tasks,
  onOpen,
}: {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  tasks: CalendarTask[];
  onOpen: () => void;
}) {
  const shown = tasks.slice(0, 2);
  const more = Math.max(0, tasks.length - shown.length);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex min-h-[92px] flex-col items-start gap-1 border-b border-r border-hairline p-2 text-left transition-colors last-in-row:border-r-0 hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:min-h-[108px] dark:hover:bg-[#0f0f10] ${
        inMonth ? "" : "opacity-40"
      } ${isToday ? "ring-2 ring-inset ring-accent/70" : ""}`}
    >
      <span
        className={`text-[11.5px] font-medium ${
          isToday ? "text-accent" : "text-ink"
        }`}
      >
        {day.getDate()}
      </span>
      <div className="flex w-full flex-col gap-1">
        {shown.map((t) => {
          const type = (t.taskType as TaskType) ?? "other";
          const Icon = typeIcon[type] ?? CheckSquare;
          return (
            <span
              key={t.id}
              className={`inline-flex w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium ${typePill[type]} ${t.isCompleted ? "opacity-50 line-through decoration-current" : ""}`}
            >
              <Icon
                size={9}
                strokeWidth={2}
                aria-hidden="true"
                className="shrink-0"
              />
              <span className="min-w-0 truncate">{t.title}</span>
            </span>
          );
        })}
        {more > 0 ? (
          <span className="text-[10.5px] font-medium text-muted">
            +{more} more
          </span>
        ) : null}
      </div>
    </button>
  );
}

function DayDrawer({
  day,
  tasks,
  onClose,
}: {
  day: Date;
  tasks: CalendarTask[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-hairline bg-white shadow-2xl dark:bg-[#141414]">
        <div className="flex items-start justify-between border-b border-hairline p-6">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              {MONTHS[day.getMonth()]} {day.getDate()}
            </p>
            <h2 className="mt-1 font-serif text-[26px] leading-tight text-ink">
              {tasks.length === 0
                ? "Open day."
                : `${tasks.length} due.`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-muted hover:bg-ink/[0.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {tasks.length === 0 ? (
            <p className="p-6 text-center text-[14px] italic text-muted">
              Nothing scheduled. Enjoy the space.
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {tasks.map((t) => (
                <DrawerTaskRow key={t.id} task={t} onDeleted={onClose} />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function DrawerTaskRow({
  task,
  onDeleted,
}: {
  task: CalendarTask;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const type = (task.taskType as TaskType) ?? "other";
  const Icon = typeIcon[type] ?? CheckSquare;

  function onToggle() {
    startTransition(async () => {
      await toggleTaskCompletion({ taskId: task.id });
      router.refresh();
    });
  }
  function onDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    startTransition(async () => {
      const r = await softDeleteTask({ taskId: task.id });
      if ("success" in r && r.success) {
        router.refresh();
        onDeleted();
      }
    });
  }

  return (
    <li className="flex items-start gap-3 p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={task.isCompleted}
        aria-label={task.isCompleted ? "Mark as not done" : "Mark as done"}
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          task.isCompleted
            ? "border-accent bg-accent text-white"
            : "border-hairline hover:border-accent/60"
        } ${pending ? "opacity-60" : ""}`}
      >
        {task.isCompleted ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[14px] font-medium ${task.isCompleted ? "text-muted line-through decoration-hairline" : "text-ink"}`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          <Link
            href={`/courses/${task.courseId}`}
            className="hover:text-ink hover:underline"
          >
            {task.courseName}
          </Link>{" "}
          · {new Date(task.dueDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
        <span
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${typePill[type]}`}
        >
          <Icon size={9} strokeWidth={2} aria-hidden="true" />
          {type}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/courses/${task.courseId}#tasks`}
          aria-label="Edit"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
        >
          <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label="Delete"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-red-500/10 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
        >
          <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

// ---- helpers ----

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildMonthGrid(cursor: Date): Date[] {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - firstOfMonth.getDay());
  const grid: Date[] = [];
  for (let i = 0; i < 42; i++) {
    grid.push(addDays(start, i));
    if (i >= 34) {
      const d = addDays(start, i);
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      if (d >= nextMonth && i >= 34 && grid.length % 7 === 0) break;
    }
  }
  return grid.slice(0, needsSixRows(cursor) ? 42 : 35);
}

function needsSixRows(cursor: Date): boolean {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  return firstOfMonth.getDay() + daysInMonth > 35;
}

function buildWeekGrid(cursor: Date): Date[] {
  const start = new Date(cursor);
  start.setDate(cursor.getDate() - cursor.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
