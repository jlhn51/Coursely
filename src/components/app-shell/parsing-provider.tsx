"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  getActiveParsingStatuses,
  type ParsingStatusRow,
} from "@/actions/parsing-status";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // stop polling after 5 minutes idle

type Ctx = {
  parsing: ParsingStatusRow[];
  triggerPoll: () => void; // called after an upload to start polling immediately
};

const ParsingContext = createContext<Ctx>({
  parsing: [],
  triggerPoll: () => {},
});

export function useParsingStatus() {
  return useContext(ParsingContext);
}

export function ParsingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<ParsingStatusRow[]>([]);
  const prevStatuses = useRef<Map<string, ParsingStatusRow>>(new Map());
  const pollingUntil = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const rows = await getActiveParsingStatuses();
      const currentMap = new Map(prevStatuses.current);

      // Detect status transitions and fire toasts.
      for (const row of rows) {
        const prev = currentMap.get(row.courseId);
        if (prev?.status === "parsing" && row.status === "parsed") {
          toast.success(`${row.courseName} syllabus parsed`, {
            description: `Found ${row.topicCount} topic${row.topicCount === 1 ? "" : "s"} and ${row.taskCount} deadline${row.taskCount === 1 ? "" : "s"}.`,
            duration: 6000,
            action: {
              label: "View timeline",
              onClick: () => {
                router.push(`/courses/${row.courseId}#timeline`);
              },
            },
          });
          router.refresh();
        } else if (prev?.status === "parsing" && row.status === "failed") {
          toast.error(`Couldn't parse ${row.courseName} syllabus.`, {
            duration: 8000,
            description: humanFailedReason(row.failedReason),
            action: {
              label: "View details",
              onClick: () => {
                router.push(`/courses/${row.courseId}`);
              },
            },
          });
          router.refresh();
        }
      }
      prevStatuses.current = new Map(rows.map((r) => [r.courseId, r]));

      // Only surface "parsing" rows in the pill; parsed/failed are used for
      // transition detection above.
      const activeParsing = rows.filter((r) => r.status === "parsing");
      setStatuses(activeParsing);

      // Stop polling if idle long enough with no parsing rows.
      if (activeParsing.length === 0 && Date.now() > pollingUntil.current) {
        if (timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      }
    } catch (err) {
      console.error("[parsing-provider] poll failed", err);
    }
  }, [router]);

  const triggerPoll = useCallback(() => {
    pollingUntil.current = Date.now() + POLL_TIMEOUT_MS;
    if (!timer.current) {
      timer.current = setInterval(poll, POLL_INTERVAL_MS);
    }
    void poll();
  }, [poll]);

  // Kick a first poll on mount so any course already parsing (e.g. after a
  // page reload mid-parse) surfaces in the pill. Scheduled via microtask so
  // React doesn't see synchronous setState inside the effect body.
  useEffect(() => {
    const cancel = { done: false };
    queueMicrotask(() => {
      if (!cancel.done) triggerPoll();
    });
    return () => {
      cancel.done = true;
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ParsingContext.Provider value={{ parsing: statuses, triggerPoll }}>
      {children}
    </ParsingContext.Provider>
  );
}

export function ParsingPill() {
  const { parsing } = useParsingStatus();
  if (parsing.length === 0) return null;
  const first = parsing[0]!;
  const extra = parsing.length - 1;
  return (
    <Link
      href={`/courses/${first.courseId}`}
      className="hidden items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11.5px] font-medium text-accent transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
      title={`Parsing ${first.courseName} syllabus`}
    >
      <Loader2
        size={11}
        strokeWidth={2.5}
        className="animate-spin"
        aria-hidden="true"
      />
      <span className="max-w-[140px] truncate">
        Parsing {first.courseName} syllabus…
      </span>
      {extra > 0 ? (
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px]">
          +{extra}
        </span>
      ) : null}
    </Link>
  );
}

function humanFailedReason(reason: string | null): string {
  switch (reason) {
    case "scanned":
      return "This PDF appears to be scanned. Try a text-based version.";
    case "no_content_extracted":
      return "We couldn't find any topics or deadlines to extract.";
    case "invalid_json":
    case "schema_mismatch":
    case "refused":
      return "The syllabus format wasn't recognized.";
    default:
      return "Something went wrong on our end. Try again in a moment.";
  }
}
