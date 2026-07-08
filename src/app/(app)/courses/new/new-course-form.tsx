"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCourse } from "@/actions/courses";

export function NewCourseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await createCourse({
            name: String(fd.get("name") ?? ""),
            professor: String(fd.get("professor") ?? ""),
            semester: String(fd.get("semester") ?? ""),
          });
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          router.push("/dashboard");
          router.refresh();
        });
      }}
      className="mt-10 rounded-2xl border border-hairline bg-white p-8 dark:bg-[#141414]"
    >
      <fieldset disabled={pending} className="space-y-6">
        <Field
          name="name"
          label="Course name"
          placeholder="CS 314 · Machine Learning"
          required
          autoFocus
        />
        <Field
          name="professor"
          label="Professor"
          placeholder="Dr. Chen"
          hint="Optional"
        />
        <Field
          name="semester"
          label="Semester"
          placeholder="Fall 2026"
          hint="Optional"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[13px] text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-4 border-t border-hairline pt-6">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:hover:bg-[#6a7bff]"
          >
            {pending ? "Creating…" : "Create course"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-sm text-[14px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Cancel
          </Link>
        </div>
      </fieldset>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
  hint,
  required,
  autoFocus,
}: {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-accent">
              *
            </span>
          ) : null}
        </span>
        {hint ? (
          <span className="text-[11.5px] text-muted">{hint}</span>
        ) : null}
      </span>
      <input
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className="mt-2 block w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-[14.5px] text-ink placeholder:text-muted/70 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 dark:bg-[#0f0f10]"
      />
    </label>
  );
}
