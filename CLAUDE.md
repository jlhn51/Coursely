# CLAUDE.md

Operating context for Claude Code working in this repo.

## What this project is

Coursely is an AI-native study platform for undergraduate students. The core promise is course-awareness: every piece of user content (materials, topics, tasks, embeddings, chat history, flashcards, transcripts) is scoped to a specific course, and the AI features operate strictly within that scope.

The product ships in four versions:
- **v1** — Course foundation + syllabus magic (auth, courses, PDF upload, syllabus parsing into weekly topics and deadlines, task CRUD)
- **v2** — Course-aware AI tutor (RAG over course materials via pgvector, chat scoped to a single course, cited answers)
- **v3** — Auto-generated flashcards and practice tests (from uploaded materials, weighted by weak spots)
- **v4** — In-class note-taking (browser audio → Whisper transcription → LLM concept extraction → auto-tagged to course/week)

Current status: **v1 in progress.**

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** Clerk
- **Database:** Neon (serverless Postgres) with pgvector
- **ORM:** Drizzle
- **File storage:** UploadThing
- **PDF extraction:** pdf-parse
- **Validation:** Zod
- **LLM:** Anthropic API (Claude)
- **Transcription:** OpenAI Whisper API (v4 only)
- **Package manager:** pnpm
- **Hosting:** Vercel (push-to-deploy on `main`)

Do not introduce new frameworks, ORMs, or auth providers without a decision from the maintainer.

## Directory conventions

```
src/
├── app/
│   ├── (marketing)/       # Public routes (landing, about, etc.)
│   ├── (app)/             # Auth-required routes (dashboard, courses)
│   ├── api/               # Only for endpoints that need real HTTP (e.g. uploadthing)
│   ├── layout.tsx         # Root layout (metadata, fonts, providers)
│   └── globals.css
├── components/
│   └── ui/                # shadcn/ui components live here
├── db/
│   ├── schema.ts          # Drizzle table definitions
│   └── index.ts           # DB client
├── lib/                   # Shared utilities (syllabus parser, uploadthing config, etc.)
└── actions/               # Server actions grouped by domain (courses.ts, tasks.ts, syllabus.ts)
```

Route groups `(marketing)` and `(app)` are used to separate public and protected sections. The `(app)` layout enforces auth.

## Architectural rules

- **Server components by default.** Only mark `"use client"` when the component genuinely needs `useState`, `useEffect`, browser APIs, or event handlers. Prefer server components + server actions over client components + API routes.
- **Server actions over API routes.** Use `/api` only when an external service requires an HTTP endpoint (e.g., UploadThing webhooks).
- **Course-scoping is enforced at the query layer.** Every query that touches `materials`, `topics`, `tasks`, `embeddings`, `chat_messages`, `flashcards`, or `transcripts` must filter by `courseId`. Never trust caller-supplied IDs without verifying ownership through the course.
- **Soft delete everywhere.** All user-owned tables have a `deletedAt` timestamp (nullable). Never hard-delete in application code. All read queries filter `deletedAt IS NULL`. Use a shared Drizzle helper for this.
- **Validate LLM outputs with Zod before persisting.** A malformed model response must not reach the database.
- **Transactions for multi-row inserts** (e.g., syllabus parsing writes topics + tasks together — all or nothing).
- **User identity comes from Clerk.** There is no local `users` table. Store Clerk's `userId` (string) as a foreign key on `courses` and derive access through course ownership.

## Code style

- TypeScript strict mode. No `any` unless there's a comment explaining why.
- Prefer named exports over default exports, except for Next.js pages/layouts which require default exports.
- Use Next.js `Link` from `next/link` for internal navigation, never `<a>`.
- Use `next/image` for images (when we start using images).
- Use `next/font/google` for web fonts, exposed as CSS variables.
- Tailwind only — no separate CSS files besides `globals.css`.
- Prefer composition (small components in the same file for a page) over prop-heavy monolithic components.
- File names: kebab-case for routes and components (`course-card.tsx`), camelCase for utilities (`parseSyllabus.ts`).

## Commit format

**Conventional Commits.** Every commit follows:

```
<type>: <lowercase imperative subject, no period>
```

Types in use: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`, `build`, `ci`.

Examples:
- `feat: add course creation form`
- `fix: handle empty PDF in syllabus parser`
- `docs: update README with pgvector setup`
- `refactor: extract parseSyllabus into lib`

Subject stays under ~72 characters. No period. Lowercase after the colon. Imperative mood ("add", not "added" or "adds").

## Environment variables

Set in `.env.local` for dev, in Vercel dashboard for prod:

- `DATABASE_URL` — Neon Postgres connection string
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` (v4 only)

Never hardcode secrets. Never commit `.env.local`.

## Design system

- Palette: bg `#FAFAF7`, text `#0A0A0A`, secondary `#5A5A5A`, hairline `#E8E6E0`, accent `#3B4CFF`.
- Type: **Instrument Serif** for display (hero, section headings), **Inter** for body/UI. Loaded via `next/font/google`, exposed as `--font-serif` and `--font-sans`.
- Avoid AI-default landing page looks: no warm-cream + terracotta, no black + neon-green, no broadsheet with hairline rules and zero radius.
- Restraint: one accent color used sparingly, generous whitespace, deliberate typographic hierarchy.
- All motion respects `prefers-reduced-motion`.

## What NOT to do

- Do not add Google Calendar sync, spaced repetition scheduling, semester analytics, or social features. Explicitly out of scope.
- Do not create native mobile apps. Responsive web only.
- Do not add payment/subscription flows without a decision from the maintainer.
- Do not use REST API routes for internal actions — use server actions.
- Do not use ORMs other than Drizzle.
- Do not use auth providers other than Clerk.
- Do not hard-delete data.
- Do not introduce state management libraries (Redux, Zustand, Jotai) without a decision from the maintainer. Server state via server components + revalidation; client state via `useState`.

## Working with the maintainer

- The maintainer makes product and architectural decisions. Claude Code executes.
- When ambiguity exists, ask before assuming. Prefer one clarifying question over an incorrect guess.
- Do not run `pnpm dev` — the maintainer keeps it running.
- Do not `git push` without an explicit instruction. Commits are made by the maintainer after review.
- Never modify `PROJECT.md` (gitignored) or `.env.local`.