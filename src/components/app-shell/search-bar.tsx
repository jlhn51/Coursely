"use client";

import { Search } from "lucide-react";
import { useSyncExternalStore } from "react";

// The search bar is a *trigger* for the command palette — clicking it or
// hitting Cmd+K opens the palette. This keeps a single search surface.
function readPlatform(): boolean {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}
function subscribeNoop(): () => void {
  return () => {};
}
export function SearchBar() {
  // Hydration-safe: server renders "⌘K" as a neutral default, client swaps
  // to "Ctrl K" on non-Mac.
  const isMac = useSyncExternalStore(subscribeNoop, readPlatform, () => true);

  function openPalette() {
    window.dispatchEvent(new Event("palette:open"));
  }

  return (
    <button
      type="button"
      onClick={openPalette}
      className="relative flex w-full max-w-md items-center rounded-md border border-hairline bg-paper py-2 pl-9 pr-16 text-left text-[13px] text-muted transition-colors hover:border-ink/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#141414]"
      aria-label="Search or run a command"
    >
      <Search
        size={14}
        strokeWidth={2}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <span>Search courses, tasks, materials…</span>
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-hairline bg-white px-1.5 py-0.5 font-sans text-[10.5px] font-medium tracking-[0.08em] text-muted dark:bg-[#0f0f0f]"
      >
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
