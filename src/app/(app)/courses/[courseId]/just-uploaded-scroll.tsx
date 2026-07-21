"use client";

import { useEffect, useRef } from "react";

// When the user lands on the course page via `?justUploaded=1`, scroll to
// the timeline as soon as it exists (which may be after the parse completes)
// and flash an accent ring on it for 3s. Runs at most once per page load.
//
// Reads the flag from window.location instead of useSearchParams() to avoid
// the Suspense-boundary requirement — this component is used deep in a server
// tree and returns null.
export function JustUploadedScroll({ status }: { status: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (typeof window === "undefined") return;
    const flag = new URLSearchParams(window.location.search).get("justUploaded");
    if (flag !== "1") return;
    if (status !== "parsed") return;

    const el = document.querySelector<HTMLElement>(
      "[data-timeline-section]",
    );
    if (!el) return;
    fired.current = true;

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("timeline-highlight");
    const t = setTimeout(() => {
      el.classList.remove("timeline-highlight");
    }, 3000);
    return () => clearTimeout(t);
  }, [status]);

  return null;
}
