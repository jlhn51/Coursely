"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { softDeleteCourse, updateCourse } from "@/actions/courses";
import { Modal } from "@/components/modal";
import type { Course } from "@/db/schema";

// Kebab menu that lives inside the course-detail header. Edit + delete are
// both destructive-ish, so both live behind a menu instead of top-of-page
// buttons.
export function CourseHeaderMenu({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Course actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
        >
          <MoreHorizontal size={14} strokeWidth={2} aria-hidden="true" />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 min-w-[180px] rounded-md border border-hairline bg-white p-1 shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.25)] dark:bg-[#141414]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px] text-ink hover:bg-ink/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
            >
              <Pencil
                size={13}
                strokeWidth={2}
                className="text-muted"
                aria-hidden="true"
              />
              Edit course
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px] text-red-700 hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-red-400"
            >
              <Trash2
                size={13}
                strokeWidth={2}
                aria-hidden="true"
              />
              Delete course
            </button>
          </div>
        ) : null}
      </div>

      <EditCourseModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        course={course}
      />
      <DeleteCourseModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        course={course}
      />
    </>
  );
}

// ---------- Edit modal ----------

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  // yyyy-mm-dd in UTC; matches the shape <input type="date"> expects and how
  // the server action parses the string back into a Date.
  return d.toISOString().slice(0, 10);
}

function EditCourseModal({
  open,
  onClose,
  course,
}: {
  open: boolean;
  onClose: () => void;
  course: Course;
}) {
  const router = useRouter();
  const [name, setName] = useState(course.name);
  const [professor, setProfessor] = useState(course.professor ?? "");
  const [semester, setSemester] = useState(course.semester ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(course.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(course.endDate));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Edit course" eyebrow="Details">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await updateCourse({
              courseId: course.id,
              name,
              professor,
              semester,
              startDate,
              endDate,
            });
            if ("error" in result && result.error) {
              setError(result.error);
              toast.error("Couldn't save changes", { description: result.error });
              return;
            }
            toast.success("Course updated");
            router.refresh();
            onClose();
          });
        }}
      >
        <fieldset disabled={pending} className="space-y-5">
          <label className="block">
            <span className="text-[13px] font-medium text-ink">
              Name
              <span aria-hidden="true" className="ml-1 text-accent">
                *
              </span>
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14.5px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
            />
          </label>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">
                  Professor
                </span>
                <span className="text-[11.5px] text-muted">Optional</span>
              </span>
              <input
                type="text"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="Prof. Ada Lovelace"
                autoComplete="off"
                className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
              />
            </label>
            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">
                  Semester
                </span>
                <span className="text-[11.5px] text-muted">Optional</span>
              </span>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Fall 2026"
                autoComplete="off"
                className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
              />
            </label>
          </div>

          <div>
            <p className="text-[13px] font-medium text-ink">Semester dates</p>
            <p className="mt-1 text-[11.5px] text-muted">
              Set both to unlock the semester pulse card on the dashboard.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12.5px] font-medium text-muted">
                  Start
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10] dark:[color-scheme:dark]"
                />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-medium text-muted">
                  End
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10] dark:[color-scheme:dark]"
                />
              </label>
            </div>
          </div>

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
              {pending ? "Saving…" : "Save changes"}
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

// ---------- Delete modal ----------

function DeleteCourseModal({
  open,
  onClose,
  course,
}: {
  open: boolean;
  onClose: () => void;
  course: Course;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setConfirm("");
    setError(null);
    onClose();
  }

  const nameMatches = confirm.trim() === course.name;

  return (
    <Modal open={open} onClose={close} title="Delete this course?" eyebrow="Danger">
      <div className="space-y-4">
        <p className="text-[14px] leading-[1.55] text-ink">
          This soft-deletes{" "}
          <span className="font-medium">{course.name}</span>, plus every
          material, topic, and task inside it. This cannot be undone from the
          UI.
        </p>
        <label className="block">
          <span className="text-[13px] font-medium text-ink">
            Type <span className="font-mono text-accent">{course.name}</span> to
            confirm
          </span>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            placeholder={course.name}
            className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-muted/70 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/25 dark:bg-[#0f0f10]"
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
        <div className="flex items-center justify-end gap-3 border-t border-hairline pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={close}
            className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!nameMatches || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await softDeleteCourse({
                  courseId: course.id,
                  confirmName: confirm,
                });
                if ("error" in r && r.error) {
                  setError(r.error);
                  toast.error("Couldn't delete", { description: r.error });
                  return;
                }
                toast.success(`Deleted ${course.name}`);
                router.push("/courses");
                router.refresh();
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
            {pending ? "Deleting…" : "Delete course"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
