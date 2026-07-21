"use client";

import {
  BookOpen,
  Check,
  CheckSquare,
  FileText,
  GraduationCap,
  type LucideIcon,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { softDeleteTask, updateTask } from "@/actions/tasks";
import { NewTaskModal } from "@/components/app-shell/new-task-modal";
import { TaskDrawer, type TaskDrawerTask } from "@/components/task-drawer";
import type { Task } from "@/db/schema";
import { type TaskType } from "@/lib/task-types";

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

export function TasksSection({
  courseId,
  courseName,
  tasks,
}: {
  courseId: string;
  courseName: string;
  tasks: Task[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

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

  const drawerData: TaskDrawerTask | null = drawerTask
    ? {
        id: drawerTask.id,
        title: drawerTask.title,
        description: drawerTask.description,
        courseId,
        courseName,
        taskType: drawerTask.taskType,
        isCompleted: drawerTask.isCompleted,
        dueDate: drawerTask.dueDate,
        source: drawerTask.source,
        createdAt: drawerTask.createdAt,
      }
    : null;

  return (
    <section id="tasks" className="mt-20 scroll-mt-20 md:mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-serif text-[32px] leading-[1.1] text-ink md:text-[40px]">
          Your <em className="italic text-accent">tasks.</em>
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
        >
          <Plus size={13} aria-hidden="true" />
          Add task
        </button>
      </div>

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
              <TaskRow
                key={task.id}
                task={task}
                onOpen={setDrawerTask}
                onRequestDelete={setPendingDelete}
              />
            ))}
          </ul>
        )}
      </div>

      <NewTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courses={[{ id: courseId, name: courseName }]}
        defaultCourseId={courseId}
      />
      <TaskDrawer task={drawerData} onClose={() => setDrawerTask(null)} />
      <ConfirmDelete
        task={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
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

function TaskRow({
  task,
  onOpen,
  onRequestDelete,
}: {
  task: Task;
  onOpen: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useState(
    task.isCompleted,
  );
  const type = (task.taskType as TaskType) ?? "other";
  const Icon = typeIcon[type] ?? CheckSquare;

  function onToggle() {
    const next = !optimisticCompleted;
    setOptimisticCompleted(next);
    startTransition(async () => {
      const r = await updateTask({
        taskId: task.id,
        title: task.title,
        description: task.description ?? undefined,
        taskType: type,
        dueDate: task.dueDate ? task.dueDate.toISOString() : "",
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
      className="group flex cursor-pointer items-start gap-4 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent hover:bg-paper dark:hover:bg-[#0f0f10]"
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={optimisticCompleted}
        aria-label={optimisticCompleted ? "Mark as not done" : "Mark as done"}
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p
            className={`text-[14.5px] font-medium ${
              optimisticCompleted
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
      </div>

      <div className="shrink-0 text-right text-[12.5px]">
        {task.dueDate ? (
          <p
            className={
              optimisticCompleted
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

      <div className="flex shrink-0 items-center gap-1 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
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
  task: Task | null;
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
