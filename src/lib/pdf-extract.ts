import { PDFParse } from "pdf-parse";

const FETCH_TIMEOUT_MS = 30_000;
const PARSE_TIMEOUT_MS = 30_000;
// Below this, the PDF was almost certainly a scan / image export — pdf-parse
// only reads embedded text, so we surface it as a distinct failure with copy
// pointing the user at a text-based upload.
const MIN_TEXT_LENGTH = 500;
const PDF_MAGIC = "%PDF-";

export type PdfExtractReason =
  | "download"
  | "http_error"
  | "empty_file"
  | "not_pdf"
  | "parse"
  | "parse_timeout"
  | "no_text"
  | "scanned";

export class PdfExtractError extends Error {
  reason: PdfExtractReason;
  constructor(message: string, reason: PdfExtractReason) {
    super(message);
    this.name = "PdfExtractError";
    this.reason = reason;
  }
}

export async function extractPdfText(fileUrl: string): Promise<string> {
  // --- Fetch with abort-based timeout ---
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(fileUrl, { signal: controller.signal });
  } catch (err) {
    throw new PdfExtractError(
      `Could not download PDF (${err instanceof Error ? err.message : "network error"}).`,
      "download",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new PdfExtractError(
      `PDF download failed (HTTP ${response.status}).`,
      "http_error",
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const arrayBuf = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuf);

  console.info("[syllabus:pdf] downloaded", {
    fileUrl,
    bytes: data.byteLength,
    contentType,
  });

  if (data.byteLength === 0) {
    throw new PdfExtractError("Downloaded file was empty.", "empty_file");
  }

  // --- Verify it's really a PDF (magic bytes; don't trust content-type) ---
  const head = new TextDecoder("latin1").decode(data.subarray(0, 5));
  if (head !== PDF_MAGIC) {
    throw new PdfExtractError(
      `File does not look like a PDF (first bytes: ${JSON.stringify(head)}).`,
      "not_pdf",
    );
  }

  // --- Parse with independent timeout so a wedged pdfjs can't hang the action ---
  const parser = new PDFParse({ data });
  try {
    const result = await Promise.race([
      parser.getText(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new PdfExtractError(
                `PDF parse exceeded ${PARSE_TIMEOUT_MS / 1000}s.`,
                "parse_timeout",
              ),
            ),
          PARSE_TIMEOUT_MS,
        ),
      ),
    ]);
    const text = result.text?.trim() ?? "";
    console.info("[syllabus:pdf] extracted", {
      pages: result.pages?.length ?? 0,
      chars: text.length,
      preview: text.slice(0, 200).replace(/\s+/g, " "),
    });
    if (!text) {
      throw new PdfExtractError(
        "PDF contained no extractable text.",
        "no_text",
      );
    }
    if (text.length < MIN_TEXT_LENGTH) {
      throw new PdfExtractError(
        "This PDF appears to be scanned. Try uploading a text-based version.",
        "scanned",
      );
    }
    return text;
  } catch (err) {
    if (err instanceof PdfExtractError) throw err;
    throw new PdfExtractError(
      `PDF parsing failed (${err instanceof Error ? err.message : "unknown"}).`,
      "parse",
    );
  } finally {
    await parser.destroy().catch(() => {});
  }
}
