"use client";

import {
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  Filter,
  GraduationCap,
  type LucideIcon,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { softDeleteTask, updateTask } from "@/actions/tasks";
import { NewTaskModal } from "@/components/app-shell/new-task-modal";
import type { CourseOption } from "@/components/course-picker";
import { Reveal } from "@/components/reveal";
import { TaskDrawer, type TaskDrawerTask } from "@/components/task-drawer";
import { TASK_TYPES, type TaskType } from "@/lib/task-types";

export type GlobalTaskRow = {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseName: string;
  taskType: string;
  isCompleted: boolean;
  source: string;
  sourceMaterialName: string | null;
  dueDate: string | null;
  createdAt: string;
};

type StatusFilter = "all" | "today" | "week" | "overdue" | "done";
type SortKey = "due-asc" | "due-desc" | "created-desc" | "course";

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
];

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "due-asc", label: "Due date (soonest)" },
  { value: "due-desc", label: "Due date (latest)" },
  { value: "created-desc", label: "Newest added" },
  { value: "course", label: "Course" },
];

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

const typeLabel: Record<TaskType, string> = {
  pset: "Problem set",
  assignment: "Assignment",
  exam: "Exam",
  quiz: "Quiz",
  paper: "Paper",
  project: "Project",
  presentation: "Presentation",
  reading: "Reading",
  other: "Other",
};

export function TasksView({
  tasks,
  courses,
}: {
  tasks: GlobalTaskRow[];
  courses: CourseOption[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("due-asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<GlobalTaskRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GlobalTaskRow | null>(null);

  const openDrawer = useCallback((task: GlobalTaskRow) => {
    setDrawerTask(task);
  }, []);

  const now = useMemo(() => new Date(), []);
  const t0 = startOfDay(now);
  const t1 = addDays(t0, 1);
  const t7 = addDays(t0, 7);

  const filtered = useMemo(() => {
    let list = tasks.slice();
    if (status !== "all") {
      list = list.filter((t) => {
        if (status === "done") return t.isCompleted;
        if (t.isCompleted) return false;
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (status === "today") return d >= t0 && d < t1;
        if (status === "week") return d >= t0 && d < t7;
        return d < t0; // overdue
      });
    }
    if (courseFilter.size > 0) {
      list = list.filter((t) => courseFilter.has(t.courseId));
    }
    if (typeFilter.size > 0) {
      list = list.filter((t) => typeFilter.has(t.taskType));
    }

    list.sort((a, b) => {
      if (sort === "created-desc") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sort === "course") {
        return a.courseName.localeCompare(b.courseName);
      }
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : null;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : null;
      if (ad == null && bd == null) return 0;
      if (ad == null) return 1;
      if (bd == null) return -1;
      return sort === "due-asc" ? ad - bd : bd - ad;
    });
    return list;
  }, [tasks, status, courseFilter, typeFilter, sort, t0, t1, t7]);

  const drawerTaskData: TaskDrawerTask | null = drawerTask
    ? {
        id: drawerTask.id,
        title: drawerTask.title,
        description: drawerTask.description,
        courseId: drawerTask.courseId,
        courseName: drawerTask.courseName,
        taskType: drawerTask.taskType,
        isCompleted: drawerTask.isCompleted,
        dueDate: drawerTask.dueDate,
        source: drawerTask.source,
        createdAt: drawerTask.createdAt,
        sourceMaterialName: drawerTask.sourceMaterialName,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      <Reveal as="section">
        <h1 className="font-serif text-[36px] leading-[1.05] text-ink md:text-[52px]">
          Every <em className="italic text-accent">task.</em>
        </h1>
        <p className="mt-3 max-w-xl text-[15.5px] leading-[1.55] text-muted md:text-[17px]">
          Across every course.
        </p>
      </Reveal>

      <Reveal as="section" className="mt-10 md:mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((opt) => {
              const active = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  aria-pressed={active}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-hairline bg-white text-muted hover:text-ink dark:bg-[#141414]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            <MultiSelectDropdown
              icon={Filter}
              label="Course"
              options={courses.map((c) => ({ value: c.id, label: c.name }))}
              selected={courseFilter}
              onChange={setCourseFilter}
            />
            <MultiSelectDropdown
              icon={Filter}
              label="Type"
              options={TASK_TYPES.map((t) => ({ value: t, label: typeLabel[t] }))}
              selected={typeFilter}
              onChange={setTypeFilter}
            />

            <SortDropdown value={sort} onChange={setSort} />
          </div>

          <button
            type="button"
            disabled={courses.length === 0}
            onClick={() => setModalOpen(true)}
            title={courses.length === 0 ? "Add a course first." : undefined}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#141414] dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
          >
            <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
            Add task
          </button>
        </div>

        <div className="mt-6">
          {filtered.length === 0 ? (
            <EmptyState filter={status} />
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white dark:bg-[#141414]">
              {filtered.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  now={now}
                  onOpen={openDrawer}
                  onRequestDelete={setPendingDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      <NewTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courses={courses}
      />
      <TaskDrawer
        task={drawerTaskData}
        onClose={() => setDrawerTask(null)}
      />
      <ConfirmDelete
        task={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function TaskRow({
  task,
  now,
  onOpen,
  onRequestDelete,
}: {
  task: GlobalTaskRow;
  now: Date;
  onOpen: (task: GlobalTaskRow) => void;
  onRequestDelete: (task: GlobalTaskRow) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic mirror of the persisted state.
  const [optimisticCompleted, setOptimisticCompleted] = useState(
    task.isCompleted,
  );
  const type = (task.taskType as TaskType) ?? "other";
  const Icon = typeIcon[type] ?? CheckSquare;
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const level = urgency(due, optimisticCompleted, now);

  const dueStyle =
    level === "overdue"
      ? "text-red-600 dark:text-red-400 font-medium"
      : level === "soon"
        ? "text-accent font-medium"
        : "text-muted";

  function onToggle() {
    const next = !optimisticCompleted;
    setOptimisticCompleted(next);
    startTransition(async () => {
      const r = await updateTask({
        taskId: task.id,
        title: task.title,
        description: task.description ?? undefined,
        taskType: type,
        dueDate: due ? due.toISOString() : "",
        isCompleted: next,
      });
      if ("error" in r && r.error) {
        setOptimisticCompleted(!next);
        toast.error("Couldn't update", { description: r.error });
        return;
      }
      router.refresh();
    });
  }

  function handleRowClick(e: React.MouseEvent<HTMLLIElement>) {
    // Ignore clicks that came from an inner button/link/input.
    const el = e.target as HTMLElement;
    if (el.closest("button, a, input, label, select, textarea")) return;
    onOpen(task);
  }

  function handleRowKey(e: React.KeyboardEvent<HTMLLIElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onOpen(task);
    } else if (e.key === " ") {
      e.preventDefault();
      onToggle();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRequestDelete(task);
    }
  }

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKey}
      aria-label={`Open ${task.title}`}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent dark:hover:bg-[#0f0f10]"
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={optimisticCompleted}
        aria-label={optimisticCompleted ? "Mark as not done" : "Mark as done"}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          optimisticCompleted
            ? "border-accent bg-accent text-white"
            : "border-hairline hover:border-accent/60"
        } ${pending ? "opacity-60" : ""}`}
      >
        {optimisticCompleted ? (
          <Check size={12} strokeWidth={2.5} aria-hidden="true" />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p
            className={`text-[14px] font-medium ${
              optimisticCompleted
                ? "text-muted line-through decoration-hairline"
                : "text-ink"
            }`}
          >
            {task.title}
          </p>
          <Link
            href={`/courses/${task.courseId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11.5px] text-muted hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {task.courseName}
          </Link>
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted sm:inline-flex">
        <Icon size={10} strokeWidth={2} aria-hidden="true" />
        {typeLabel[type]}
      </span>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
          level === "overdue"
            ? "border-red-500/30 bg-red-500/10"
            : level === "soon"
              ? "border-accent/25 bg-accent/10"
              : "border-hairline"
        } ${dueStyle}`}
      >
        {due ? formatDueShort(due, now) : "No date"}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onOpen(task)}
          aria-label="Edit"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
        >
          <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(task)}
          aria-label="Delete"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-red-500/10 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
        >
          <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function ConfirmDelete({
  task,
  onClose,
}: {
  task: GlobalTaskRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!task) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-hairline bg-white p-6 shadow-2xl dark:bg-[#141414]">
        <h3 className="font-serif text-[20px] leading-tight text-ink">
          Delete this task?
        </h3>
        <p className="mt-2 text-[13.5px] text-muted">
          &ldquo;{task.title}&rdquo; will be removed from your task list.
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await softDeleteTask({ taskId: task.id });
                if ("error" in r && r.error) {
                  toast.error("Couldn't delete", { description: r.error });
                  return;
                }
                toast.success("Task deleted");
                router.refresh();
                onClose();
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: StatusFilter }) {
  const copy =
    filter === "overdue"
      ? "No overdue tasks. Well done."
      : filter === "today"
        ? "No tasks today. Enjoy it."
        : filter === "week"
          ? "Nothing due this week. Get ahead."
          : filter === "done"
            ? "Nothing done yet."
            : "No tasks yet. Add one to get started.";
  return (
    <div className="rounded-2xl border border-hairline bg-white p-10 text-center dark:bg-[#141414]">
      <p className="font-serif text-[22px] text-ink">{copy}</p>
    </div>
  );
}

function MultiSelectDropdown({
  icon: Icon,
  label,
  options,
  selected,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.size;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          count > 0
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-hairline bg-white text-muted hover:text-ink dark:bg-[#141414]"
        }`}
      >
        <Icon size={11} strokeWidth={2} aria-hidden="true" />
        {label}
        {count > 0 ? <span className="text-[10.5px]">· {count}</span> : null}
        <ChevronDown size={11} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[220px] max-h-72 overflow-y-auto rounded-md border border-hairline bg-white p-1 shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.25)] dark:bg-[#141414]"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[12px] italic text-muted">
              Nothing to pick.
            </p>
          ) : (
            options.map((opt) => {
              const checked = selected.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-[13px] text-ink hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(opt.value);
                      else next.add(opt.value);
                      onChange(next);
                    }}
                    className="h-3.5 w-3.5 rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <label className="relative inline-flex items-center gap-1.5">
      <span className="sr-only">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="appearance-none rounded-full border border-hairline bg-white px-3 py-1 pr-7 text-[12.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414]"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
      />
    </label>
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

function urgency(
  due: Date | null,
  isCompleted: boolean,
  now: Date,
): "overdue" | "soon" | "later" | "none" {
  if (!due || isCompleted) return "none";
  const t0 = startOfDay(now);
  const t3 = addDays(t0, 3);
  if (due < t0) return "overdue";
  if (due < t3) return "soon";
  return "later";
}

function formatDueShort(due: Date, now: Date): string {
  const t0 = startOfDay(now);
  const d0 = startOfDay(due);
  const diff = Math.round(
    (d0.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 7) return `In ${diff}d`;
  if (diff < -1 && diff >= -7) return `${-diff}d ago`;
  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: due.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
