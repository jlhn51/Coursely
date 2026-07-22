"use client";

import {
  ExternalLink,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
  MessageSquare,
  Presentation,
  RefreshCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { reembedMaterial } from "@/actions/embed-material";
import { softDeleteMaterial } from "@/actions/materials";

// Preview payload — same shape for /materials and per-course sections. All
// fields already scoped to the current user by the caller's data-fetch.
export type MaterialPreview = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileCategory: string;
  fileSize: number;
  courseName: string;
  courseId?: string;
  uploadedAt: string | Date;
  // Whether deleting this material could orphan parsed topics/tasks. The
  // caller sets this to true when the material is a syllabus tied to a
  // course whose parse succeeded — we warn but do not block.
  syllabusHasParsedContent?: boolean;
  // For PDF citations from the AI tutor. When set, the iframe URL gets a
  // `#page=N` fragment so Chrome/Firefox jump straight to that page.
  startPage?: number | null;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  return <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;
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

export function MaterialPreviewModal({
  material,
  onClose,
  onAfterDelete,
}: {
  material: MaterialPreview | null;
  onClose: () => void;
  onAfterDelete?: () => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reembedding, startReembed] = useTransition();

  const handleClose = useCallback(() => {
    setConfirmDelete(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!material) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [material, handleClose]);

  if (!material || typeof document === "undefined") return null;

  const isPdf =
    material.fileType.includes("pdf") ||
    material.name.toLowerCase().endsWith(".pdf");
  const isImage = material.fileType.startsWith("image/");
  const uploadedAt =
    typeof material.uploadedAt === "string"
      ? new Date(material.uploadedAt)
      : material.uploadedAt;

  function onDelete() {
    if (!material) return;
    startTransition(async () => {
      const r = await softDeleteMaterial({ materialId: material.id });
      if ("error" in r && r.error) {
        toast.error("Couldn't delete", { description: r.error });
        return;
      }
      toast.success("Material deleted");
      onAfterDelete?.();
      router.refresh();
      handleClose();
    });
  }

  function onReembed() {
    if (!material) return;
    startReembed(async () => {
      const r = await reembedMaterial(material.id);
      if ("error" in r && r.error) {
        toast.error("Couldn't re-embed", { description: r.error });
        return;
      }
      const chunks = "chunks" in r ? r.chunks : 0;
      toast.success("Re-embedded for AI tutor", {
        description: `${chunks} chunk${chunks === 1 ? "" : "s"} indexed.`,
      });
      router.refresh();
    });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={material.name}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close preview"
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_30px_80px_-24px_rgb(10_10_10_/_0.45)] dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-3 border-b border-hairline p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/[0.10] text-accent">
              <FileTypeIcon fileType={material.fileType} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-serif text-[20px] leading-tight text-ink">
                {material.name}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {material.courseName} · {categoryLabel(material.fileCategory)} ·
                Uploaded {formatDate(uploadedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-paper dark:bg-[#0f0f10]">
          {isPdf ? (
            <iframe
              src={
                material.startPage && material.startPage > 0
                  ? `${material.url}#page=${material.startPage}`
                  : material.url
              }
              title={material.name}
              className="h-full w-full"
            />
          ) : isImage ? (
            <div className="flex h-full items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={material.url}
                alt={material.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline text-muted">
                <FileTypeIcon fileType={material.fileType} />
              </span>
              <p className="font-serif text-[22px] leading-tight text-ink">
                No inline preview.
              </p>
              <p className="max-w-md text-[13.5px] text-muted">
                Open the file in a new tab to view it.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline p-4">
          <div className="flex items-center gap-3">
            {material.syllabusHasParsedContent ? (
              <p className="flex items-start gap-1.5 text-[11.5px] text-muted">
                <Sparkles
                  size={11}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                Deleting will not remove parsed topics or tasks.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-white px-3 py-1.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 dark:bg-[#141414] dark:text-red-400"
            >
              <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
              Delete
            </button>
            {isPdf ? (
              <button
                type="button"
                disabled={reembedding}
                onClick={onReembed}
                title="Re-run the embedding pipeline for this PDF"
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 dark:bg-[#141414] dark:hover:bg-white/[0.05]"
              >
                <RefreshCcw size={12} strokeWidth={2} aria-hidden="true" />
                {reembedding ? "Re-embedding…" : "Re-embed for AI tutor"}
              </button>
            ) : null}
            {material.courseId ? (
              <Link
                href={`/courses/${material.courseId}/tutor?prompt=${encodeURIComponent(
                  `Explain "${material.name}" in the context of ${material.courseName}.`,
                )}`}
                onClick={handleClose}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414] dark:hover:bg-white/[0.05]"
              >
                <MessageSquare size={12} strokeWidth={2} aria-hidden="true" />
                Ask tutor about this →
              </Link>
            ) : null}
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
            >
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
              Open in new tab
            </a>
          </div>
        </div>

        {confirmDelete ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-hairline bg-white p-6 shadow-2xl dark:bg-[#141414]">
              <h3 className="font-serif text-[20px] leading-tight text-ink">
                Delete this material?
              </h3>
              <p className="mt-2 text-[13.5px] text-muted">
                &ldquo;{material.name}&rdquo; will be removed from{" "}
                {material.courseName}.
              </p>
              {material.syllabusHasParsedContent ? (
                <p className="mt-2 text-[12px] italic text-muted">
                  Parsed topics and tasks from this syllabus will stay.
                </p>
              ) : null}
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
      </div>
    </div>,
    document.body,
  );
}
