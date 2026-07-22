import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  type ChatCitation,
  chatMessages,
  chatSessions,
  courses,
  materialChunks,
  materials,
} from "@/db/schema";
import { haiku, sonnet } from "@/lib/claude";
import { embed } from "@/lib/voyage";

// Streaming route for the AI tutor. Server actions can't stream responses
// back to the client without polling, so the chat send lives here as a
// Node.js route handler.
//
// Wire protocol (SSE-ish, but plain text/event-stream):
//   event: message-id\ndata: {"userMessageId":"...","assistantMessageId":"..."}\n\n
//   event: delta\ndata: {"text":"..."}\n\n
//   event: citations\ndata: {"citations":[...]}\n\n
//   event: title\ndata: {"title":"..."}\n\n           (first exchange only)
//   event: done\ndata: {}\n\n
//   event: error\ndata: {"error":"..."}\n\n

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
  mode: z.enum(["grounded", "general"]).default("grounded"),
});

const TOP_K = 8;
const HISTORY_LIMIT = 10;

type SentEvent = { event: string; data: Record<string, unknown> };

function toSse(e: SentEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;
}

const GROUNDED_SYSTEM = `You are a study tutor for a specific college course.

RULES:
- Answer using ONLY the provided context from the student's course materials.
- Cite each factual claim with [chunk N] notation matching the chunks provided (e.g. [chunk 3]).
- If the context doesn't cover the question, say so plainly and offer to answer from general knowledge instead.
- Be concise but complete. Use markdown for structure (headings, lists, code) when it helps.
- Never invent details that aren't in the context.`;

const GENERAL_SYSTEM = `You are a helpful study tutor for a college student.

Answer clearly and thoroughly, appropriate for undergraduate level. Use markdown for structure when it helps. Do not fabricate specific details from the student's course — you don't have access to their materials in this mode.`;

const TITLE_PROMPT = `Summarize this exchange in 3-6 words as a chat title. Just the title, no quotes, no punctuation at the end.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  const { sessionId, content, mode } = parsed.data;

  const [session] = await db
    .select({
      id: chatSessions.id,
      courseId: chatSessions.courseId,
      title: chatSessions.title,
    })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .limit(1);

  if (!session || !session.courseId) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
    });
  }

  // Course name pulled once for the "in the context of X" system prompt.
  const [course] = await db
    .select({ id: courses.id, name: courses.name })
    .from(courses)
    .where(
      and(
        eq(courses.id, session.courseId),
        eq(courses.userId, userId),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  if (!course) {
    return new Response(JSON.stringify({ error: "Course not found" }), {
      status: 404,
    });
  }

  // History for continuity — last N messages (both roles), oldest first.
  const historyRows = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt));
  const isFirstExchange = historyRows.length === 0;
  const history = historyRows.slice(-HISTORY_LIMIT).map((r) => ({
    role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: r.content,
  }));

  // Persist the user message immediately so a network drop mid-stream still
  // leaves a coherent transcript.
  const [inserted] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      role: "user",
      content,
    })
    .returning({ id: chatMessages.id });
  const userMessageId = inserted!.id;

  // Retrieve chunks up-front (before we open the SSE stream) so we can
  // send citations in the initial "message-id" event and prime the model.
  let retrieved: Array<{
    id: string;
    materialId: string;
    materialName: string;
    pageNumber: number | null;
    text: string;
  }> = [];

  if (mode === "grounded") {
    try {
      const { vectors } = await embed([content], "query");
      const qvec = vectors[0];
      if (qvec) {
        // pgvector cosine distance = `<=>`. Lower is more similar.
        const literal = `[${qvec.join(",")}]`;
        retrieved = await db
          .select({
            id: materialChunks.id,
            materialId: materialChunks.materialId,
            materialName: materials.name,
            pageNumber: materialChunks.pageNumber,
            text: materialChunks.text,
          })
          .from(materialChunks)
          .innerJoin(materials, eq(materialChunks.materialId, materials.id))
          .where(
            and(
              eq(materialChunks.courseId, course.id),
              eq(materialChunks.userId, userId),
              isNull(materialChunks.deletedAt),
              isNull(materials.deletedAt),
            ),
          )
          .orderBy(sql`${materialChunks.embedding} <=> ${literal}::vector`)
          .limit(TOP_K);
      }
    } catch (err) {
      console.error("[tutor:retrieve_failed]", {
        sessionId: session.id,
        message: err instanceof Error ? err.message : String(err),
      });
      // Fall through: with retrieved=[] the tutor will still answer, but
      // without citations. Better than erroring the whole request.
    }
  }

  // Build the model input.
  const contextBlock =
    retrieved.length > 0
      ? [
          "Context chunks:",
          "",
          ...retrieved.map(
            (c, i) =>
              `[chunk ${i + 1}] (Material: ${c.materialName}, Page: ${
                c.pageNumber ?? "?"
              })\n${c.text}`,
          ),
          "",
        ].join("\n")
      : "";

  const groundedUser =
    mode === "grounded"
      ? `${contextBlock}\nQuestion: ${content}`
      : content;

  const messages = [
    ...history,
    { role: "user" as const, content: groundedUser },
  ];

  const system =
    mode === "grounded"
      ? `${GROUNDED_SYSTEM}\n\nCourse: ${course.name}`
      : `${GENERAL_SYSTEM}\n\nCourse: ${course.name}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (e: SentEvent) => {
        controller.enqueue(enc.encode(toSse(e)));
      };

      // Pre-insert the assistant row so we have an id to reference in the
      // first client event. We'll UPDATE it with final content once the
      // stream finishes.
      const [assistant] = await db
        .insert(chatMessages)
        .values({
          sessionId: session.id,
          role: "assistant",
          content: "",
          citations: null,
        })
        .returning({ id: chatMessages.id });
      const assistantMessageId = assistant!.id;

      push({
        event: "message-id",
        data: { userMessageId, assistantMessageId },
      });

      const { client, model } = sonnet();
      let finalText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const streamResp = await client.messages.stream({
          model,
          max_tokens: 1500,
          system,
          messages,
        });

        for await (const event of streamResp) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            finalText += event.delta.text;
            push({ event: "delta", data: { text: event.delta.text } });
          } else if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens ?? outputTokens;
          } else if (event.type === "message_start" && event.message.usage) {
            inputTokens = event.message.usage.input_tokens ?? 0;
          }
        }

        // Map [chunk N] refs actually cited by the model into the citation
        // payload. Only referenced chunks are surfaced — noisy retrieval
        // stays hidden.
        const citations: ChatCitation[] = [];
        if (retrieved.length > 0) {
          const seen = new Set<number>();
          const re = /\[chunk\s+(\d+)\]/gi;
          for (const m of finalText.matchAll(re)) {
            const n = Number(m[1]);
            if (!Number.isFinite(n) || n < 1 || n > retrieved.length) continue;
            if (seen.has(n)) continue;
            seen.add(n);
            const src = retrieved[n - 1]!;
            citations.push({
              chunkId: src.id,
              materialId: src.materialId,
              materialName: src.materialName,
              pageNumber: src.pageNumber,
              textPreview: src.text.slice(0, 120),
            });
          }
        }

        await db
          .update(chatMessages)
          .set({
            content: finalText,
            citations: citations.length > 0 ? citations : null,
          })
          .where(eq(chatMessages.id, assistantMessageId));

        await db
          .update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(eq(chatSessions.id, session.id));

        push({ event: "citations", data: { citations } });

        console.info("[cost:claude] tutor turn", {
          model,
          inputTokens,
          outputTokens,
          groundedChunks: retrieved.length,
          citedChunks: citations.length,
        });

        // First-exchange auto-title via Haiku. Never blocks the reply.
        if (isFirstExchange) {
          try {
            const { client: hClient, model: hModel } = haiku();
            const titleResp = await hClient.messages.create({
              model: hModel,
              max_tokens: 32,
              system: TITLE_PROMPT,
              messages: [
                {
                  role: "user",
                  content: `Q: ${content}\n\nA: ${finalText.slice(0, 800)}`,
                },
              ],
            });
            const raw = titleResp.content
              .map((b) => (b.type === "text" ? b.text : ""))
              .join("")
              .trim()
              .replace(/^["']+|["']+$/g, "")
              .replace(/[.!?]+$/, "")
              .slice(0, 80);
            const title = raw || "New chat";
            await db
              .update(chatSessions)
              .set({ title, updatedAt: new Date() })
              .where(eq(chatSessions.id, session.id));
            push({ event: "title", data: { title } });
            console.info("[cost:claude] title gen", {
              model: hModel,
              inputTokens: titleResp.usage?.input_tokens,
              outputTokens: titleResp.usage?.output_tokens,
            });
          } catch (err) {
            console.warn("[tutor:title_failed]", {
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }

        push({ event: "done", data: {} });
        controller.close();
      } catch (err) {
        console.error("[tutor:stream_failed]", {
          message: err instanceof Error ? err.message : String(err),
        });
        // Best-effort: save whatever finalText we've accumulated so the
        // transcript isn't empty.
        try {
          await db
            .update(chatMessages)
            .set({
              content: finalText || "(the tutor's response was interrupted)",
            })
            .where(eq(chatMessages.id, assistantMessageId));
        } catch {
          /* silent */
        }
        push({
          event: "error",
          data: {
            error:
              err instanceof Error
                ? err.message
                : "The tutor failed to respond.",
          },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
