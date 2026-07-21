import type { Anthropic } from "@/lib/claude";
import { sonnet } from "@/lib/claude";
import { LLM_TASK_TYPES } from "@/lib/task-types";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ParseReason =
  | "no_api_key"
  | "empty_input"
  | "anthropic_request"
  | "anthropic_timeout"
  | "no_text_block"
  | "invalid_json"
  | "schema_mismatch"
  | "refused";

export class ParseError extends Error {
  reason: ParseReason;
  constructor(message: string, reason: ParseReason) {
    super(message);
    this.name = "ParseError";
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------

const ORDER_LABELS = [
  "Week",
  "Lecture",
  "Module",
  "Chapter",
  "Unit",
] as const;
export type OrderLabel = (typeof ORDER_LABELS)[number];

const parsedTopicSchema = z.object({
  // No upper cap — real syllabi go 40+ lectures. Sanity min = 0 for "week 0"
  // / orientation modules.
  orderNumber: z.number().int().min(0),
  orderLabel: z.enum(ORDER_LABELS),
  // ISO date string (YYYY-MM-DD) or full ISO datetime, or null.
  date: z.string().nullable(),
  title: z.string().trim().min(1),
  description: z.string().nullable(),
});

const parsedTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  taskType: z.enum(LLM_TASK_TYPES),
});

export const parsedSyllabusSchema = z.object({
  courseName: z.string().trim().min(1),
  professor: z.string().nullable(),
  semester: z.string().nullable(),
  topics: z.array(parsedTopicSchema),
  tasks: z.array(parsedTaskSchema),
});

export type ParsedSyllabus = z.infer<typeof parsedSyllabusSchema>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You extract structured data from a university course syllabus.

Return ONLY a JSON object matching this exact schema. No code fences. No commentary. No preamble. No trailing text.

{
  "courseName": string,
  "professor": string | null,
  "semester": string | null,
  "topics": [
    {
      "orderNumber": number,
      "orderLabel": "Week" | "Lecture" | "Module" | "Chapter" | "Unit",
      "date": string | null,
      "title": string,
      "description": string | null
    }
  ],
  "tasks": [
    {
      "title": string,
      "description": string | null,
      "dueDate": string | null,
      "taskType": "reading" | "assignment" | "exam" | "quiz" | "project" | "presentation" | "other"
    }
  ]
}

Topic extraction rules — READ CAREFULLY:

1. Extract EVERY distinct unit of instruction the syllabus lists. Every lecture, every week, every module, every chapter — do NOT skip any. If the syllabus lists 36 lectures, return 36 topic rows. If it lists 15 weeks, return 15 rows.
2. Match the syllabus's own axis:
   - Weekly schedules → orderLabel: "Week"
   - Lecture-numbered schedules → orderLabel: "Lecture"
   - Module-based courses → orderLabel: "Module"
   - Chapter-based reading courses → orderLabel: "Chapter"
   - Unit-based courses → orderLabel: "Unit"
3. orderNumber is the syllabus's own numbering (1, 2, 3, …). Use 0 for "week 0" / orientation / pre-term modules. NEVER cap the number — 36, 40, 50 are all valid.
4. Include the class date in "date" when the syllabus lists per-unit dates (YYYY-MM-DD, or full ISO). Use null when it doesn't.
5. Topic titles are 2–8 words, describing the topic covered. Descriptions are one short sentence or null.

Two mini-examples:

Weekly organization:
  Input excerpt: "Week 3: Logistic Regression. Binary and multiclass classification."
  → { "orderNumber": 3, "orderLabel": "Week", "date": null, "title": "Logistic Regression", "description": "Binary and multiclass classification." }

Lecture organization:
  Input excerpt: "Lecture 17 (Feb 8, 2016): Directional Derivatives. Definition, geometric interpretation, gradient."
  → { "orderNumber": 17, "orderLabel": "Lecture", "date": "2016-02-08", "title": "Directional Derivatives", "description": "Definition, geometric interpretation, and gradient." }

Task extraction rules:

1. Extract EVERY assignment, exam, quiz, project, paper, presentation, and dated reading. Include ones without a specific date — set dueDate to null. Do NOT skip.
2. dueDate is either null or YYYY-MM-DD (or full ISO datetime). Infer the year from the semester context when the date lacks one. Never invent dates.
3. taskType: reading = a reading assignment; assignment = homework, problem set, lab, worksheet; exam = midterm, final; quiz = short in-class check; project = project or paper deliverable; presentation = student talk / demo / oral; other = anything else.

Course-level rules:

1. courseName is required — if unlabeled, use your best short label from the top of the document.
2. professor and semester are null when the document doesn't state them clearly.
3. NEVER invent information. If unclear, use null (or omit the row entirely for topics/tasks).

Empty-output rules:
- topics: [] is only correct when the syllabus truly has no schedule / calendar / weekly plan / lecture list.
- tasks: [] is only correct when the syllabus truly lists no assessments and no assignments.
- If BOTH would be empty, you have almost certainly missed something — re-read the document before answering.

Reply with the raw JSON object and nothing else.`;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_INPUT_CHARS = 40_000;
const MAX_TOKENS = 8192; // room for 40+ topics
const REQUEST_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export type ParseSyllabusOutcome = {
  parsed: ParsedSyllabus;
  rawResponse: string;
  inputChars: number;
  truncated: boolean;
  attempts: number;
};

export async function parseSyllabusText(
  text: string,
): Promise<ParseSyllabusOutcome> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ParseError("Syllabus text is empty.", "empty_input");
  }

  const truncated = trimmed.length > MAX_INPUT_CHARS;
  const userContent = `Here is the extracted syllabus text. Extract topics and tasks per the schema.

<syllabus>
${truncated ? trimmed.slice(0, MAX_INPUT_CHARS) : trimmed}
</syllabus>`;

  if (truncated) {
    console.warn("[syllabus:llm] input truncated", {
      originalChars: trimmed.length,
      truncatedChars: userContent.length,
      cap: MAX_INPUT_CHARS,
    });
  }

  console.info("[syllabus:llm] request", {
    systemChars: SYSTEM_PROMPT.length,
    userChars: userContent.length,
    userPreview: userContent.slice(0, 200).replace(/\s+/g, " "),
  });

  const { response, attempts } = await callWithRetry(userContent);

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (response.stop_reason === "refusal") {
    console.error("[syllabus:llm] refusal", {
      stopReason: response.stop_reason,
    });
    throw new ParseError("Model refused to answer.", "refused");
  }
  if (!textBlock) {
    console.error("[syllabus:llm] no text block", {
      stopReason: response.stop_reason,
      contentTypes: response.content.map((b) => b.type),
    });
    throw new ParseError("Model returned no text content.", "no_text_block");
  }

  const raw = textBlock.text;
  console.info("[syllabus:llm] response", {
    attempts,
    stop_reason: response.stop_reason,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    rawChars: raw.length,
    rawPreview: raw.slice(0, 1000),
  });

  const stripped = stripFences(raw.trim());

  let json: unknown;
  try {
    json = JSON.parse(stripped);
  } catch (err) {
    console.error("[syllabus:llm] JSON.parse failed", {
      error: err instanceof Error ? err.message : String(err),
      rawFull: raw,
    });
    throw new ParseError("Model output was not valid JSON.", "invalid_json");
  }

  const parsed = parsedSyllabusSchema.safeParse(json);
  if (!parsed.success) {
    // Log path + the actual value at that path so we can see which topic /
    // task row and which field tripped the schema.
    const detailedIssues = parsed.error.issues.slice(0, 10).map((i) => ({
      path: i.path.join("."),
      code: i.code,
      message: i.message,
      actualValue: readPath(
        json,
        i.path.filter(
          (p): p is string | number =>
            typeof p === "string" || typeof p === "number",
        ),
      ),
    }));
    console.error("[syllabus:llm] schema mismatch", {
      issues: detailedIssues,
      jsonShape: describeShape(json),
    });
    throw new ParseError(
      `Model output failed schema validation at ${detailedIssues[0]?.path ?? "?"}: ${
        parsed.error.issues[0]?.message ?? "invalid shape"
      }.`,
      "schema_mismatch",
    );
  }

  console.info("[syllabus:llm] parsed", {
    courseName: parsed.data.courseName,
    professor: parsed.data.professor,
    semester: parsed.data.semester,
    topics: parsed.data.topics.length,
    tasks: parsed.data.tasks.length,
    orderLabels: uniqueOrderLabels(parsed.data.topics),
  });

  return {
    parsed: parsed.data,
    rawResponse: raw,
    inputChars: userContent.length,
    truncated,
    attempts,
  };
}

function uniqueOrderLabels(topics: ParsedSyllabus["topics"]): string[] {
  return Array.from(new Set(topics.map((t) => t.orderLabel)));
}

function readPath(root: unknown, path: (string | number)[]): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (cur == null) return undefined;
    if (typeof cur === "object") {
      cur = (cur as Record<string | number, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

function describeShape(root: unknown): Record<string, unknown> {
  if (!root || typeof root !== "object") return { type: typeof root };
  const r = root as Record<string, unknown>;
  return {
    courseName: typeof r.courseName,
    topicsLen: Array.isArray(r.topics) ? r.topics.length : "not array",
    tasksLen: Array.isArray(r.tasks) ? r.tasks.length : "not array",
    firstTopic:
      Array.isArray(r.topics) && r.topics.length > 0
        ? JSON.stringify(r.topics[0]).slice(0, 200)
        : null,
  };
}

// ---------------------------------------------------------------------------
// Retry loop
// ---------------------------------------------------------------------------

async function callWithRetry(
  userContent: string,
): Promise<{ response: Anthropic.Message; attempts: number }> {
  let anthropic;
  try {
    anthropic = sonnet();
  } catch (err) {
    throw new ParseError(
      err instanceof Error ? err.message : "Anthropic client unavailable.",
      "no_api_key",
    );
  }
  const { client, model } = anthropic;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      const response = await withTimeout(
        client.messages.create({
          model,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        }),
        REQUEST_TIMEOUT_MS,
      );
      if (attempt > 1) {
        console.info("[syllabus:llm] retry ok", {
          attempt,
          elapsedMs: Date.now() - started,
        });
      }
      return { response, attempts: attempt };
    } catch (err) {
      lastErr = err;
      const status =
        err instanceof Error && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const retryable = isRetryable(err, status);
      console.error("[syllabus:llm] request failed", {
        attempt,
        elapsedMs: Date.now() - started,
        status,
        retryable,
        error: err instanceof Error ? err.message : String(err),
      });
      if (!retryable || attempt >= 2) break;
      await sleep(500);
    }
  }

  if (lastErr instanceof ParseError) throw lastErr;
  const message =
    lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown");
  const isTimeout = message.toLowerCase().includes("timeout");
  throw new ParseError(
    `Anthropic request failed (${message}).`,
    isTimeout ? "anthropic_timeout" : "anthropic_request",
  );
}

function isRetryable(err: unknown, status: number | undefined): boolean {
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500) return true;
    return false;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/timeout/i.test(message)) return true;
  if (/ECONN|ENOTFOUND|ETIMEDOUT|network/i.test(message)) return true;
  return false;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`request timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stripFences(s: string): string {
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i;
  const m = s.match(fence);
  return m ? m[1]!.trim() : s;
}
