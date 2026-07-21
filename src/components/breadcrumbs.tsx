import Link from "next/link";

// A single trail rendered above page titles. `items` is ordered root → current;
// the last item is treated as the active page and rendered in ink without a
// link.
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span aria-hidden="true" className="text-muted/60">
                  /
                </span>
              ) : null}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "font-medium text-ink"
                      : "text-muted"
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
