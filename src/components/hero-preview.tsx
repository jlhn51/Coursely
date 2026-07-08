import { Sparkles } from "lucide-react";

const weeks = [
  { label: "Week 4 · Linear Regression", state: "done" as const, meta: "12 slides" },
  { label: "Week 5 · Neural nets, intro", state: "done" as const, meta: "18 slides" },
  { label: "Week 6 · Backpropagation", state: "current" as const, meta: "This week" },
  { label: "Week 7 · CNNs", state: "upcoming" as const, meta: "24 slides" },
  { label: "Week 8 · Regularization", state: "upcoming" as const, meta: "16 slides" },
];

const tasks = [
  { label: "PSet 4", due: "Due Fri", accent: true },
  { label: "Midterm", due: "Nov 12", accent: false },
  { label: "Final Project", due: "Dec 8", accent: false },
];

/**
 * Stylized product preview for the hero. Not an actual screenshot —
 * an HTML+Tailwind mockup of a course dashboard, rotated -2°, with an
 * overlapping "AI Tutor" reply bubble anchored to the bottom-right.
 */
export function HeroPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-[420px] pb-14 pr-4 sm:pr-8"
      role="img"
      aria-label="Preview of a Coursely course dashboard for CS 314 Machine Learning, showing weekly topics, upcoming deadlines, and an in-progress reply from the AI tutor."
    >
      {/* Main window */}
      <div className="rotate-[-2deg] overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_30px_60px_-15px_rgb(10_10_10_/_0.18)] dark:bg-[#0f0f10] dark:shadow-[0_30px_60px_-15px_rgb(0_0_0_/_0.6)]">
        {/* Chrome */}
        <div className="flex items-center gap-1.5 border-b border-hairline px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-hairline" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-hairline" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-hairline" aria-hidden="true" />
          <span className="ml-3 text-[11px] font-medium tracking-tight text-muted">
            coursely.app / cs-314
          </span>
        </div>

        {/* Body */}
        <div className="px-5 pb-6 pt-5">
          {/* Course header */}
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                Fall semester
              </p>
              <h3 className="mt-1 font-serif text-[22px] leading-tight text-ink">
                CS 314 · Machine Learning
              </h3>
            </div>
            <span className="rounded-full border border-hairline px-2 py-0.5 text-[10.5px] font-medium text-muted">
              12 wks
            </span>
          </div>

          {/* Weeks list */}
          <div className="mt-5">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-accent">
              This semester
            </p>
            <ul className="mt-3 space-y-2.5">
              {weeks.map((w) => (
                <li
                  key={w.label}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] ${
                    w.state === "current"
                      ? "bg-accent/[0.06] text-ink dark:bg-accent/[0.10]"
                      : "text-ink"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <WeekMarker state={w.state} />
                    <span
                      className={
                        w.state === "done"
                          ? "text-muted line-through decoration-hairline"
                          : ""
                      }
                    >
                      {w.label}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted">{w.meta}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Divider */}
          <div className="my-5 border-t border-hairline" />

          {/* Tasks */}
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-accent">
            Upcoming
          </p>
          <ul className="mt-3 space-y-2">
            {tasks.map((t) => (
              <li
                key={t.label}
                className="flex items-center justify-between px-2 text-[13px]"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      t.accent ? "bg-accent" : "bg-hairline"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-ink">{t.label}</span>
                </span>
                <span
                  className={`text-[11.5px] font-medium ${
                    t.accent ? "text-accent" : "text-muted"
                  }`}
                >
                  {t.due}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Tutor reply bubble — overlaps bottom-right */}
      <div
        className="absolute -bottom-2 right-0 w-[220px] rotate-[3deg] rounded-xl border border-hairline bg-white p-3.5 shadow-[0_18px_40px_-12px_rgb(10_10_10_/_0.22)] dark:bg-[#121214] dark:shadow-[0_18px_40px_-12px_rgb(0_0_0_/_0.7)] sm:-right-2 sm:w-[240px]"
        aria-hidden="true"
      >
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Sparkles size={11} strokeWidth={2} />
          </span>
          <span className="text-[11px] font-semibold tracking-tight text-ink">
            AI Tutor
          </span>
          <span className="ml-auto text-[10px] text-muted">now</span>
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-ink">
          The chain rule lets you compute{" "}
          <span className="text-muted">∂L/∂w</span> layer by layer
        </p>
        <div className="mt-2 inline-flex items-center gap-1">
          <span
            className="typing-dot h-1 w-1 rounded-full bg-muted"
            aria-hidden="true"
          />
          <span
            className="typing-dot h-1 w-1 rounded-full bg-muted"
            aria-hidden="true"
          />
          <span
            className="typing-dot h-1 w-1 rounded-full bg-muted"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2.5 border-t border-hairline pt-2 text-[10.5px] text-muted">
          <span className="font-medium text-accent">Cited:</span> Lecture 6 · slide 12
        </p>
      </div>
    </div>
  );
}

function WeekMarker({ state }: { state: "done" | "current" | "upcoming" }) {
  if (state === "done") {
    return (
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink/10 text-ink dark:bg-white/15"
        aria-hidden="true"
      >
        <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none">
          <path
            d="M2 5.2 L4.2 7.2 L8 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        aria-hidden="true"
        className="relative inline-flex h-3.5 w-3.5 items-center justify-center"
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="absolute inset-0 rounded-full ring-2 ring-accent/25" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-3.5 rounded-full border border-hairline"
    />
  );
}
