import Anthropic from "@anthropic-ai/sdk";

// Model routing convention:
//   sonnet()  — reasoning-heavy work (syllabus parsing, tutor chat)
//   haiku()   — small, fast, cheap (chat title generation, future
//               flashcard/quiz generation)
//
// Never reach for Opus from app code — cost + latency don't justify it for
// anything we currently ship. Centralize model IDs here so callers don't
// drift.
const SONNET_MODEL = "claude-sonnet-5";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

let cached: Anthropic | null = null;

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (and Vercel).",
    );
  }
  if (cached) return cached;
  cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Returns a `{ client, model }` bundle pinned to Claude Sonnet 5.
 * Use for anything where quality dominates cost.
 */
export function sonnet(): { client: Anthropic; model: string } {
  return { client: client(), model: SONNET_MODEL };
}

/**
 * Returns a `{ client, model }` bundle pinned to Claude Haiku 4.5.
 * Use for classification, titles, simple summaries — anywhere the answer is
 * small and predictable.
 */
export function haiku(): { client: Anthropic; model: string } {
  return { client: client(), model: HAIKU_MODEL };
}

export type { Anthropic };
