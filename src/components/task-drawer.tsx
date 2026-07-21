"use client";

import {
  BookOpen,
  Check,
  CheckSquare,
  FileText,
  GraduationCap,
  type LucideIcon,
  ScrollText,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { softDeleteTask, updateTask } from "@/actions/tasks";
import { TASK_TYPES, type TaskType } from "@/lib/task-types";

// The drawer accepts the widest possible task shape so it can be opened from
// the calendar (serialized dates), the /tasks index (serialized), and the
// per-course tasks section (Date instances). Everything gets normalized on
// the way in.
export type TaskDrawerTask = {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseName: string;
  taskType: string;
  isCompleted: boolean;
  // Accepts either an ISO string, a Date, or null. Undefined is treated as null.
  dueDate: string | Date | null | undefined;
  source: "manual" | "syllabus" | string;
  createdAt: string | Date;
  sourceMaterialName?: string | null;
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

function toDateInputValue(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatCreatedAt(v: string | Date): string {
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Wrapper that handles the null-vs-null-not case. The inner content is
// keyed off the task id so state resets naturally when the caller opens a
// different task — no useEffect syncing.
export function TaskDrawer({
  task,
  onClose,
  onAfterSave,
  onAfterDelete,
}: {
  task: TaskDrawerTask | null;
  onClose: () => void;
  onAfterSave?: () => void;
  onAfterDelete?: () => void;
}) {
  if (!task) return null;
  return (
    <TaskDrawerContent
      key={task.id}
      task={task}
      onClose={onClose}
      onAfterSave={onAfterSave}
      onAfterDelete={onAfterDelete}
    />
  );
}

function TaskDrawerContent({
  task,
  onClose,
  onAfterSave,
  onAfterDelete,
}: {
  task: TaskDrawerTask;
  onClose: () => void;
  onAfterSave?: () => void;
  onAfterDelete?: () => void;
}) {
  const router = useRouter();
  // Lazy initializers pull from the task once. When the parent opens a
  // different task, the outer TaskDrawer keys us off task.id → we remount
  // fresh, so no useEffect-driven state sync is needed.
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueDate));
  const [taskType, setTaskType] = useState<TaskType>(
    (task.taskType as TaskType) ?? "other",
  );
  const [isCompleted, setIsCompleted] = useState(task.isCompleted);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const Icon = typeIcon[taskType] ?? CheckSquare;

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updateTask({
        taskId: task.id,
        title,
        description,
        taskType,
        dueDate,
        isCompleted,
      });
      if ("error" in r && r.error) {
        setError(r.error);
        toast.error("Couldn't save task", { description: r.error });
        return;
      }
      toast.success("Task updated");
      onAfterSave?.();
      router.refresh();
      onClose();
    });
  }

  function onToggleComplete() {
    const next = !isCompleted;
    setIsCompleted(next);
    startTransition(async () => {
      const r = await updateTask({
        taskId: task.id,
        title,
        description,
        taskType,
        dueDate,
        isCompleted: next,
      });
      if ("error" in r && r.error) {
        setIsCompleted(!next);
        toast.error("Couldn't update", { description: r.error });
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const r = await softDeleteTask({ taskId: task.id });
      if ("error" in r && r.error) {
        setError(r.error);
        toast.error("Couldn't delete", { description: r.error });
        return;
      }
      toast.success("Task deleted");
      onAfterDelete?.();
      router.refresh();
      onClose();
    });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${task.title}`}
      className="fixed inset-0 z-[100]"
    >
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-hairline bg-white shadow-2xl dark:bg-[#141414]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-hairline bg-white p-6 dark:bg-[#141414]">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              Task
            </p>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleComplete}
                disabled={pending}
                aria-pressed={isCompleted}
                aria-label={isCompleted ? "Mark as not done" : "Mark as done"}
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isCompleted
                    ? "border-accent bg-accent text-white"
                    : "border-hairline hover:border-accent/60"
                }`}
              >
                {isCompleted ? (
                  <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                ) : null}
              </button>
              <p
                className={`min-w-0 truncate font-serif text-[22px] leading-tight text-ink ${isCompleted ? "line-through decoration-hairline" : ""}`}
              >
                {title || "Untitled task"}
              </p>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
              <Link
                href={`/courses/${task.courseId}`}
                className="hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {task.courseName}
              </Link>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Icon size={10} strokeWidth={2} aria-hidden="true" />
                {typeLabel[taskType]}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <form className="flex-1 space-y-5 p-6" onSubmit={onSave}>
          <fieldset disabled={pending} className="space-y-5">
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Title</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
                className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14.5px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
              />
            </label>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-medium text-ink">Type</span>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
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
                  <span className="text-[13px] font-medium text-ink">
                    Due date
                  </span>
                  <span className="text-[11.5px] text-muted">Optional</span>
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10] dark:[color-scheme:dark]"
                />
              </label>
            </div>

            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">
                  Description
                </span>
                <span className="text-[11.5px] text-muted">Optional</span>
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

            <div className="rounded-xl border border-hairline bg-paper p-4 text-[12.5px] text-muted dark:bg-[#0f0f10]">
              <p className="flex items-center gap-1.5 font-medium uppercase tracking-[0.12em] text-[10.5px]">
                {task.source === "syllabus" ? (
                  <>
                    <Sparkles
                      size={11}
                      strokeWidth={2}
                      className="text-accent"
                      aria-hidden="true"
                    />
                    Source
                  </>
                ) : (
                  "Source"
                )}
              </p>
              <p className="mt-1.5 text-[13px] text-ink">
                {task.source === "syllabus"
                  ? task.sourceMaterialName
                    ? `From syllabus: ${task.sourceMaterialName}`
                    : "From syllabus"
                  : "Added manually"}
              </p>
              <p className="mt-1 text-[11.5px]">
                Created {formatCreatedAt(task.createdAt)}
              </p>
            </div>
          </fieldset>

          <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-hairline bg-white px-6 py-4 dark:bg-[#141414]">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-white px-3.5 py-2 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 dark:bg-[#141414] dark:text-red-400"
            >
              <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
              Delete
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-[#6a7bff]"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>

        {confirmDelete ? (
          <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-sm rounded-t-2xl border-t border-hairline bg-white p-6 shadow-2xl sm:rounded-2xl sm:border dark:bg-[#141414]">
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
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                >
                  <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
                  {pending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
