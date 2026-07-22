// Voyage AI embeddings client. voyage-3.5 returns 1024-dim vectors that match
// the material_chunks.embedding column and the pgvector HNSW index.
//
// Two moving parts callers care about:
//   1. Batching — Voyage accepts up to 128 inputs per request; larger arrays
//      are split transparently.
//   2. Retries — a bounded exponential backoff for 429/5xx. Anything else
//      throws immediately so callers see real bugs.

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5";
export const VOYAGE_DIMENSIONS = 1024;
const MAX_BATCH = 128;
const MAX_RETRIES = 3;

export type VoyageInputType = "document" | "query";

type VoyageResponse = {
  object: "list";
  data: Array<{ object: "embedding"; embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

export class VoyageError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "VoyageError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new VoyageError(
      "VOYAGE_API_KEY is not set. Add it to .env.local (and Vercel).",
    );
  }
  return key;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedBatch(
  batch: string[],
  inputType: VoyageInputType,
): Promise<{ vectors: number[][]; tokens: number }> {
  const body = JSON.stringify({
    input: batch,
    model: MODEL,
    input_type: inputType,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(VOYAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
        },
        body,
      });
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw new VoyageError(
          `Voyage request failed: ${err instanceof Error ? err.message : "network"}`,
        );
      }
      await sleep(2 ** attempt * 500);
      continue;
    }

    if (res.ok) {
      const json = (await res.json()) as VoyageResponse;
      // The API returns data unordered by index — sort so vector[i] matches input[i].
      const sorted = [...json.data].sort((a, b) => a.index - b.index);
      const vectors = sorted.map((d) => d.embedding);
      const tokens = json.usage?.total_tokens ?? 0;
      console.info("[cost:voyage] batch ok", {
        count: batch.length,
        tokens,
        model: MODEL,
        inputType,
      });
      return { vectors, tokens };
    }

    // Retry 429/5xx; fail fast on 4xx client errors.
    const retryable = res.status === 429 || res.status >= 500;
    const bodyText = await res.text().catch(() => "");
    if (!retryable || attempt >= MAX_RETRIES) {
      throw new VoyageError(
        `Voyage responded ${res.status}: ${bodyText.slice(0, 400)}`,
        res.status,
      );
    }
    await sleep(2 ** attempt * 500);
  }
  throw new VoyageError("Voyage retries exhausted");
}

/**
 * Embed one or more texts with voyage-3.5.
 *
 * @param texts - inputs. Whitespace-only strings are dropped before the call
 *   because Voyage rejects empty inputs and it's better to skip than to fail
 *   a whole batch on a single bad chunk.
 * @param inputType - "document" for indexed content, "query" for user queries.
 *   Voyage tunes the embedding subtly for each.
 */
export async function embed(
  texts: string[],
  inputType: VoyageInputType,
): Promise<{ vectors: number[][]; tokens: number }> {
  const cleaned = texts.filter((t) => t && t.trim().length > 0);
  if (cleaned.length === 0) return { vectors: [], tokens: 0 };

  let all: number[][] = [];
  let totalTokens = 0;
  for (let i = 0; i < cleaned.length; i += MAX_BATCH) {
    const slice = cleaned.slice(i, i + MAX_BATCH);
    const { vectors, tokens } = await embedBatch(slice, inputType);
    all = all.concat(vectors);
    totalTokens += tokens;
  }
  return { vectors: all, tokens: totalTokens };
}
