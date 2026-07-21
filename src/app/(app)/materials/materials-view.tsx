"use client";

import {
  ChevronDown,
  ExternalLink,
  File as FileIcon,
  FileText,
  Filter,
  Image as ImageIcon,
  type LucideIcon,
  Presentation,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { softDeleteMaterial } from "@/actions/materials";
import { UploadMaterialModal } from "@/components/app-shell/upload-material-modal";
import type { CourseOption } from "@/components/course-picker";
import { Reveal } from "@/components/reveal";

export type MaterialRow = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileCategory: string;
  fileSize: number;
  courseId: string;
  courseName: string;
  uploadedAt: string;
};

const filterOptions = [
  { value: "all", label: "All" },
  { value: "syllabus", label: "Syllabi" },
  { value: "slides", label: "Slides" },
  { value: "notes", label: "Notes" },
  { value: "other", label: "Other" },
] as const;

type FilterValue = (typeof filterOptions)[number]["value"];

export function MaterialsView({
  materials,
  courses,
}: {
  materials: MaterialRow[];
  courses: CourseOption[];
}) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [courseFilter, setCourseFilter] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = materials.slice();
    if (filter !== "all") {
      list = list.filter((m) => m.fileCategory === filter);
    }
    if (courseFilter.size > 0) {
      list = list.filter((m) => courseFilter.has(m.courseId));
    }
    return list;
  }, [materials, filter, courseFilter]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      <Reveal as="section">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-serif text-[36px] leading-[1.05] text-ink md:text-[52px]">
              Your <em className="italic text-accent">library.</em>
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.55] text-muted md:text-[17px]">
              Everything you&apos;ve uploaded.
            </p>
          </div>
          <button
            type="button"
            disabled={courses.length === 0}
            onClick={() => setModalOpen(true)}
            title={courses.length === 0 ? "Add a course first." : undefined}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#6a7bff]"
          >
            <Upload size={13} strokeWidth={2} aria-hidden="true" /> Upload material
          </button>
        </div>
      </Reveal>

      <Reveal as="section" className="mt-10 md:mt-14">
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((opt) => {
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
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
          <CourseFilter
            courses={courses}
            selected={courseFilter}
            onChange={setCourseFilter}
          />
        </div>

        <div className="mt-6">
          {filtered.length === 0 ? (
            <EmptyState
              onUpload={() => setModalOpen(true)}
              disabled={courses.length === 0}
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <MaterialCard key={m.id} material={m} />
              ))}
            </ul>
          )}
        </div>
      </Reveal>

      <UploadMaterialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courses={courses}
      />
    </div>
  );
}

function CourseFilter({
  courses,
  selected,
  onChange,
}: {
  courses: CourseOption[];
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
        <Filter size={11} strokeWidth={2} aria-hidden="true" />
        Course
        {count > 0 ? <span className="text-[10.5px]">· {count}</span> : null}
        <ChevronDown size={11} strokeWidth={2} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[220px] max-h-72 overflow-y-auto rounded-md border border-hairline bg-white p-1 shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.25)] dark:bg-[#141414]"
        >
          {courses.length === 0 ? (
            <p className="px-3 py-2 text-[12px] italic text-muted">
              No courses.
            </p>
          ) : (
            courses.map((c) => {
              const checked = selected.has(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-[13px] text-ink hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(c.id);
                      else next.add(c.id);
                      onChange(next);
                    }}
                    className="h-3.5 w-3.5 rounded border-hairline text-accent focus:ring-accent"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function MaterialCard({ material }: { material: MaterialRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onDelete() {
    if (!confirm(`Delete "${material.name}"?`)) return;
    startTransition(async () => {
      await softDeleteMaterial({ materialId: material.id });
      router.refresh();
    });
  }

  return (
    <li>
      <div className="group relative flex h-full items-start gap-3 rounded-2xl border border-hairline bg-white p-4 transition-colors hover:border-ink/25 dark:bg-[#141414] dark:hover:border-white/25">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/[0.10] text-accent">
          <FileTypeIcon fileType={material.fileType} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">
            {material.name}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            <Link
              href={`/courses/${material.courseId}`}
              className="hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {material.courseName}
            </Link>
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted">
            <span>{categoryLabel(material.fileCategory)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(new Date(material.uploadedAt))}</span>
          </p>
          <a
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ExternalLink size={11} strokeWidth={2} aria-hidden="true" />
            Open file
          </a>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          aria-label="Delete material"
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent group-hover:opacity-100 dark:hover:text-red-400"
        >
          <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function EmptyState({
  onUpload,
  disabled,
}: {
  onUpload: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-10 text-center dark:bg-[#141414] md:p-16">
      <p className="font-serif text-[26px] text-ink">
        No materials yet.
      </p>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
        Drop in your syllabus, slides, or notes.
      </p>
      <button
        type="button"
        onClick={onUpload}
        disabled={disabled}
        title={disabled ? "Add a course first." : undefined}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#6a7bff]"
      >
        <Upload size={13} strokeWidth={2} aria-hidden="true" /> Upload
      </button>
    </div>
  );
}

// ---- helpers ----

const iconByType: Record<string, LucideIcon> = {
  pdf: FileText,
  image: ImageIcon,
  slides: Presentation,
  file: FileIcon,
};

function FileTypeIcon({ fileType }: { fileType: string }) {
  const Icon =
    fileType.includes("pdf") || fileType.startsWith("text/")
      ? iconByType.pdf!
      : fileType.startsWith("image/")
        ? iconByType.image!
        : fileType.includes("presentation") ||
            fileType.includes("powerpoint") ||
            fileType.includes("keynote")
          ? iconByType.slides!
          : iconByType.file!;
  return <Icon size={18} strokeWidth={1.75} aria-hidden="true" />;
}

function categoryLabel(c: string): string {
  switch (c) {
    case "syllabus":
      return "Syllabus";
    case "slides":
      return "Slides";
    case "notes":
      return "Notes";
    default:
      return "File";
  }
}

function formatDate(d: Date): string {
  const now = new Date();
  const diffDays = Math.round(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
