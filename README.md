# Coursely

An AI-native study platform that turns a student's course materials — syllabi, slides, notes, recordings — into an organized, course-aware learning workflow.

**Live app:** https://coursely-seven.vercel.app/

> v1 in development. Landing page shipped; auth and core flows next.

---

## What it does

Students juggle multiple tools to study for one class: their LMS for the syllabus, Notion for notes, Quizlet for flashcards, ChatGPT for explanations. None of them know they belong to the same class.

Coursely unifies the study workflow around the course as a first-class entity. Upload your syllabus and the app organizes your semester automatically — weekly topics extracted, deadlines populated as tasks. Every piece of content in the system is scoped to a specific course, which is what makes the AI features (in later versions) genuinely course-aware.

## Roadmap

- **v1 — Course foundation + syllabus magic** *(in progress)*
  Auth, multi-course creation, PDF upload, syllabus parsing into weekly topics and deadlines, task management per course.
- **v2 — Course-aware AI tutor**
  RAG over uploaded materials with pgvector. Chat scoped to a single course, grounded in its documents, with citations to specific pages/slides.
- **v3 — Auto-generated flashcards and practice tests**
  Generated from uploaded materials, weighted toward weak spots based on quiz performance history.
- **v4 — In-class note-taking with concept extraction**
  Browser audio capture, Whisper transcription, LLM-extracted concepts auto-tagged to the correct course and week.

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** lucide-react
- **Fonts:** Instrument Serif (display) + Inter (body) via `next/font/google`
- **Auth:** Clerk
- **Database:** Neon (serverless Postgres) with pgvector
- **ORM:** Drizzle
- **File storage:** UploadThing
- **PDF extraction:** pdf-parse
- **Validation:** Zod
- **LLM:** Anthropic API (Claude)
- **Transcription:** OpenAI Whisper API *(v4)*
- **Hosting:** Vercel

## Architecture

Coursely is a single Next.js 15 application deployed on Vercel. Server components and server actions handle most backend logic; a small number of API routes are used only where a real HTTP endpoint is required (e.g. UploadThing).

The data model centers on the **course**. Every piece of user content — uploaded materials, extracted weekly topics, deadlines — belongs to a course. This scoping is enforced at the query layer and is the foundation of the AI course-awareness in later versions.

### Syllabus parsing pipeline (v1)

1. User uploads a PDF via UploadThing → file stored, URL returned.
2. A server action fetches the PDF and extracts text with `pdf-parse`.
3. Extracted text is sent to Claude with a structured prompt requesting course metadata, weekly topics, and deadlines as JSON.
4. The response is validated with Zod before touching the database.
5. Topics and tasks are inserted in a single database transaction.
6. The UI refreshes to show the parsed semester.

## Design

Coursely's visual identity is designed for quiet competence — a serious tool for people doing serious work. The bar is Linear, Notion, Vercel, Lepta Wallet.

- **Palette.** Warm off-white background (`#FAFAF7`), near-black text (`#0A0A0A`), electric blue accent (`#3B4CFF`) used sparingly. Full dark mode with matching contrast ratios.
- **Typography.** Instrument Serif for the display face (hero headline, section headings, editorial numbers) and Inter for body and UI. Every section heading uses one italicized accent-colored word for chromatic rhythm across the page.
- **Motion.** Subtle scroll-triggered entrance animations and hover microinteractions. No animation libraries — CSS keyframes and IntersectionObserver only. All motion respects `prefers-reduced-motion`.
- **Landing page.** Ten sections: nav, hero with product mockup, features, how-it-works, product surfaces, privacy strip, pricing, FAQ, closing CTA, footer. Density and compositional variety over minimalism.

## Local development

### Prerequisites
- Node.js 20+ (recommended via [nvm](https://github.com/nvm-sh/nvm))
- [pnpm](https://pnpm.io/) 9+
- A Postgres database ([Neon](https://neon.tech) recommended)
- Accounts on [Clerk](https://clerk.com), [UploadThing](https://uploadthing.com), and [Anthropic](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/jlhn51/Coursely.git
cd Coursely
pnpm install
cp .env.example .env.local
# Fill in .env.local with your service credentials
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

```
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
ANTHROPIC_API_KEY=
```

## License

MIT