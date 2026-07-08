import Link from "next/link";

type WordmarkProps = {
  href?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Mark + wordmark pair. Mark = two rounded rectangles offset diagonally,
 * echoing the course-card motif. When `href` is set, renders a Link.
 */
export function Wordmark({ href, size = "md", className = "" }: WordmarkProps) {
  const dims = size === "sm" ? 18 : 20;
  const textCls =
    size === "sm"
      ? "text-[16px] font-medium tracking-tight text-ink"
      : "text-[18px] font-medium tracking-tight text-ink";

  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={dims} />
      <span className={textCls}>Coursely</span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="Coursely — home"
      className="inline-flex items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      {content}
    </Link>
  );
}

function Mark({ size }: { size: number }) {
  // `text-accent` resolves via CSS var — auto-swaps to #5A6BFF in dark mode.
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      {/* Back card — 60% opacity, rotated -8° around its center, offset up-left */}
      <rect
        x="2.5"
        y="2"
        width="9"
        height="11"
        rx="2"
        fill="currentColor"
        opacity="0.6"
        transform="rotate(-8 7 7.5)"
      />
      {/* Front card — solid, rotated +6° around its center, offset down-right, slightly larger */}
      <rect
        x="7"
        y="5"
        width="11"
        height="13"
        rx="2"
        fill="currentColor"
        transform="rotate(6 12.5 11.5)"
        style={{ filter: "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.18))" }}
      />
    </svg>
  );
}
