"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Client-only wrapper for the recharts visualizations. Kept minimal so the
// stats page stays server-rendered above the fold.

export function FocusStatsClient({
  daily,
  byCourse,
  hasEnoughForChart,
}: {
  daily: Array<{ date: string; minutes: number }>;
  byCourse: Array<{ course: string; minutes: number }>;
  hasEnoughForChart: boolean;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414] lg:col-span-2">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          Last 30 days
        </p>
        <p className="mt-1 text-[12.5px] text-muted">
          Minutes of focus per day.
        </p>
        {hasEnoughForChart ? (
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ left: 8, right: 8, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  strokeOpacity={0.12}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                  interval={4}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                  width={30}
                />
                <Tooltip
                  cursor={{ fillOpacity: 0.04 }}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--color-hairline)",
                    background: "var(--color-paper)",
                    color: "var(--color-ink)",
                  }}
                  formatter={(v) => [`${Number(v ?? 0)} min`, "Focus"]}
                />
                {/* minPointSize keeps 0-minute days visible as a hairline
                    so the axis reads "days with no focus" instead of "gap
                    in the data." */}
                <Bar
                  dataKey="minutes"
                  fill="var(--color-accent)"
                  radius={4}
                  minPointSize={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-5 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-hairline p-6 text-center">
            <p className="font-serif text-[22px] leading-tight text-ink">
              Focus more this week to see your rhythm build.
            </p>
            <p className="mt-2 max-w-xs text-[13px] text-muted">
              The 30-day chart appears once you&apos;ve focused on 7 different
              days.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-hairline bg-white p-5 dark:bg-[#141414]">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          By course · this week
        </p>
        {byCourse.length === 0 ? (
          <p className="mt-6 text-[13.5px] text-muted italic">
            Nothing tagged yet. Attach a course when you start.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {byCourse.map((c) => {
              const max = byCourse[0]?.minutes ?? 0;
              const pct = max > 0 ? (c.minutes / max) * 100 : 0;
              return (
                <li key={c.course}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {c.course}
                    </p>
                    <p className="text-[11.5px] text-muted">{c.minutes}m</p>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
