"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Theme toggle. State lives on the <html> class (set pre-hydration
 * by the inline script in layout.tsx). Both icons are rendered and
 * toggled by CSS via the `dark:` variant, so there's no React state
 * and no hydration mismatch.
 */
export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* localStorage unavailable — silently ignore. */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.06]"
    >
      <Sun
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="hidden dark:block"
      />
      <Moon
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="block dark:hidden"
      />
    </button>
  );
}
