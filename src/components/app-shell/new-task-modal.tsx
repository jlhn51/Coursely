"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/actions/tasks";
import { CoursePicker, type CourseOption } from "@/components/course-picker";
import { Modal } from "@/components/modal";
import { TASK_TYPES, type TaskType } from "@/lib/task-types";

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

export function NewTaskModal({
  open,
  onClose,
  courses,
  defaultCourseId,
}: {
  open: boolean;
  onClose: () => void;
  courses: CourseOption[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(
    defaultCourseId ?? courses[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("other");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDueDate("");
    setDescription("");
    setTaskType("other");
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="New task" eyebrow="Add task">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!courseId) {
            setError("Pick a course first.");
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await createTask({
              courseId,
              title,
              description,
              taskType,
              dueDate,
            });
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            reset();
            router.refresh();
            onClose();
          });
        }}
      >
        <fieldset disabled={pending} className="space-y-5">
          <CoursePicker
            courses={courses}
            value={courseId}
            onChange={setCourseId}
            autoFocus
          />

          <label className="block">
            <span className="text-[13px] font-medium text-ink">
              Title
              <span aria-hidden="true" className="ml-1 text-accent">
                *
              </span>
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="PSet 4 · Backpropagation"
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
              rows={3}
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

          <div className="flex items-center gap-3 border-t border-hairline pt-5">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60 dark:hover:bg-[#6a7bff]"
            >
              {pending ? "Adding…" : "Add task"}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Cancel
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
