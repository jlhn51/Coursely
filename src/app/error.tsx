"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// Root-level error boundary for public/marketing routes. The (app) group has
// its own error.tsx so authenticated errors don't fall all the way up here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline text-red-600 dark:text-red-400"
      >
        <AlertTriangle size={20} strokeWidth={1.75} />
      </span>
      <h1 className="mt-6 font-serif text-[36px] leading-[1.05] text-ink md:text-[48px]">
        Something broke.
      </h1>
      <p className="mt-4 max-w-md text-[15.5px] leading-[1.55] text-muted">
        Please try again. If the page keeps failing, let us know.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11.5px] text-muted">
          Error ID: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2e3fef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
        >
          <RefreshCcw size={13} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
