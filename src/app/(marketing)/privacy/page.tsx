import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Privacy · Coursely",
  description:
    "How Coursely handles your materials, notes, and account data.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-16 md:pb-32 md:pt-24">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
          Legal
        </p>
        <h1 className="mt-3 font-serif text-[44px] leading-[1.05] text-ink md:text-[64px]">
          Privacy
        </h1>
        <p className="mt-4 text-[15.5px] text-muted">
          Last updated: 21 July 2026
        </p>

        <div className="mt-12 space-y-10 text-[15.5px] leading-[1.65] text-ink">
          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              What we collect
            </h2>
            <p className="mt-3 text-muted">
              We store the account information Clerk provides (name, email,
              profile image), the courses and materials you create in
              Coursely, and the tasks, topics, and preferences derived from
              them. We do not collect anything you don&apos;t give us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              What we do with it
            </h2>
            <p className="mt-3 text-muted">
              Your uploads are used to power your own study experience — parsing
              syllabi, answering your questions, and generating study aids.
              They are not used to train AI models, ours or anyone else&apos;s.
              They are not shared with other students, professors, or third
              parties.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Who we share it with
            </h2>
            <p className="mt-3 text-muted">
              We rely on a small number of vendors to run Coursely: Clerk for
              authentication, Neon for our Postgres database, UploadThing for
              file storage, Anthropic for AI features, and Vercel for hosting.
              Each of them processes data only on our behalf under their own
              published privacy terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Your controls
            </h2>
            <p className="mt-3 text-muted">
              You can delete a task, material, course, or your entire account
              from{" "}
              <span className="font-medium">Settings → Danger zone</span> at any
              time. Exports of your data are coming with v2. If you need
              anything sooner, email us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] leading-tight text-ink">
              Contact
            </h2>
            <p className="mt-3 text-muted">
              Questions or requests about this policy?{" "}
              <a
                href="mailto:hello@coursely.app"
                className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                hello@coursely.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
