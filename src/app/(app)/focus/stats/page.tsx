import { auth } from "@clerk/nextjs/server";
import { Timer } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  type FocusSessionRow,
  getFocusSessionsSince,
} from "@/actions/focus";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FocusStatsClient } from "./stats-client";

export default async function FocusStatsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // 30-day chart window; monthly totals need this whole window anyway.
  const since = new Date();
  since.setDate(since.getDate() - 60);
  since.setHours(0, 0, 0, 0);
  const sessions = await getFocusSessionsSince(since);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const monthStart = new Date(today);
  monthStart.setDate(today.getDate() - 29);

  const totalsToday = sumWork(sessions, today, endOfDay(today));
  const totalsWeek = sumWork(sessions, weekStart, endOfDay(today));
  const totalsMonth = sumWork(sessions, monthStart, endOfDay(today));

  const daily = buildDailyBuckets(sessions, today, 30);
  const byCourse = buildCourseBreakdown(sessions, weekStart, endOfDay(today));
  const streak = computeStreak(sessions, today);

  const recent = sessions
    .filter((s) => s.totalWorkSeconds > 0)
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      startedAt: s.startedAt.toISOString(),
      totalWorkSeconds: s.totalWorkSeconds,
      completedCycles: s.completedCycles,
      plannedCycles: s.plannedCycles,
      status: s.status,
      courseName: s.courseName,
      taskTitle: s.taskTitle,
    }));

  // "Enough data" for the 30-day chart = at least one session on 7 or
  // more distinct days. Users just starting out see an editorial nudge
  // instead of a mostly-empty bar chart.
  const distinctDaysWithFocus = new Set(
    sessions
      .filter((s) => s.totalWorkSeconds > 0)
      .map((s) =>
        `${s.startedAt.getFullYear()}-${s.startedAt.getMonth()}-${s.startedAt.getDate()}`,
      ),
  ).size;
  const hasEnoughForChart = distinctDaysWithFocus >= 7;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-14">
      <Breadcrumbs
        items={[{ label: "Focus mode", href: "/focus" }, { label: "Stats" }]}
      />
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
            Focus stats
          </p>
          <h1 className="mt-2 font-serif text-[44px] leading-[1.05] text-ink md:text-[56px]">
            The <em className="italic text-accent">rhythm</em> of your work.
          </h1>
        </div>
        <Link
          href="/focus"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2e3fef] dark:hover:bg-[#6a7bff]"
        >
          <Timer size={14} strokeWidth={2} aria-hidden="true" />
          Start focus session
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Today" value={formatHM(totalsToday)} />
        <StatCard label="This week" value={formatHM(totalsWeek)} />
        <StatCard label="Last 30 days" value={formatHM(totalsMonth)} />
        <StatCard
          label="Streak"
          value={`${streak} day${streak === 1 ? "" : "s"}`}
        />
      </div>

      <FocusStatsClient
        daily={daily}
        byCourse={byCourse}
        hasEnoughForChart={hasEnoughForChart}
      />

      <section className="mt-10">
        <h2 className="font-serif text-[24px] leading-tight text-ink">
          Recent sessions
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-hairline bg-white p-6 text-[13.5px] text-muted dark:bg-[#141414]">
            No focus sessions yet.{" "}
            <Link
              href="/focus"
              className="font-medium text-accent hover:opacity-80"
            >
              Start one →
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white dark:bg-[#141414]">
            {recent.map((s) => {
              // Row title logic: task > course > generic. Never "Untagged".
              const rowTitle =
                s.taskTitle ?? s.courseName ?? "Focus session";
              // Subline: show the course only when it's not already the
              // row title, and only when there's actually a course.
              const showCourseSub =
                Boolean(s.courseName) && s.courseName !== rowTitle;
              const statusLabel =
                s.status === "abandoned" ? "stopped early" : s.status;
              return (
                <li
                  key={s.id}
                  className="grid grid-cols-1 items-center gap-2 px-5 py-4 md:grid-cols-[110px_1fr_120px_120px]"
                >
                  <span className="text-[12px] text-muted">
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {rowTitle}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted">
                      {showCourseSub ? `${s.courseName} · ` : ""}
                      {s.completedCycles}/{s.plannedCycles} cycles
                    </p>
                  </div>
                  <span className="text-[12.5px] text-muted">
                    {formatHM(s.totalWorkSeconds)}
                  </span>
                  <span
                    className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.12em] ${
                      s.status === "completed"
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : s.status === "abandoned"
                          ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-hairline text-muted"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414]">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-3 font-serif text-[36px] leading-none text-ink">
        {value}
      </p>
    </div>
  );
}

function sumWork(sessions: FocusSessionRow[], from: Date, to: Date): number {
  return sessions
    .filter((s) => s.startedAt >= from && s.startedAt <= to)
    .reduce((acc, s) => acc + s.totalWorkSeconds, 0);
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function buildDailyBuckets(
  sessions: FocusSessionRow[],
  today: Date,
  days: number,
): Array<{ date: string; minutes: number }> {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.set(dateKey(d), 0);
  }
  for (const s of sessions) {
    const key = dateKey(startOfLocalDay(s.startedAt));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + s.totalWorkSeconds);
    }
  }
  return Array.from(buckets.entries()).map(([date, sec]) => ({
    date,
    minutes: Math.round(sec / 60),
  }));
}

function buildCourseBreakdown(
  sessions: FocusSessionRow[],
  from: Date,
  to: Date,
): Array<{ course: string; minutes: number }> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (s.startedAt < from || s.startedAt > to) continue;
    if (s.totalWorkSeconds <= 0) continue;
    const key = s.courseName ?? "Untagged";
    totals.set(key, (totals.get(key) ?? 0) + s.totalWorkSeconds);
  }
  return Array.from(totals.entries())
    .map(([course, sec]) => ({ course, minutes: Math.round(sec / 60) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6);
}

function computeStreak(sessions: FocusSessionRow[], today: Date): number {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.totalWorkSeconds <= 60) continue;
    days.add(dateKey(startOfLocalDay(s.startedAt)));
  }
  let streak = 0;
  const cursor = new Date(today);
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatHM(sec: number): string {
  if (sec <= 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
