"use client";

import {
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Presentation,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createMaterial } from "@/actions/materials";
import { parseSyllabus } from "@/actions/syllabus";
import { useParsingStatus } from "@/components/app-shell/parsing-provider";
import {
  MaterialPreviewModal,
  type MaterialPreview,
} from "@/components/material-preview-modal";
import type { Material } from "@/db/schema";
import { FILE_CATEGORIES, type FileCategory } from "@/lib/file-categories";
import { UploadDropzone } from "@/lib/uploadthing";

const categoryLabel: Record<FileCategory, string> = {
  syllabus: "Syllabus",
  slides: "Slides",
  notes: "Notes",
  other: "Other",
};

type PendingUpload = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export function MaterialsSection({
  courseId,
  courseName,
  materials,
  syllabusStatus,
}: {
  courseId: string;
  courseName: string;
  materials: Material[];
  syllabusStatus: string;
}) {
  const router = useRouter();
  const { triggerPoll } = useParsingStatus();
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  // Smart default: on an empty course, prime for syllabus upload. Once any
  // material exists, drop back to "other" so users don't accidentally re-tag
  // slides as syllabi.
  const initialCategory: FileCategory =
    materials.length === 0 ? "syllabus" : "other";
  const [category, setCategory] = useState<FileCategory>(initialCategory);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "saving" | "parsing"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [, startTransition] = useTransition();

  // Filename detection — soft prompt only. Never overrides the user's choice.
  const filenameSuggestsSyllabus =
    !!pendingUpload &&
    /syllab/i.test(pendingUpload.name) &&
    category !== "syllabus";

  function saveUpload(upload: PendingUpload, cat: FileCategory) {
    setUploadState("saving");
    setPendingUpload(null);
    startTransition(async () => {
      const created = await createMaterial({
        courseId,
        name: upload.name,
        url: upload.url,
        fileType: upload.type,
        fileSize: upload.size,
        fileCategory: cat,
      });
      if (!created.success) {
        setError(created.error);
        toast.error("Couldn't save material", { description: created.error });
        setUploadState("idle");
        return;
      }
      const materialId = created.materialId;

      if (cat === "syllabus") {
        toast(`Syllabus uploaded — parsing…`, {
          description: "We'll notify you when it's ready.",
        });
        setUploadState("parsing");
        triggerPoll();
        startTransition(async () => {
          await parseSyllabus({
            courseId,
            fileUrl: upload.url,
            materialId,
          });
          setUploadState("idle");
          setCategory("other");
          router.refresh();
        });
      } else {
        toast.success(`${categoryLabel[cat]} uploaded`);
        setUploadState("idle");
        router.refresh();
      }
    });
  }

  function acceptSuggestion() {
    if (!pendingUpload) return;
    setCategory("syllabus");
    saveUpload(pendingUpload, "syllabus");
  }

  function keepChoice() {
    if (!pendingUpload) return;
    saveUpload(pendingUpload, category);
  }

  return (
    <section id="materials" className="mt-20 scroll-mt-20 md:mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-serif text-[32px] leading-[1.1] text-ink md:text-[40px]">
          Your <em className="italic text-accent">materials.</em>
        </h2>
        <p className="text-[12.5px] text-muted">
          {materials.length === 0
            ? "Nothing uploaded yet"
            : `${materials.length} file${materials.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414]">
        <p className="text-[13px] font-medium text-ink">Add a file</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILE_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-hairline bg-white text-muted hover:text-ink dark:bg-[#0f0f10]"
                }`}
              >
                {categoryLabel[c]}
              </button>
            );
          })}
        </div>
        {category === "syllabus" ? (
          <p className="mt-2 text-[12px] text-muted">
            Coursely will parse it into topics and deadlines automatically.
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-dashed border-hairline bg-paper p-3 dark:bg-[#0f0f10]">
          <UploadDropzone
            endpoint="courseMaterial"
            disabled={
              uploadState === "uploading" ||
              uploadState === "saving" ||
              !!pendingUpload
            }
            onUploadBegin={() => {
              setError(null);
              setPendingUpload(null);
              setUploadState("uploading");
            }}
            onUploadError={(err) => {
              setError(err.message || "Upload failed.");
              setUploadState("idle");
            }}
            onClientUploadComplete={(res) => {
              const file = res[0];
              if (!file) {
                setError("Upload returned no file.");
                setUploadState("idle");
                return;
              }
              const upload: PendingUpload = {
                name: file.name,
                url: file.serverData.url,
                type: file.serverData.type,
                size: file.serverData.size,
              };
              const shouldPrompt =
                /syllab/i.test(upload.name) && category !== "syllabus";
              if (shouldPrompt) {
                setPendingUpload(upload);
                setUploadState("idle");
                return;
              }
              saveUpload(upload, category);
            }}
            appearance={{
              container:
                "border-none bg-transparent p-4 focus-within:outline-none",
              label: "text-ink text-[13.5px] font-medium",
              allowedContent: "text-muted text-[11.5px]",
              button:
                "bg-accent text-white rounded-md px-3 py-1.5 text-[12.5px] font-medium hover:bg-[#2e3fef] focus:outline-none focus:ring-2 focus:ring-accent/40 ut-uploading:bg-accent/70 after:bg-accent/50",
            }}
            content={{
              uploadIcon: (
                <UploadCloud
                  size={20}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="text-accent"
                />
              ),
              label: "Drop a file, or click to browse.",
              allowedContent: "PDF, image, or text — up to 32 MB.",
            }}
          />
        </div>

        {filenameSuggestsSyllabus ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-accent/25 bg-accent/[0.06] px-3 py-2">
            <Sparkles
              size={12}
              strokeWidth={2}
              className="shrink-0 text-accent"
              aria-hidden="true"
            />
            <p className="min-w-0 flex-1 text-[12.5px] text-ink">
              This looks like a syllabus. Tag it as{" "}
              <span className="font-medium">syllabus</span>?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={acceptSuggestion}
                className="rounded-md bg-accent px-3 py-1 text-[12px] font-medium text-white hover:bg-[#2e3fef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={keepChoice}
                className="rounded-md border border-hairline px-3 py-1 text-[12px] font-medium text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Keep {categoryLabel[category].toLowerCase()}
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-md border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        {uploadState === "saving" ? (
          <p className="mt-3 text-[12px] italic text-muted">Saving…</p>
        ) : null}

        {syllabusStatus === "parsed" && category === "syllabus" ? (
          <p className="mt-3 text-[11.5px] italic text-muted">
            Uploading another syllabus will re-parse and add to your timeline.
          </p>
        ) : null}
      </div>

      {materials.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => (
            <MaterialCard
              key={m.id}
              material={m}
              onPreview={() => setPreviewMaterial(m)}
            />
          ))}
        </ul>
      ) : null}

      <MaterialPreviewModal
        material={
          previewMaterial
            ? ({
                id: previewMaterial.id,
                name: previewMaterial.name,
                url: previewMaterial.url,
                fileType: previewMaterial.fileType,
                fileCategory: previewMaterial.fileCategory,
                fileSize: previewMaterial.fileSize,
                courseName,
                courseId,
                uploadedAt: previewMaterial.uploadedAt,
                syllabusHasParsedContent:
                  previewMaterial.fileCategory === "syllabus" &&
                  syllabusStatus === "parsed",
              } satisfies MaterialPreview)
            : null
        }
        onClose={() => setPreviewMaterial(null)}
      />
    </section>
  );
}

function MaterialCard({
  material,
  onPreview,
}: {
  material: Material;
  onPreview: () => void;
}) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          const el = e.target as HTMLElement;
          if (el.closest("button, a")) return;
          onPreview();
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPreview();
          }
        }}
        aria-label={`Preview ${material.name}`}
        className="group relative flex h-full cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-white p-4 transition-colors hover:border-ink/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414] dark:hover:border-white/25"
      >
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/[0.10] text-accent">
          <FileTypeIcon fileType={material.fileType} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">
            {material.name}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {categoryLabel[material.fileCategory as FileCategory] ?? "File"} ·{" "}
            {formatSize(material.fileSize)} · {formatDate(material.uploadedAt)}
          </p>
        </div>
      </div>
    </li>
  );
}

function FileTypeIcon({ fileType }: { fileType: string }) {
  if (fileType.includes("pdf") || fileType.startsWith("text/")) {
    return <FileText size={16} strokeWidth={1.75} />;
  }
  if (fileType.startsWith("image/")) {
    return <ImageIcon size={16} strokeWidth={1.75} />;
  }
  if (
    fileType.includes("presentation") ||
    fileType.includes("powerpoint") ||
    fileType.includes("keynote")
  ) {
    return <Presentation size={16} strokeWidth={1.75} />;
  }
  return <FileIcon size={16} strokeWidth={1.75} />;
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
