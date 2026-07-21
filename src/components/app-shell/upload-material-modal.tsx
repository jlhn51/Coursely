"use client";

import { UploadCloud } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMaterial } from "@/actions/materials";
import { parseSyllabus } from "@/actions/syllabus";
import { useParsingStatus } from "@/components/app-shell/parsing-provider";
import { CoursePicker, type CourseOption } from "@/components/course-picker";
import { Modal } from "@/components/modal";
import { FILE_CATEGORIES, type FileCategory } from "@/lib/file-categories";
import { UploadDropzone } from "@/lib/uploadthing";
import {
  getRedirectAfterSyllabus,
  setRedirectAfterSyllabus,
} from "@/lib/upload-prefs";

const categoryLabel: Record<FileCategory, string> = {
  syllabus: "Syllabus",
  slides: "Slides",
  notes: "Notes",
  other: "Other",
};

export function UploadMaterialModal({
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
  const { triggerPoll } = useParsingStatus();
  const [courseId, setCourseId] = useState(
    defaultCourseId ?? courses[0]?.id ?? "",
  );
  const [category, setCategory] = useState<FileCategory>("other");
  const [redirectPref, setRedirectPref] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "saving" | "parsing" | "done"
  >("idle");
  const [, startTransition] = useTransition();

  // Read the persisted redirect preference on modal open.
  const [prefReady, setPrefReady] = useState(false);
  if (!prefReady && typeof window !== "undefined") {
    setRedirectPref(getRedirectAfterSyllabus());
    setPrefReady(true);
  }

  function close() {
    setError(null);
    setStatus("idle");
    onClose();
  }

  const courseName = courses.find((c) => c.id === courseId)?.name ?? "the course";

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload material"
      eyebrow="Add file"
      wide
    >
      <div className="space-y-5">
        <CoursePicker
          courses={courses}
          value={courseId}
          onChange={setCourseId}
          autoFocus
        />

        <div>
          <span className="text-[13px] font-medium text-ink">
            File type
            <span aria-hidden="true" className="ml-1 text-accent">
              *
            </span>
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
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
                      : "border-hairline bg-white text-muted hover:text-ink dark:bg-[#141414]"
                  }`}
                >
                  {categoryLabel[c]}
                </button>
              );
            })}
          </div>
          {category === "syllabus" ? (
            <div className="mt-2 space-y-2">
              <p className="text-[12px] text-muted">
                We&apos;ll parse it into topics and deadlines automatically.
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink">
                <input
                  type="checkbox"
                  checked={redirectPref}
                  onChange={(e) => {
                    setRedirectPref(e.target.checked);
                    setRedirectAfterSyllabus(e.target.checked);
                  }}
                  className="h-3.5 w-3.5 rounded border-hairline text-accent focus:ring-accent"
                />
                Take me to the course after uploading a syllabus
              </label>
            </div>
          ) : null}
        </div>

        {courseId ? (
          <div>
            <span className="text-[13px] font-medium text-ink">File</span>
            <div className="mt-2 rounded-2xl border border-dashed border-hairline bg-paper p-3 dark:bg-[#0f0f10]">
              <UploadDropzone
                endpoint="courseMaterial"
                disabled={status === "uploading" || status === "saving"}
                onUploadBegin={() => {
                  setError(null);
                  setStatus("uploading");
                }}
                onUploadError={(err) => {
                  setError(err.message || "Upload failed.");
                  toast.error("Upload failed", {
                    description: err.message,
                  });
                  setStatus("idle");
                }}
                onClientUploadComplete={async (res) => {
                  const file = res[0];
                  if (!file) {
                    setError("Upload returned no file.");
                    setStatus("idle");
                    return;
                  }
                  setStatus("saving");
                  const result = await createMaterial({
                    courseId,
                    name: file.name,
                    url: file.serverData.url,
                    fileType: file.serverData.type,
                    fileSize: file.serverData.size,
                    fileCategory: category,
                  });
                  if (!result.success) {
                    setError(result.error);
                    toast.error("Couldn't save material", {
                      description: result.error,
                    });
                    setStatus("idle");
                    return;
                  }
                  const materialId = result.materialId;

                  if (category === "syllabus") {
                    // Fire the "uploaded, parsing" toast BEFORE kicking parse
                    // so users always see it — including when they navigate
                    // away mid-parse.
                    toast(`Syllabus uploaded — parsing…`, {
                      description:
                        "We'll notify you when it's ready.",
                      action: {
                        label: "View course",
                        onClick: () => {
                          router.push(
                            `/courses/${courseId}?justUploaded=1#materials`,
                          );
                        },
                      },
                    });
                    setStatus("parsing");
                    triggerPoll();
                    // Auto-redirect if the user opted in — do this BEFORE the
                    // parse promise resolves so they land on the course page
                    // and watch it happen live.
                    if (redirectPref) {
                      router.push(
                        `/courses/${courseId}?justUploaded=1#materials`,
                      );
                    }
                    startTransition(async () => {
                      await parseSyllabus({
                        courseId,
                        fileUrl: file.serverData.url,
                        materialId,
                      });
                      // Completion toast fires from ParsingProvider polling —
                      // no need to duplicate here.
                      setStatus("done");
                      router.refresh();
                      close();
                    });
                  } else {
                    toast.success(`${categoryLabel[category]} uploaded to ${courseName}`);
                    setStatus("done");
                    router.refresh();
                    close();
                  }
                }}
                appearance={{
                  container:
                    "border-none bg-transparent p-4 focus-within:outline-none",
                  label: "text-ink text-[14px] font-medium",
                  allowedContent: "text-muted text-[11.5px]",
                  button:
                    "bg-accent text-white rounded-md px-3 py-1.5 text-[13px] font-medium hover:bg-[#2e3fef] focus:outline-none focus:ring-2 focus:ring-accent/40 ut-uploading:bg-accent/70 after:bg-accent/50",
                }}
                content={{
                  uploadIcon: (
                    <UploadCloud
                      size={22}
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
          </div>
        ) : (
          <p className="rounded-md border border-hairline bg-paper px-3 py-2 text-[13px] text-muted dark:bg-[#0f0f10]">
            Pick a course first.
          </p>
        )}

        {status === "saving" ? (
          <p className="text-[13px] text-muted">Saving…</p>
        ) : null}
        {status === "parsing" ? (
          <p className="text-[13px] text-accent">
            Parsing your syllabus…
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[13px] text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end border-t border-hairline pt-4">
          <button
            type="button"
            onClick={close}
            className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
