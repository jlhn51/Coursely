import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

// Every link here must resolve to a real page. If you add one, ship the
// route in the same PR — dead links in the footer look like abandonware.
const columns = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "What it does" },
      { href: "#how-it-works", label: "How it works" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { href: "/sign-up", label: "Sign up" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [{ href: "/contact", label: "Contact" }],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Wordmark href="/" />
            <p className="mt-4 max-w-[220px] text-[14px] leading-[1.5] text-muted">
              Every semester, organized.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => {
                  const isHash = l.href.startsWith("#");
                  return (
                    <li key={l.href}>
                      {isHash ? (
                        <a
                          href={l.href}
                          className="rounded-sm text-[14px] text-ink transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          href={l.href}
                          className="rounded-sm text-[14px] text-ink transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {l.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-hairline pt-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Coursely. All rights reserved.</p>
          <p>Built for students who take their semester seriously.</p>
        </div>
      </div>
    </footer>
  );
}
