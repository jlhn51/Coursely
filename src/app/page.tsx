import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CalendarRange,
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  EyeOff,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Lock,
  MessageSquare,
  Mic,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { HeroPreview } from "@/components/hero-preview";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

// ---------- Content ----------

const whatItDoes = [
  {
    icon: FileText,
    title: "Syllabus parsing",
    body: "Upload a PDF and get your semester structured into weekly topics and deadlines in under a minute.",
  },
  {
    icon: Sparkles,
    title: "Course-aware AI tutor",
    body: "Ask questions grounded in your professor's slides and your notes, with citations to specific pages.",
  },
  {
    icon: Layers,
    title: "Auto flashcards",
    body: "Generated from your materials and weighted toward the concepts you keep missing.",
  },
  {
    icon: Mic,
    title: "In-class recording",
    body: "Record lectures in the browser; get transcripts and concept notes tagged to the right course and week.",
  },
  {
    icon: ListChecks,
    title: "Task tracking",
    body: "Every deadline from your syllabus becomes a task, ordered by due date and scoped to the course.",
  },
  {
    icon: CalendarRange,
    title: "Semester timeline",
    body: "Zoom out and see the whole term at once — every topic, every assessment, every conflict.",
  },
] as const;

const steps = [
  {
    n: "01",
    title: "Upload your syllabus.",
    body: "Coursely extracts your weekly topics and every deadline in under a minute.",
  },
  {
    n: "02",
    title: "Ask anything.",
    body: "The AI tutor answers using your professor's slides and your notes — not generic knowledge.",
  },
  {
    n: "03",
    title: "Practice on your terms.",
    body: "Auto-generated flashcards and practice tests, weighted toward your weak spots.",
  },
  {
    n: "04",
    title: "Notes that write themselves.",
    body: "Record lectures in-browser; concepts get transcribed and tagged to the right course and week.",
  },
] as const;

const builtFor = [
  {
    icon: Calendar,
    title: "Course Timeline",
    body: "Every course you're taking, laid out week by week.",
  },
  {
    icon: MessageSquare,
    title: "AI Tutor",
    body: "Answers grounded in the materials you actually uploaded.",
  },
  {
    icon: ClipboardCheck,
    title: "Practice Tests",
    body: "Question sets shaped by the parts of the syllabus you haven't mastered.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    body: "Deck generation from your slides and notes, tuned to your weak spots.",
  },
  {
    icon: Mic,
    title: "Lecture Notes",
    body: "Record in the browser and get clean, taggable notes back.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    body: "See what you know cold and what still needs work.",
  },
] as const;

const privacyPromises = [
  "Your materials are never used to train AI models.",
  "Uploads are encrypted in transit and at rest.",
  "Export every course as a single archive, any time.",
  "Delete a file, a course, or your whole account in one click.",
  "No ads. No trackers beyond what's strictly needed to log you in.",
  "Nothing is shared with other students, professors, or third parties.",
] as const;

const privacySnapshot = [
  { icon: EyeOff, label: "Trackers on this page", value: "0" },
  { icon: Shield, label: "Third-party ads", value: "0" },
  { icon: Lock, label: "Encrypted uploads", value: "Always" },
  { icon: X, label: "Training on your data", value: "Never" },
  { icon: Download, label: "Full export", value: "Any time" },
  { icon: Trash2, label: "Delete on request", value: "One click" },
] as const;

const freePlan = {
  eyebrow: "Forever free",
  price: "$0",
  cadence: "for students, always",
  description: "Everything you need to run your semester.",
  features: [
    "Unlimited courses",
    "Syllabus parsing & timeline",
    "Course-aware AI tutor",
    "Auto-generated flashcards",
    "Practice tests",
    "In-class lecture recording",
  ],
  cta: { label: "Start your semester", href: "/sign-up" },
  featured: true,
} as const;

const premiumPlan = {
  eyebrow: "Coming soon",
  price: "TBD",
  cadence: "priced with students in mind",
  description: "For semesters where you want the sharpest edge.",
  features: [
    "Everything in Free",
    "Priority AI response time",
    "Longer lecture recordings",
    "Higher-fidelity transcription",
    "Early access to new features",
  ],
  cta: { label: "Join the waitlist", href: "/waitlist" },
  featured: false,
} as const;

const faqs = [
  {
    q: "Is it really free?",
    a: "Yes. Coursely is free while in beta, and the core semester-organization features will stay free after. If we ever add a premium tier, it will be for advanced extras — not the essentials.",
  },
  {
    q: "Do you use my materials to train AI models?",
    a: "No. Your uploaded materials are used only to answer your own questions and generate your own study aids. They are never included in training data for any model, ours or anyone else's.",
  },
  {
    q: "What file types work?",
    a: "PDFs to start — syllabi, slide decks, lecture notes, readings. Word docs and Google Docs exports are next. Images and audio recordings come with the v4 note-taking release.",
  },
  {
    q: "Which courses does this work for?",
    a: "Any course whose materials you can upload as a document. It works best for lecture-based courses with a written syllabus — humanities, sciences, engineering, business. Studios and labs are trickier and improving.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Export everything you uploaded, plus everything Coursely generated from it (flashcards, notes, timelines), as a single archive. No lock-in.",
  },
  {
    q: "Is my professor's copyright respected?",
    a: "Your materials stay in your account. We don't republish them, share them with other students, or use them outside your session. Uploading course materials is your responsibility to do within your school's policy.",
  },
] as const;

// ---------- Page ----------

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <HeroSection />
        <WhatItDoesSection />
        <HowItWorksSection />
        <BuiltForSection />
        <PrivacySection />
        <PricingSection />
        <FAQSection />
        <ClosingCTA />
      </main>
      <SiteFooter />
    </>
  );
}

// ---------- Sections ----------

function HeroSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-5 md:gap-12">
        <div className="md:col-span-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1 text-[12px] font-medium text-muted dark:bg-[#141414]">
            <Zap
              size={13}
              strokeWidth={2}
              aria-hidden="true"
              className="text-accent"
            />
            Free while in beta · No credit card
          </span>

          <h1 className="mt-6 font-serif text-[44px] leading-[1.05] text-ink md:text-[72px]">
            Your semester,{" "}
            <em className="italic text-accent">organized</em> automatically.
          </h1>

          <p className="mt-6 max-w-[560px] text-[17px] leading-[1.55] text-muted md:text-[19px]">
            Upload your syllabus. Coursely reads it, lays out your weekly topics,
            populates every deadline, and grows into a course-aware AI study
            partner as the semester goes on.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href="/sign-up" className={primaryButton}>
              Start your semester
            </Link>
            <a href="#how-it-works" className={secondaryLink}>
              <span className="underline-draw">See how it works</span>
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-y-0.5"
              >
                ↓
              </span>
            </a>
          </div>

          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
            <TrustDot />
            Free forever
            <TrustDot />
            Your data, your device
            <TrustDot />
            Works with any syllabus
          </p>
        </div>

        <div className="md:col-span-2">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function WhatItDoesSection() {
  return (
    <Reveal
      as="section"
      id="features"
      className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28"
    >
      <Eyebrow icon={Sparkles}>What it does</Eyebrow>
      <SectionHeading>
        Your semester, <AccentSpan>unified.</AccentSpan>
      </SectionHeading>
      <p className="mt-4 max-w-[560px] text-[16px] leading-[1.55] text-muted">
        Six tools your study workflow already needs — glued together by the
        course, not by another folder in your Google Drive.
      </p>

      <ul className="mt-14 grid grid-cols-1 gap-x-14 gap-y-10 border-t border-hairline pt-10 md:grid-cols-2">
        {whatItDoes.map((f) => (
          <li key={f.title} className="flex gap-4">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline text-accent">
              <f.icon size={16} strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-[17px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-[1.55] text-muted">
                {f.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function HowItWorksSection() {
  return (
    <Reveal
      as="section"
      id="how-it-works"
      className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28"
    >
      <Eyebrow icon={Workflow}>How it works</Eyebrow>
      <SectionHeading>
        From syllabus to <AccentSpan>ready</AccentSpan> in four steps.
      </SectionHeading>

      <ol className="mt-14 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="group flex h-full flex-col rounded-2xl border border-hairline bg-white p-8 transition-all duration-200 hover:border-ink/25 hover:shadow-[inset_0_-2px_0_0_rgb(59_76_255_/_0.2)] dark:bg-[#141414] dark:hover:border-white/25 dark:hover:shadow-[inset_0_-2px_0_0_rgb(90_107_255_/_0.25)]"
          >
            <p className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
              />
              Step {s.n}
            </p>
            <h3 className="mt-5 text-[19px] font-semibold leading-[1.25] text-ink">
              {s.title}
            </h3>
            <p className="mt-3 text-[14.5px] leading-[1.55] text-muted">
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-14 flex justify-center">
        <Link href="/sign-up" className={primaryButton}>
          Try syllabus magic <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Reveal>
  );
}

function BuiltForSection() {
  return (
    <Reveal
      as="section"
      id="built-for"
      className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28"
    >
      <Eyebrow icon={BookOpen}>What you get</Eyebrow>
      <SectionHeading>
        Built for <AccentSpan>real study.</AccentSpan>
      </SectionHeading>
      <p className="mt-4 max-w-[560px] text-[16px] leading-[1.55] text-muted">
        Not another Notion template. Six product surfaces designed around one
        thing — the course you&apos;re actually taking.
      </p>

      <ul className="mt-14 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {builtFor.map((f) => (
          <li
            key={f.title}
            className="flex h-full flex-col rounded-2xl border border-hairline bg-white p-8 transition-all duration-200 hover:border-ink/25 hover:shadow-[inset_0_-2px_0_0_rgb(59_76_255_/_0.2)] dark:bg-[#141414] dark:hover:border-white/25 dark:hover:shadow-[inset_0_-2px_0_0_rgb(90_107_255_/_0.25)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent dark:bg-accent/15">
              <f.icon size={18} strokeWidth={1.75} />
            </span>
            <h3 className="mt-5 text-[17px] font-semibold text-ink">
              {f.title}
            </h3>
            <p className="mt-2 text-[14.5px] leading-[1.55] text-muted">
              {f.body}
            </p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function PrivacySection() {
  return (
    <Reveal
      as="section"
      id="privacy"
      className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28"
    >
      <Eyebrow icon={ShieldCheck}>Your materials, your rules</Eyebrow>
      <SectionHeading>
        Your notes, <AccentSpan>only your notes.</AccentSpan>
      </SectionHeading>

      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-5 md:gap-16">
        <ul className="space-y-4 md:col-span-3">
          {privacyPromises.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/[0.10] text-accent">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <p className="text-[16px] leading-[1.55] text-ink">{line}</p>
            </li>
          ))}
        </ul>

        <div className="md:col-span-2">
          <div className="rounded-xl border border-hairline p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent/[0.10] text-accent">
                  <Shield size={14} strokeWidth={2} />
                </span>
                <p className="text-[13px] font-semibold text-ink">
                  Privacy Snapshot
                </p>
              </div>
              <span className="rounded-full border border-hairline px-2 py-0.5 text-[10.5px] font-medium text-muted">
                Live
              </span>
            </div>
            <ul className="mt-4 divide-y divide-hairline">
              {privacySnapshot.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between py-2.5 text-[13px]"
                >
                  <span className="flex items-center gap-2.5 text-muted">
                    <row.icon size={13} strokeWidth={1.75} />
                    {row.label}
                  </span>
                  <span className="font-medium text-ink">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function PricingSection() {
  return (
    <Reveal
      as="section"
      id="pricing"
      className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28"
    >
      <Eyebrow icon={Tag}>Pricing</Eyebrow>
      <SectionHeading>
        Start free. Stay <AccentSpan>free.</AccentSpan>
      </SectionHeading>
      <p className="mt-4 max-w-[560px] text-[16px] leading-[1.55] text-muted">
        One plan for every student, forever. A premium tier for power users is
        coming — but the essentials will always be on the house.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
        <PricingCard plan={freePlan} />
        <PricingCard plan={premiumPlan} />
      </div>

      <div className="mt-12 flex justify-center">
        <Link href="/sign-up" className={primaryButton}>
          Start free <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Reveal>
  );
}

function PricingCard({
  plan,
}: {
  plan: typeof freePlan | typeof premiumPlan;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 md:p-10 ${
        plan.featured
          ? "border border-accent/40 bg-accent/[0.03] shadow-[0_0_0_1px_rgb(59_76_255_/_0.08),0_40px_80px_-40px_rgb(59_76_255_/_0.25)]"
          : "border border-hairline"
      }`}
    >
      <p
        className={`text-[11px] font-medium uppercase tracking-[0.14em] ${
          plan.featured ? "text-accent" : "text-muted"
        }`}
      >
        {plan.eyebrow}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-[42px] leading-none text-ink">
          {plan.price}
        </span>
        <span className="text-[13px] text-muted">{plan.cadence}</span>
      </div>
      <p className="mt-3 text-[15px] leading-[1.55] text-muted">
        {plan.description}
      </p>

      <ul className="mt-8 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-[14.5px] text-ink">
            <span
              className={`mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                plan.featured ? "bg-accent/[0.12] text-accent" : "text-muted"
              }`}
            >
              <Check size={13} strokeWidth={2.25} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        {plan.featured ? (
          <Link href={plan.cta.href} className={primaryButton}>
            {plan.cta.label} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <Link
            href={plan.cta.href}
            className="inline-flex items-center gap-1 rounded-md border border-hairline px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
          >
            {plan.cta.label} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function FAQSection() {
  return (
    <Reveal
      as="section"
      id="faq"
      className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28"
    >
      <Eyebrow icon={HelpCircle}>FAQ</Eyebrow>
      <SectionHeading>
        Questions, <AccentSpan>plainly answered.</AccentSpan>
      </SectionHeading>

      <div className="mt-12 border-t border-hairline">
        {faqs.map((f) => (
          <details
            key={f.q}
            className="group border-b border-hairline py-6 [&::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              <h3 className="text-[17px] font-medium text-ink md:text-[18px]">
                {f.q}
              </h3>
              <ChevronDown
                size={18}
                className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-4 max-w-[640px] text-[15.5px] leading-[1.6] text-muted">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </Reveal>
  );
}

function ClosingCTA() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 md:pb-32 md:pt-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-b from-accent/[0.05] to-transparent px-6 py-14 md:px-16 md:py-20">
          {/* subtle accent glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-[32px] leading-[1.1] text-ink md:text-[44px]">
              A study tool built for you,{" "}
              <AccentSpan>not your data.</AccentSpan>
            </h2>
            <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-[1.55] text-muted md:text-[17px]">
              Coursely is free while in beta, private by default, and built by
              someone who has actually sat through these classes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <Link href="/sign-up" className={primaryButton}>
                Create your account <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/sign-in"
                className="group inline-flex items-center gap-1 rounded-sm text-[14.5px] font-medium text-ink transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <span className="underline-draw">Sign in</span>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------- Shared bits ----------

const primaryButton =
  "inline-flex items-center gap-1.5 rounded-md bg-accent px-6 py-3 text-[14.5px] font-medium text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#2e3fef] hover:shadow-[0_14px_30px_-10px_rgb(59_76_255_/_0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent dark:hover:bg-[#6a7bff]";

const secondaryLink =
  "group inline-flex items-center gap-1 rounded-sm text-[14.5px] font-medium text-ink transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

function Eyebrow({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted dark:bg-[#141414]">
      <Icon
        size={13}
        strokeWidth={2}
        aria-hidden="true"
        className="text-accent"
      />
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 font-serif text-[32px] leading-[1.1] text-ink md:text-[40px]">
      {children}
    </h2>
  );
}

function AccentSpan({ children }: { children: React.ReactNode }) {
  return <span className="italic text-accent">{children}</span>;
}

function TrustDot() {
  return (
    <span
      aria-hidden="true"
      className="hidden h-1 w-1 rounded-full bg-hairline sm:inline-block"
    />
  );
}
