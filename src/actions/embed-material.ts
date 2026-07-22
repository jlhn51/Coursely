"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { courses, materialChunks, materials } from "@/db/schema";
import { chunkPages } from "@/lib/chunk";
import { extractByPage, PdfExtractError } from "@/lib/pdf-extract";
import { embed, VoyageError } from "@/lib/voyage";

// Hard budget for a single material end-to-end. If a PDF is so massive it
// blows past this, we log and abort — the tutor still works with whatever
// other materials embedded successfully.
const TOTAL_TIMEOUT_MS = 90_000;

type EmbedResult =
  | { success: true; chunkCount: number; tokens: number }
  | { success: false; reason: string };

/**
 * Embed a single material into `material_chunks` with Voyage voyage-3.5.
 * Ownership-checked, idempotent, PDF-only. Called fire-and-forget after a
 * material upload, and directly from the "Re-embed for AI tutor" button.
 */
export async function embedMaterial(materialId: string): Promise<EmbedResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, reason: "unauthorized" };
  return embedMaterialForUser(materialId, userId);
}

// Internal variant that takes an already-verified userId so the fire-and-
// forget path from createMaterial doesn't need a second auth() call.
export async function embedMaterialForUser(
  materialId: string,
  userId: string,
): Promise<EmbedResult> {
  const started = Date.now();
  console.info("[embed:start]", { materialId, userId });

  const [material] = await db
    .select({
      id: materials.id,
      url: materials.url,
      fileType: materials.fileType,
      courseId: materials.courseId,
      userId: materials.userId,
      deletedAt: materials.deletedAt,
      name: materials.name,
    })
    .from(materials)
    .where(and(eq(materials.id, materialId), eq(materials.userId, userId)))
    .limit(1);

  if (!material) {
    console.warn("[embed:skipped_not_found]", { materialId });
    return { success: false, reason: "not_found" };
  }
  if (material.deletedAt) {
    console.info("[embed:skipped_deleted]", { materialId });
    return { success: false, reason: "deleted" };
  }

  const isPdf =
    material.fileType.includes("pdf") ||
    material.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    console.info("[embed:skipped_non_pdf]", {
      materialId,
      fileType: material.fileType,
    });
    return { success: false, reason: "non_pdf" };
  }

  // Idempotency: any existing chunks for this material get soft-deleted so a
  // re-run doesn't produce duplicates. Cheaper than an upsert on a HNSW-
  // indexed table.
  await db
    .update(materialChunks)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(materialChunks.materialId, material.id),
        isNull(materialChunks.deletedAt),
      ),
    );

  // Race the whole pipeline against a total budget so a wedged page never
  // hangs a serverless invocation forever.
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`embed timed out after ${TOTAL_TIMEOUT_MS}ms`)),
      TOTAL_TIMEOUT_MS,
    ),
  );

  try {
    return await Promise.race([
      runEmbed({
        materialId: material.id,
        materialName: material.name,
        courseId: material.courseId,
        userId: material.userId,
        fileUrl: material.url,
        startedAt: started,
      }),
      timeoutPromise,
    ]);
  } catch (err) {
    const reason =
      err instanceof PdfExtractError
        ? `pdf_${err.reason}`
        : err instanceof VoyageError
          ? `voyage_${err.status ?? "err"}`
          : "unhandled";
    console.error("[embed:failed]", {
      materialId,
      reason,
      message: err instanceof Error ? err.message : String(err),
    });
    return { success: false, reason };
  }
}

async function runEmbed(args: {
  materialId: string;
  materialName: string;
  courseId: string;
  userId: string;
  fileUrl: string;
  startedAt: number;
}): Promise<EmbedResult> {
  const { materialId, courseId, userId, fileUrl } = args;

  const extracted = await extractByPage(fileUrl);
  console.info("[embed:pdf_ok]", {
    materialId,
    chars: extracted.totalChars,
    pages: extracted.pages.length,
  });

  const chunks = chunkPages(extracted.pages);
  if (chunks.length === 0) {
    console.info("[embed:no_chunks]", { materialId });
    return { success: false, reason: "no_chunks" };
  }
  console.info("[embed:chunked]", {
    materialId,
    count: chunks.length,
  });

  const { vectors, tokens } = await embed(
    chunks.map((c) => c.text),
    "document",
  );
  if (vectors.length !== chunks.length) {
    throw new Error(
      `Voyage returned ${vectors.length} vectors for ${chunks.length} chunks`,
    );
  }
  console.info("[embed:voyage_ok]", {
    materialId,
    tokens,
    vectors: vectors.length,
  });

  // Neon's HTTP driver caps request size; insert in batches of ~50 so a big
  // material doesn't overflow. Ordered so chunkIndex stays monotonic.
  const rows = chunks.map((c, i) => ({
    materialId,
    courseId,
    userId,
    chunkIndex: c.chunkIndex,
    text: c.text,
    pageNumber: c.pageNumber,
    embedding: vectors[i]!,
  }));

  const INSERT_BATCH = 50;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    await db.insert(materialChunks).values(rows.slice(i, i + INSERT_BATCH));
  }
  console.info("[embed:committed]", {
    materialId,
    rows: rows.length,
  });

  await db
    .update(courses)
    .set({ lastEmbeddedAt: new Date() })
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)));

  console.info("[embed:done]", {
    materialId,
    elapsedMs: Date.now() - args.startedAt,
  });
  return { success: true, chunkCount: rows.length, tokens };
}

/**
 * User-triggered re-embed. Same as embedMaterial but surfaces a friendly
 * result shape for the "Re-embed for AI tutor" button in the preview modal.
 */
export async function reembedMaterial(
  materialId: string,
): Promise<
  { success: true; chunks: number } | { success?: false; error: string }
> {
  if (!/^[0-9a-fA-F-]{36}$/.test(materialId)) {
    return { error: "Invalid material id" };
  }
  const r = await embedMaterial(materialId);
  if (r.success) return { success: true, chunks: r.chunkCount };
  return { error: reasonToMessage(r.reason) };
}

function reasonToMessage(reason: string): string {
  switch (reason) {
    case "unauthorized":
      return "Not authenticated";
    case "not_found":
      return "Material not found";
    case "deleted":
      return "Material was deleted";
    case "non_pdf":
      return "Only PDFs can be embedded";
    case "no_chunks":
      return "No text extracted from the PDF";
    case "pdf_scanned":
      return "This PDF appears to be a scan — try a text-based version";
    case "pdf_no_text":
      return "PDF contained no extractable text";
    case "pdf_download":
    case "pdf_http_error":
      return "Couldn't download the PDF";
    case "pdf_parse":
    case "pdf_parse_timeout":
      return "PDF parsing failed";
    case "voyage_429":
      return "Voyage rate limit hit — try again in a minute";
    default:
      if (reason.startsWith("voyage_")) return "Embedding service error";
      return "Embedding failed";
  }
}
