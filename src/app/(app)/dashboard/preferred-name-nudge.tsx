"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "coursely:nudge:preferred-name";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener("nudge:dismiss", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("nudge:dismiss", handler);
  };
}

export function PreferredNameNudge({ firstName }: { firstName: string }) {
  // Hydration-safe: server render says "not dismissed", client reads real
  // localStorage after mount.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);
  const [localHidden, setLocalHidden] = useState(false);

  if (dismissed || localHidden) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-white/60 px-4 py-3 dark:bg-white/[0.03]">
      <p className="min-w-0 flex-1 text-[13px] text-muted">
        We&apos;re greeting you as{" "}
        <span className="font-medium text-ink">{firstName}</span>. Prefer
        something else?{" "}
        <Link
          href="/settings"
          className="font-medium text-accent hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Set your preferred name in Settings.
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(STORAGE_KEY, "1");
            window.dispatchEvent(new Event("nudge:dismiss"));
          } catch {
            /* silent */
          }
          setLocalHidden(true);
        }}
        aria-label="Dismiss"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
      >
        <X size={12} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
