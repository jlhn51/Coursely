"use client";

import {
  BookOpen,
  Check,
  CheckSquare,
  FileText,
  GraduationCap,
  Plus,
  ScrollText,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createTask, toggleTaskCompletion } from "@/actions/tasks";
import type { Task } from "@/db/schema";
import { TASK_TYPES, type TaskType } from "@/lib/task-types";

type Filter = "all" | "open" | "done" | "week";

const filterOptions: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "week", label: "This week" },
];

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

const typeIcon: Record<TaskType, typeof FileText> = {
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

export function TasksSection({
  courseId,
  tasks,
}: {
  courseId: string;
  tasks: Task[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      open: tasks.filter((t) => !t.isCompleted).length,
      done: tasks.filter((t) => t.isCompleted).length,
      week: tasks.filter((t) => isDueThisWeek(t.dueDate)).length,
    }),
    [tasks],
  );

  const visible = useMemo(() => {
    if (filter === "open") return tasks.filter((t) => !t.isCompleted);
    if (filter === "done") return tasks.filter((t) => t.isCompleted);
    if (filter === "week") return tasks.filter((t) => isDueThisWeek(t.dueDate));
    return tasks;
  }, [tasks, filter]);

  return (
    <section id="tasks" className="mt-20 scroll-mt-20 md:mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-serif text-[32px] leading-[1.1] text-ink md:text-[40px]">
          Your <em className="italic text-accent">tasks.</em>
        </h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
        >
          {showForm ? (
            <>
              <X size={13} aria-hidden="true" />
              Close
            </>
          ) : (
            <>
              <Plus size={13} aria-hidden="true" />
              Add task
            </>
          )}
        </button>
      </div>

      {showForm ? (
        <NewTaskForm
          courseId={courseId}
          onSuccess={() => setShowForm(false)}
        />
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const active = filter === opt.value;
          const count = counts[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-hairline bg-white text-muted hover:text-ink dark:bg-[#141414]"
              }`}
            >
              {opt.label}
              <span
                className={`text-[11px] ${active ? "text-white/80" : "text-muted/70"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {visible.length === 0 ? (
          <EmptyTasks filter={filter} />
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white dark:bg-[#141414]">
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EmptyTasks({ filter }: { filter: Filter }) {
  const copy =
    filter === "done"
      ? "Nothing checked off yet. That'll change."
      : filter === "week"
        ? "Nothing due this week. Enjoy it."
        : filter === "open"
          ? "Everything's done. Rare. Take a screenshot."
          : "Nothing due. Add a p-set or exam to get started.";
  return (
    <div className="rounded-2xl border border-hairline bg-white p-8 text-center dark:bg-[#141414]">
      <p className="font-serif text-[20px] text-ink">{copy}</p>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleTaskCompletion({ taskId: task.id });
      if ("error" in result && result.error) setError(result.error);
    });
  }

  const type = (task.taskType as TaskType) ?? "other";
  const Icon = typeIcon[type] ?? CheckSquare;

  return (
    <li className="flex items-start gap-4 p-4">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={task.isCompleted}
        aria-label={
          task.isCompleted ? "Mark as not done" : "Mark as done"
        }
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          task.isCompleted
            ? "border-accent bg-accent text-white"
            : "border-hairline hover:border-accent/60"
        } ${pending ? "opacity-60" : ""}`}
      >
        {task.isCompleted ? (
          <Check size={12} strokeWidth={2.5} aria-hidden="true" />
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p
            className={`text-[14.5px] font-medium ${
              task.isCompleted
                ? "text-muted line-through decoration-hairline"
                : "text-ink"
            }`}
          >
            {task.title}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">
            <Icon size={11} strokeWidth={2} aria-hidden="true" />
            {typeLabel[type]}
          </span>
        </div>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.55] text-muted">
            {task.description}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right text-[12.5px]">
        {task.dueDate ? (
          <p
            className={
              task.isCompleted
                ? "text-muted"
                : isOverdue(task.dueDate)
                  ? "font-medium text-red-600 dark:text-red-400"
                  : isDueThisWeek(task.dueDate)
                    ? "font-medium text-accent"
                    : "text-muted"
            }
          >
            {formatDueDate(task.dueDate)}
          </p>
        ) : (
          <p className="text-muted">No date</p>
        )}
      </div>
    </li>
  );
}

function NewTaskForm({
  courseId,
  onSuccess,
}: {
  courseId: string;
  onSuccess: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await createTask({
            courseId,
            title: String(fd.get("title") ?? ""),
            description: String(fd.get("description") ?? ""),
            taskType: (String(fd.get("taskType") ?? "other") as TaskType),
            dueDate: String(fd.get("dueDate") ?? ""),
          });
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          (e.target as HTMLFormElement).reset();
          onSuccess();
        });
      }}
      className="mt-6 rounded-2xl border border-hairline bg-white p-6 dark:bg-[#141414]"
    >
      <fieldset disabled={pending} className="space-y-5">
        <FormField
          name="title"
          label="Title"
          placeholder="PSet 4 · Backpropagation"
          required
          autoFocus
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-medium text-ink">Type</span>
            <select
              name="taskType"
              defaultValue="other"
              className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-ink">Due date</span>
              <span className="text-[11.5px] text-muted">Optional</span>
            </span>
            <input
              type="date"
              name="dueDate"
              className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10] dark:[color-scheme:dark]"
            />
          </label>
        </div>

        <label className="block">
          <span className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink">Description</span>
            <span className="text-[11.5px] text-muted">Optional</span>
          </span>
          <textarea
            name="description"
            rows={3}
            placeholder="Notes, links, anything worth remembering."
            className="mt-2 block w-full resize-y rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[13px] text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3 border-t border-hairline pt-5">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-[#6a7bff]"
          >
            {pending ? "Adding…" : "Add task"}
          </button>
          <button
            type="button"
            onClick={onSuccess}
            className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function FormField({
  name,
  label,
  placeholder,
  required,
  autoFocus,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-accent">
            *
          </span>
        ) : null}
      </span>
      <input
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14.5px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
      />
    </label>
  );
}

// ---------- date helpers ----------

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isDueThisWeek(due: Date | null): boolean {
  if (!due) return false;
  const now = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diffDays =
    (dueDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

function isOverdue(due: Date): boolean {
  return startOfDay(due).getTime() < startOfDay(new Date()).getTime();
}

function formatDueDate(due: Date): string {
  const now = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diff = Math.round(
    (dueDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  if (diff < 0 && diff >= -7) return `${-diff} days ago`;
  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: due.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
