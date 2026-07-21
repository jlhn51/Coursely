"use client";

import {
  BookPlus,
  type LucideIcon,
  Plus,
  SquarePlus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { CourseOption } from "@/components/course-picker";
import { NewTaskModal } from "./new-task-modal";
import { UploadMaterialModal } from "./upload-material-modal";

export function AddMenu({ courses }: { courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasCourses = courses.length > 0;

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
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
        >
          <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
          <span className="hidden sm:inline">Add</span>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 min-w-[220px] rounded-md border border-hairline bg-white p-1 shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.25)] dark:bg-[#141414]"
          >
            <MenuLink
              href="/courses/new"
              icon={BookPlus}
              onClose={() => setOpen(false)}
            >
              New course
            </MenuLink>
            {hasCourses ? (
              <MenuAction
                icon={SquarePlus}
                onClick={() => {
                  setOpen(false);
                  setTaskOpen(true);
                }}
              >
                New task
              </MenuAction>
            ) : (
              <MenuDisabled icon={SquarePlus}>New task</MenuDisabled>
            )}
            {hasCourses ? (
              <MenuAction
                icon={Upload}
                onClick={() => {
                  setOpen(false);
                  setUploadOpen(true);
                }}
              >
                Upload material
              </MenuAction>
            ) : (
              <MenuDisabled icon={Upload}>Upload material</MenuDisabled>
            )}
          </div>
        ) : null}
      </div>

      <NewTaskModal
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        courses={courses}
      />
      <UploadMaterialModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        courses={courses}
      />
    </>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClose,
  children,
}: {
  href: string;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] text-ink hover:bg-ink/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
    >
      <Icon
        size={14}
        strokeWidth={2}
        aria-hidden="true"
        className="text-muted"
      />
      {children}
    </Link>
  );
}

function MenuAction({
  icon: Icon,
  onClick,
  children,
}: {
  icon: LucideIcon;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px] text-ink hover:bg-ink/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
    >
      <Icon
        size={14}
        strokeWidth={2}
        aria-hidden="true"
        className="text-muted"
      />
      {children}
    </button>
  );
}

function MenuDisabled({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span
      role="menuitem"
      aria-disabled="true"
      title="Add a course first."
      className="flex cursor-not-allowed items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] text-muted opacity-60"
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      {children}
    </span>
  );
}
