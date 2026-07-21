import Anthropic from "@anthropic-ai/sdk";

// Sonnet is our workhorse for structured extraction — cheap, fast, strong at
// JSON. Callers that want a smarter model should reach for `opus()` explicitly.
// Model choice is centralized here so we don't drift model IDs across the app.
const SONNET_MODEL = "claude-sonnet-5";

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
 * Returns a `{ client, model }` bundle pinned to Claude Sonnet. Every caller
 * that says "the LLM" for a task should pass through this so we don't lose
 * track of which model is running where.
 */
export function sonnet(): { client: Anthropic; model: string } {
  return { client: client(), model: SONNET_MODEL };
}

export type { Anthropic };
