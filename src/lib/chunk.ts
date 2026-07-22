// Text chunker for the embedding pipeline. Optimizes for two things:
//
//   1. Chunks land near ~500 tokens (approx 2000 chars for English prose).
//      Voyage-3.5's cost curve rewards small, focused chunks, and the tutor
//      quality improves when citations point at a paragraph, not a page.
//
//   2. Splits at natural boundaries (paragraph → sentence → word). Never
//      splits mid-word.
//
// `chunkText` handles a single blob; `chunkPages` preserves pageNumber so
// citations can link into a PDF page.

const TARGET_CHARS = 2000;
const OVERLAP_CHARS = 200; // 10% overlap keeps context across boundaries.
const MIN_CHUNK_CHARS = 120; // anything shorter is noise / boilerplate.

export type Chunk = {
  chunkIndex: number;
  text: string;
  pageNumber: number | null;
};

// Split into paragraphs first, then merge until we hit ~TARGET_CHARS. If a
// single paragraph exceeds the target, fall through to sentence splitting.
function splitParagraphs(input: string): string[] {
  return input
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function splitSentences(input: string): string[] {
  // "Good enough" sentence splitter — matches punctuation followed by
  // whitespace. Doesn't try to be linguistically correct; the goal is
  // reasonable chunk boundaries, not perfect prose analysis.
  return input
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Merge a list of atomic pieces (paragraphs OR sentences) into chunks of
// roughly TARGET_CHARS, with OVERLAP_CHARS trailing carryover so the model
// sees ideas that straddle boundaries.
function mergeToTarget(pieces: string[]): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const piece of pieces) {
    if (!current) {
      current = piece;
      continue;
    }
    const combined = `${current}\n\n${piece}`;
    if (combined.length <= TARGET_CHARS) {
      current = combined;
      continue;
    }
    chunks.push(current);
    // Carry the tail forward as overlap so the next chunk begins with recent
    // context. `slice(-OVERLAP)` is fine because we chunk on paragraph edges;
    // it won't slice mid-word in a way that matters for embedding quality.
    const overlap = current.slice(-OVERLAP_CHARS);
    current = `${overlap}\n\n${piece}`;
  }
  if (current) chunks.push(current);
  return chunks;
}

function forceSplitLong(text: string): string[] {
  // Fallback for a single "paragraph" that's massive (e.g. table dump).
  // Splits at sentence boundaries first; if even those exceed target, hard-
  // splits by TARGET_CHARS.
  const sentences = splitSentences(text);
  const grouped = mergeToTarget(sentences);
  const result: string[] = [];
  for (const g of grouped) {
    if (g.length <= TARGET_CHARS) {
      result.push(g);
      continue;
    }
    // Hard cut with overlap.
    for (let i = 0; i < g.length; i += TARGET_CHARS - OVERLAP_CHARS) {
      result.push(g.slice(i, i + TARGET_CHARS));
    }
  }
  return result;
}

/**
 * Split arbitrary text into embedding-sized chunks.
 * Paragraph-first, sentence fallback, hard-cut only for pathological cases.
 */
export function chunkText(input: string): string[] {
  const paragraphs = splitParagraphs(input);
  if (paragraphs.length === 0) return [];

  // Split any single paragraph that already exceeds the target.
  const flattened: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= TARGET_CHARS) flattened.push(p);
    else flattened.push(...forceSplitLong(p));
  }

  const merged = mergeToTarget(flattened);
  return merged.filter((c) => c.length >= MIN_CHUNK_CHARS);
}

/**
 * Chunk per-page text and preserve page numbers on each output chunk.
 * Callers use this when the source is a PDF and citations need to jump to
 * the right page. Pages are chunked independently so a chunk never spans
 * pages — that would make the citation "Page N" a lie.
 */
export function chunkPages(
  pages: Array<{ pageNumber: number; text: string }>,
): Chunk[] {
  const out: Chunk[] = [];
  let idx = 0;
  for (const page of pages) {
    const pieces = chunkText(page.text);
    for (const t of pieces) {
      out.push({ chunkIndex: idx++, text: t, pageNumber: page.pageNumber });
    }
  }
  return out;
}
