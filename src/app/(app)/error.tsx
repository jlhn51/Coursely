"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// Route-segment error boundary. Every (app) page's server rendering can
// throw here; the fallback below replaces the crashed subtree without
// blowing up the shell.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console with a stable prefix so it's
    // easy to grep in support tickets.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-24 pt-24 text-center">
      <span
        aria-hidden="true"
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline text-red-600 dark:text-red-400"
      >
        <AlertTriangle size={20} strokeWidth={1.75} />
      </span>
      <h1 className="mt-6 font-serif text-[36px] leading-[1.05] text-ink md:text-[48px]">
        Something went wrong on this page.
      </h1>
      <p className="mt-4 max-w-md text-[15.5px] leading-[1.55] text-muted">
        The rest of the app is still fine. Try again — if it keeps happening,
        head back to the dashboard.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11.5px] text-muted">
          Error ID: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_10px_24px_-8px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
        >
          <RefreshCcw size={13} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-sm text-[13.5px] font-medium text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
