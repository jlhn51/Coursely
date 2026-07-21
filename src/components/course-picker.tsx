"use client";

import type { Course } from "@/db/schema";

export type CourseOption = Pick<Course, "id" | "name">;

export function CoursePicker({
  courses,
  value,
  onChange,
  label = "Course",
  autoFocus,
}: {
  courses: CourseOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-ink">
        {label}
        <span aria-hidden="true" className="ml-1 text-accent">
          *
        </span>
      </span>
      <select
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
      >
        <option value="" disabled>
          Select a course…
        </option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
