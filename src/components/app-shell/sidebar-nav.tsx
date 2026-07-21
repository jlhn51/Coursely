"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav";

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={`flex flex-col gap-6 py-5 ${collapsed ? "px-2" : "px-3"}`}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-hairline" aria-hidden="true" />
          ) : (
            <p className="px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              {group.label}
            </p>
          )}
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                !item.soon &&
                (pathname === item.href ||
                  pathname.startsWith(`${item.href}/`));

              const shared = `flex items-center rounded-md text-[13.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-3 py-2"
              }`;

              if (item.soon) {
                return (
                  <li key={item.href} className="relative group">
                    <span
                      aria-disabled="true"
                      title={collapsed ? `${item.label} — Soon` : undefined}
                      className={`${shared} cursor-not-allowed text-ink/60 opacity-70`}
                    >
                      <Icon
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="shrink-0"
                      />
                      {collapsed ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">
                            Soon
                          </span>
                        </>
                      )}
                    </span>
                    {collapsed ? <CollapsedTooltip label={item.label} soon /> : null}
                  </li>
                );
              }

              return (
                <li key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`${shared} ${
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-ink/85 hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    {collapsed ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                  {collapsed ? <CollapsedTooltip label={item.label} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function CollapsedTooltip({ label, soon }: { label: string; soon?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-40 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-hairline bg-white px-2 py-1 text-[12px] font-medium text-ink opacity-0 shadow-[0_10px_30px_-10px_rgb(10_10_10_/_0.25)] transition-opacity duration-100 group-hover:opacity-100 dark:bg-[#141414]"
    >
      {label}
      {soon ? <span className="ml-1.5 text-[10px] text-muted">Soon</span> : null}
    </span>
  );
}
