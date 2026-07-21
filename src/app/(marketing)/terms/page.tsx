import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Terms · Coursely",
  description:
    "The terms of service for using Coursely as a study platform.",
};

export default function TermsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-16 md:pb-32 md:pt-24">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          Legal
        </p>
        <h1 className="mt-3 font-serif text-[44px] leading-[1.05] text-ink md:text-[64px]">
          Terms of service
        </h1>
        <p className="mt-4 text-[15.5px] text-muted">
          Last updated: 21 July 2026
        </p>

        <div className="mt-12 space-y-10 text-[15.5px] leading-[1.65] text-ink">
          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Using Coursely
            </h2>
            <p className="mt-3 text-muted">
              Coursely is a free study platform for individual student use. By
              creating an account you agree to use it lawfully and to respect
              the rights of your school, your professors, and other people
              whose materials you might upload.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Your uploads
            </h2>
            <p className="mt-3 text-muted">
              You keep all rights to the materials you upload. You&apos;re also
              responsible for whether you have the right to upload them — if
              your school or professor restricts course materials, follow those
              rules.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Our service
            </h2>
            <p className="mt-3 text-muted">
              Coursely is offered as-is, without warranty. While we do our best
              to keep the app running and your data safe, we can&apos;t
              guarantee zero downtime or infallible AI outputs. Always
              double-check anything that matters against the source material.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Termination
            </h2>
            <p className="mt-3 text-muted">
              You can delete your account any time from Settings. We may
              suspend accounts that abuse the service or put other users at
              risk.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Changes
            </h2>
            <p className="mt-3 text-muted">
              If we update these terms, we&apos;ll change the date above and
              tell you in the app before the changes affect you.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
