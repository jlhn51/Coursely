"use client";

import {
  AlertTriangle,
  ArrowRight,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { parseSyllabus } from "@/actions/syllabus";

type SyllabusRef = {
  id: string;
  url: string;
} | null;

// Human copy for each machine reason the action can persist. Ordered by
// stage: input → PDF → LLM → post-parse.
function failedCopy(reason: string | null): {
  title: string;
  body: string;
  tone: "scanned" | "content" | "format" | "generic";
} {
  switch (reason) {
    case "scanned":
      return {
        title: "This looks like a scan.",
        body: "This PDF appears to be scanned. Try uploading a text-based version, or add topics manually below.",
        tone: "scanned",
      };
    case "no_content_extracted":
      return {
        title: "Nothing structured to pull out.",
        body: "We couldn't find any topics or deadlines in this syllabus. Try re-uploading or add them manually.",
        tone: "content",
      };
    case "invalid_json":
    case "schema_mismatch":
    case "refused":
      return {
        title: "Unrecognized format.",
        body: "The syllabus format wasn't recognized. Try re-uploading, or add topics manually.",
        tone: "format",
      };
    default:
      return {
        title: "We couldn't read this syllabus.",
        body: "Something went wrong on our end. Try again in a moment.",
        tone: "generic",
      };
  }
}

export function SyllabusBanner({
  courseId,
  status,
  failedReason,
  syllabus,
  topicCount,
  taskCount,
}: {
  courseId: string;
  status: string;
  failedReason: string | null;
  syllabus: SyllabusRef;
  topicCount: number;
  taskCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  // Poll while parsing. Cap at 60s so a wedged parse doesn't spin forever.
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (status !== "parsing") {
      startedAtRef.current = null;
      return;
    }
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      if (elapsed > 60_000) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [status, router]);

  // One-shot toast on the parsing → parsed transition.
  const prevStatusRef = useRef(status);
  const [toast, setToast] = useState<{
    topicCount: number;
    taskCount: number;
  } | null>(null);
  useEffect(() => {
    if (prevStatusRef.current === "parsing" && status === "parsed") {
      setToast({ topicCount, taskCount });
    }
    prevStatusRef.current = status;
  }, [status, topicCount, taskCount]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  function onRetry() {
    if (!syllabus) return;
    setRetryError(null);
    startTransition(async () => {
      const r = await parseSyllabus({
        courseId,
        fileUrl: syllabus.url,
        materialId: syllabus.id,
      });
      if ("error" in r && r.error) setRetryError(r.error);
      router.refresh();
    });
  }

  const copy = failedCopy(failedReason);

  return (
    <>
      {status === "parsing" ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-8 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.08] p-5"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
          >
            <Sparkles size={16} strokeWidth={2} className="animate-pulse" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[20px] leading-tight text-ink">
              Reading your <em className="italic text-accent">syllabus…</em>
            </p>
            <p className="mt-1 text-[13px] text-muted">
              This usually takes 10–20 seconds.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-accent/15 sm:block"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
          </div>
        </div>
      ) : null}

      {status === "failed" ? (
        <div
          role="alert"
          className="mt-8 flex flex-wrap items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400"
          >
            <AlertTriangle size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[20px] leading-tight text-ink">
              {copy.title}
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-muted">
              {copy.body}
            </p>
            {retryError ? (
              <p className="mt-2 text-[12px] text-red-600 dark:text-red-400">
                {retryError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={pending || !syllabus}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-white px-3.5 py-2 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 dark:bg-[#141414] dark:text-red-400"
          >
            <RefreshCcw size={12} strokeWidth={2} aria-hidden="true" />
            {pending ? "Retrying…" : "Retry parse"}
          </button>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-accent/30 bg-white px-4 py-2.5 shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.35)] dark:bg-[#141414]"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles
              size={14}
              strokeWidth={2}
              className="text-accent"
              aria-hidden="true"
            />
            <p className="text-[13px] font-medium text-ink">
              Found {toast.topicCount} topic
              {toast.topicCount === 1 ? "" : "s"} and {toast.taskCount} deadline
              {toast.taskCount === 1 ? "" : "s"}.
            </p>
            <a
              href="#timeline"
              onClick={() => setToast(null)}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:opacity-80"
            >
              Review timeline
              <ArrowRight size={11} strokeWidth={2.5} aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
