"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Reusable dropdown that keeps every option fully legible in dark mode —
// native <select> options inherit browser chrome and render at low
// opacity in dark themes on Chromium. This component uses our own tokens
// (bg-paper / text-ink / bg-hairline for hover / bg-accent tint for
// selected) so both themes look right by construction.

export type ThemeSelectOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

export function ThemeSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  triggerClassName,
  align = "left",
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<ThemeSelectOption<T>>;
  label: string;
  className?: string;
  triggerClassName?: string;
  // Whether the menu edge-aligns to the left or right of the trigger.
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    // Recompute placement on open + on scroll/resize so the menu tracks.
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    // Delay one microtask so the click that opened us doesn't close us.
    const timer = setTimeout(
      () => document.addEventListener("mousedown", onDocClick),
      0,
    );
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
      clearTimeout(timer);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          "flex w-full items-center justify-between gap-2 rounded-md border border-hairline bg-paper px-3 py-2 text-[13.5px] text-ink transition-colors hover:border-ink/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-[#0f0f0f]"
        }
      >
        <span className="min-w-0 truncate text-left">
          {selected?.label ?? "Select…"}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          aria-hidden="true"
          className={`shrink-0 opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              id={listboxId}
              aria-label={label}
              style={{
                position: "fixed",
                top: rect.top,
                left:
                  align === "right"
                    ? Math.max(8, rect.left + rect.width - 240)
                    : rect.left,
                minWidth: Math.max(rect.width, 200),
                zIndex: 1200,
              }}
              className="max-h-72 overflow-y-auto rounded-md border border-hairline bg-paper p-1 shadow-[0_20px_50px_-20px_rgb(10_10_10_/_0.45)] dark:bg-[#141414]"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors ${
                      isSelected
                        ? "bg-accent/12 text-accent hover:bg-accent/20"
                        : "hover:bg-ink/[0.06] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <Check
                          size={12}
                          strokeWidth={2.5}
                          className="text-accent"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint ? (
                        <span className="truncate text-[11.5px] text-muted">
                          {opt.hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
