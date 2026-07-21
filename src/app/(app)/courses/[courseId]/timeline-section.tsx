import { ArrowRight, CalendarRange, Sparkles } from "lucide-react";
import type { Topic } from "@/db/schema";

export function TimelineSection({
  topics,
  syllabusTaskCount,
}: {
  topics: Topic[];
  syllabusTaskCount: number;
}) {
  if (topics.length === 0) return null;

  // Group by orderNumber; when orderNumber is null, bucket under "Unscheduled".
  const grouped = new Map<number, Topic[]>();
  const undated: Topic[] = [];
  for (const t of topics) {
    if (typeof t.orderNumber === "number") {
      const list = grouped.get(t.orderNumber);
      if (list) list.push(t);
      else grouped.set(t.orderNumber, [t]);
    } else {
      undated.push(t);
    }
  }
  const ordered = Array.from(grouped.keys()).sort((a, b) => a - b);

  // Most common label across the topic set — the axis this syllabus organizes
  // by. Falls back to "Week" for legacy rows.
  const dominantLabel = pickDominantLabel(topics) ?? "Week";

  return (
    <section
      id="timeline"
      className="mt-20 scroll-mt-20 md:mt-28"
      data-timeline-section=""
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-serif text-[32px] leading-[1.1] text-ink md:text-[40px]">
          Your <em className="italic text-accent">timeline.</em>
        </h2>
        <p className="text-[12.5px] text-muted">
          {topics.length} topic{topics.length === 1 ? "" : "s"} · by{" "}
          {dominantLabel.toLowerCase()}
        </p>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <Sparkles
          size={12}
          strokeWidth={2}
          className="text-accent"
          aria-hidden="true"
        />
        Found {topics.length} topic{topics.length === 1 ? "" : "s"} and{" "}
        {syllabusTaskCount} deadline{syllabusTaskCount === 1 ? "" : "s"} from
        your syllabus.
        <a
          href="#tasks"
          className="inline-flex items-center gap-1 text-accent hover:opacity-80"
        >
          Deadlines
          <ArrowRight size={11} strokeWidth={2.5} aria-hidden="true" />
        </a>
      </p>

      <ol className="mt-8 space-y-3">
        {ordered.map((n) => (
          <li
            key={n}
            className="grid grid-cols-1 gap-3 rounded-2xl border border-hairline bg-white p-5 sm:grid-cols-[130px_1fr] sm:gap-6 dark:bg-[#141414]"
          >
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                {grouped.get(n)![0]!.orderLabel ?? dominantLabel} {n}
              </p>
              {grouped.get(n)![0]!.date ? (
                <div className="mt-1 flex items-center gap-1.5 text-muted">
                  <CalendarRange
                    size={11}
                    strokeWidth={2}
                    className="text-accent"
                    aria-hidden="true"
                  />
                  <span className="text-[11.5px]">
                    {formatDate(grouped.get(n)![0]!.date as Date)}
                  </span>
                </div>
              ) : null}
            </div>
            <ul className="space-y-3">
              {grouped.get(n)!.map((t) => (
                <TopicItem key={t.id} topic={t} />
              ))}
            </ul>
          </li>
        ))}

        {undated.length > 0 ? (
          <li className="grid grid-cols-1 gap-3 rounded-2xl border border-hairline bg-white p-5 sm:grid-cols-[130px_1fr] sm:gap-6 dark:bg-[#141414]">
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                Unscheduled
              </p>
            </div>
            <ul className="space-y-3">
              {undated.map((t) => (
                <TopicItem key={t.id} topic={t} />
              ))}
            </ul>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

function TopicItem({ topic }: { topic: Topic }) {
  return (
    <li>
      <p className="font-serif text-[18px] leading-tight text-ink">
        {topic.title}
      </p>
      {topic.description ? (
        <p className="mt-1 text-[13px] leading-[1.55] text-muted">
          {topic.description}
        </p>
      ) : null}
    </li>
  );
}

function pickDominantLabel(topics: Topic[]): string | null {
  const counts = new Map<string, number>();
  for (const t of topics) {
    if (!t.orderLabel) continue;
    counts.set(t.orderLabel, (counts.get(t.orderLabel) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}
