"use client";

import { X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, handleClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 pt-[10vh] sm:p-6"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleClose}
        className="fixed inset-0 bg-black/45 backdrop-blur-sm"
      />
      <div
        className={`relative z-10 w-full rounded-2xl border border-hairline bg-white shadow-[0_30px_80px_-24px_rgb(10_10_10_/_0.35)] dark:bg-[#141414] ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
          <div>
            {eyebrow ? (
              <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-1 font-serif text-[26px] leading-tight text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:bg-white/[0.05]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
