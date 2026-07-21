import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Contact · Coursely",
  description: "Get in touch with the Coursely team.",
};

export default function ContactPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-16 md:pb-32 md:pt-24">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          Company
        </p>
        <h1 className="mt-3 font-serif text-[44px] leading-[1.05] text-ink md:text-[64px]">
          Get in <em className="italic text-accent">touch.</em>
        </h1>
        <p className="mt-6 max-w-lg text-[16.5px] leading-[1.6] text-muted">
          Bug reports, feature requests, privacy questions, love letters — one
          inbox for all of them. We read every message.
        </p>

        <a
          href="mailto:hello@coursely.app"
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-[14.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_14px_30px_-10px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#6a7bff]"
        >
          <Mail size={14} strokeWidth={2} aria-hidden="true" />
          hello@coursely.app
        </a>

        <div className="mt-16 space-y-6 border-t border-hairline pt-10 text-[15px] leading-[1.65] text-ink">
          <p className="text-muted">
            For security disclosures, please email the address above and
            include &ldquo;security&rdquo; in the subject line — we&apos;ll
            reply within one business day.
          </p>
          <p className="text-muted">
            Coursely is currently in private beta. If you&apos;re a professor
            or student org interested in early access for a whole class, let us
            know how many students and which term.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
