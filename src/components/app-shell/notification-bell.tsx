"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type OverdueTask = {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueDate: string;
};

export function NotificationBell({ overdue }: { overdue: OverdueTask[] }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const count = overdue.length;
  const label = count > 0
    ? `${count} overdue task${count === 1 ? "" : "s"}`
    : "Notifications";

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
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-ink transition-colors hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
      >
        <Bell size={14} strokeWidth={2} aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-paper"
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-md border border-hairline bg-white shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.25)] dark:bg-[#141414]"
        >
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              Overdue
            </p>
            <p className="mt-1 font-serif text-[18px] leading-tight text-ink">
              {count > 0
                ? `${count} slipping.`
                : "You're all caught up."}
            </p>
          </div>
          {count === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] italic text-muted">
              Nothing overdue. Nice pace.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-hairline overflow-y-auto">
              {overdue.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/courses/${t.courseId}#tasks`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
                  >
                    <p className="line-clamp-1 text-[13.5px] font-medium text-ink">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {t.courseName} · {relativeOverdue(t.dueDate)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function relativeOverdue(iso: string): string {
  const due = new Date(iso);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round(
    (today.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "today";
  if (days === 1) return "1 day overdue";
  if (days < 30) return `${days} days overdue`;
  const weeks = Math.round(days / 7);
  return `${weeks}w overdue`;
}
