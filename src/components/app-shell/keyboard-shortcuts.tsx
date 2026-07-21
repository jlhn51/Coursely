"use client";

import { Command, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Shortcut = { keys: string[]; label: string };

const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "Navigation",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["⌘", "\\"], label: "Toggle sidebar" },
      { keys: ["⌘", "/"], label: "Show these shortcuts" },
    ],
  },
  {
    group: "Tasks",
    items: [
      { keys: ["Enter"], label: "Open focused task" },
      { keys: ["Space"], label: "Toggle complete" },
      { keys: ["Delete"], label: "Delete focused task" },
    ],
  },
  {
    group: "Dialogs",
    items: [
      { keys: ["⌘", "Enter"], label: "Submit form" },
      { keys: ["Esc"], label: "Close modal or drawer" },
    ],
  },
];

// Global listener + modal. Rendered once at the (app) layout root so every
// signed-in page can trigger it. Public routes don't mount it.
export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / — support the raw "/" key and the "?" (shift+/) form
      // some browsers send.
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === "/" || e.key === "?")
      ) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_30px_80px_-24px_rgb(10_10_10_/_0.35)] dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              <Command
                size={11}
                strokeWidth={2}
                className="mr-1 inline-block text-accent"
                aria-hidden="true"
              />
              Shortcuts
            </p>
            <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <ul className="space-y-6">
            {SHORTCUTS.map((section) => (
              <li key={section.group}>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                  {section.group}
                </p>
                <ul className="mt-3 space-y-2">
                  {section.items.map((sc) => (
                    <li
                      key={sc.label}
                      className="flex items-center justify-between gap-3 text-[13.5px] text-ink"
                    >
                      <span>{sc.label}</span>
                      <span className="flex items-center gap-1">
                        {sc.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-hairline bg-paper px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted dark:bg-[#0f0f10]"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
