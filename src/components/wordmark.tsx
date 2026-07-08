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
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      {/* Back card — slightly translucent, offset up-left */}
      <rect
        x="1"
        y="0"
        width="12"
        height="14"
        rx="2.5"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Front card — solid, offset down-right, with a soft drop shadow */}
      <rect
        x="7"
        y="6"
        width="12"
        height="14"
        rx="2.5"
        fill="currentColor"
        style={{ filter: "drop-shadow(0 1px 2px rgb(59 76 255 / 0.35))" }}
      />
    </svg>
  );
}
