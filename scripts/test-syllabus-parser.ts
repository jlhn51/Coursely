#!/usr/bin/env tsx
// End-to-end sanity check for the syllabus parsing pipeline.
//
// Exercises: extractPdfText → parseSyllabusText → shape assertions, plus
// the scanned-PDF and no-content failure paths. Does NOT touch the database:
// the action's DB path needs an authenticated user session + UploadThing URL,
// which only the browser flow provides. See summary at end for coverage.
//
// Run: npx tsx scripts/test-syllabus-parser.ts

import { config } from "dotenv";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { extractPdfText, PdfExtractError } from "../src/lib/pdf-extract";
import { parseSyllabusText } from "../src/lib/syllabus-parser";

config({ path: ".env.local" });

const REAL_SYLLABUS_TEXT = `CS 314: Machine Learning
Prof. Ada Chen · Fall 2025

Course Overview
This course is a rigorous introduction to statistical learning theory, supervised
and unsupervised methods, and modern deep learning architectures. Prerequisite:
CS 101 and MATH 250.

Weekly Schedule

Week 1: Course Overview and Linear Algebra Review
Introduction to the course, tools, and mathematical prerequisites. Reading:
Chapter 1 of the textbook.

Week 2: Linear Regression and Gradient Descent
Ordinary least squares, matrix formulation, and iterative optimization.

Week 3: Logistic Regression and Classification
Binary and multiclass classification with logistic regression. Softmax.

Week 4: Regularization and Cross-Validation
L1, L2, elastic net, and hold-out validation.

Week 5: Neural Networks
Multilayer perceptrons, backpropagation, and initialization.

Week 6: Convolutional Networks
Feature maps, pooling, and applications to vision.

Week 7: Midterm and Review
Exam covering weeks 1-6. Review session Monday.

Week 8: Recurrent Networks and Transformers
Sequence modeling, LSTMs, GRUs, attention.

Week 9: Unsupervised Learning
K-means, PCA, and autoencoders.

Week 10: Reinforcement Learning
MDPs, policy gradients, Q-learning.

Assessments and Deadlines
- Problem Set 1: due September 15, 2025 (linear algebra warm-up)
- Problem Set 2: due September 29, 2025 (linear regression)
- Problem Set 3: due October 13, 2025 (classification)
- Midterm Exam: October 24, 2025, in class
- Project Proposal: due November 3, 2025
- Problem Set 4: due November 10, 2025 (neural networks)
- Final Project Presentation: December 10, 2025
- Final Project Report: due December 15, 2025

Attendance is expected. Late assignments lose 10% per day, up to 3 days.
`;

const SCANNED_TEXT = "Cover Page 1";
const NO_CONTENT_TEXT = `
Coursely Terms of Service. This document does not describe a course. It is
purely a legal agreement between the user and the operator. There are no
lectures, no assignments, and no schedule. This text exists solely to make
the parser return empty topics and tasks so we can exercise the guard.
Coursely Terms of Service, continued. Nothing to schedule. Nothing to grade.
Nothing to read. Nothing to write. Nothing to say. Nothing to see here.
`.repeat(6);

async function makePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 11;
  const marginX = 50;
  const marginY = 60;
  const lineHeight = size * 1.4;
  let page = doc.addPage([612, 792]);
  const wrapWidth = page.getWidth() - marginX * 2;

  const finalLines: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(" ");
    let cur = "";
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(cand, size) > wrapWidth) {
        if (cur) finalLines.push(cur);
        cur = w;
      } else {
        cur = cand;
      }
    }
    finalLines.push(cur);
  }

  let y = page.getHeight() - marginY;
  for (const l of finalLines) {
    if (y < marginY) {
      page = doc.addPage([612, 792]);
      y = page.getHeight() - marginY;
    }
    page.drawText(l, { x: marginX, y, size, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }
  return await doc.save();
}

async function servePdf(bytes: Uint8Array | Buffer): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const buf = Buffer.from(bytes);
  const server = createServer((_req, res) => {
    res.writeHead(200, {
      "content-type": "application/pdf",
      "content-length": String(buf.byteLength),
    });
    res.end(buf);
  });
  const listen = promisify(server.listen.bind(server)) as (
    port: number,
    host: string,
  ) => Promise<void>;
  await listen(0, "127.0.0.1");
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return {
    url: `http://127.0.0.1:${port}/syllabus.pdf`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

let failures = 0;
function assert(cond: unknown, msg: string) {
  if (cond) console.log("  ✓", msg);
  else {
    console.error("  ✗", msg);
    failures += 1;
  }
}

async function runNotPdf() {
  console.log("\n=== 1. NOT A PDF ===");
  const bytes = Buffer.from("this is definitely not a pdf\n");
  const { url, close } = await servePdf(bytes);
  try {
    let threw: unknown = null;
    try {
      await extractPdfText(url);
    } catch (err) {
      threw = err;
    }
    assert(threw instanceof PdfExtractError, "throws PdfExtractError");
    assert(
      (threw as PdfExtractError)?.reason === "not_pdf",
      `reason === "not_pdf" (got ${(threw as PdfExtractError)?.reason})`,
    );
  } finally {
    await close();
  }
}

async function runScanned() {
  console.log("\n=== 2. SCANNED / TOO SHORT ===");
  const bytes = await makePdf(SCANNED_TEXT);
  const { url, close } = await servePdf(bytes);
  try {
    let threw: unknown = null;
    try {
      await extractPdfText(url);
    } catch (err) {
      threw = err;
    }
    assert(threw instanceof PdfExtractError, "throws PdfExtractError");
    assert(
      (threw as PdfExtractError)?.reason === "scanned",
      `reason === "scanned" (got ${(threw as PdfExtractError)?.reason})`,
    );
  } finally {
    await close();
  }
}

async function runHappyPath() {
  console.log("\n=== 3. HAPPY PATH: real syllabus ===");
  const bytes = await makePdf(REAL_SYLLABUS_TEXT);
  console.log(`  fixture PDF size: ${bytes.byteLength} bytes`);
  const { url, close } = await servePdf(bytes);
  try {
    const text = await extractPdfText(url);
    assert(text.length > 500, `extracted ${text.length} chars (>500)`);
    const outcome = await parseSyllabusText(text);
    assert(
      typeof outcome.parsed.courseName === "string" &&
        outcome.parsed.courseName.length > 0,
      `courseName: ${JSON.stringify(outcome.parsed.courseName)}`,
    );
    assert(
      outcome.parsed.topics.length >= 5,
      `topics.length = ${outcome.parsed.topics.length} (>=5)`,
    );
    assert(
      outcome.parsed.tasks.length >= 5,
      `tasks.length = ${outcome.parsed.tasks.length} (>=5)`,
    );
    for (const t of outcome.parsed.topics) {
      const ok = Number.isInteger(t.orderNumber) && t.title.length > 0;
      if (!ok) failures += 1;
      console.log(
        `    · ${t.orderLabel} ${t.orderNumber}: ${t.title}${t.date ? ` (${t.date})` : ""}`,
      );
    }
    const dated = outcome.parsed.tasks.filter((t) => t.dueDate);
    assert(dated.length > 0, `at least one task has dueDate`);
    const hasExam = outcome.parsed.tasks.some((t) => t.taskType === "exam");
    assert(hasExam, `at least one task is taskType === "exam"`);
    console.log("  task breakdown:");
    for (const t of outcome.parsed.tasks) {
      console.log(
        `    · [${t.taskType}] ${t.title}${t.dueDate ? ` (${t.dueDate})` : ""}`,
      );
    }
  } finally {
    await close();
  }
}

// A lecture-numbered syllabus with 36 units, mirroring the shape of the
// Math 200 syllabus that broke the previous schema (weekNumber max 30).
const MATH_200_TEXT = `Math 200: Multivariable Calculus
Instructor: Prof. Peyam Tabrizian · Spring 2016 · UC Berkeley

Course Description
Vectors in 3-space, partial derivatives, multiple integrals, vector calculus.

Lecture Schedule (MWF, 10-11am, Dwinelle 155)

Lecture 1 (Jan 20): Vectors in 3-space
Lecture 2 (Jan 22): Dot and cross products
Lecture 3 (Jan 25): Lines and planes
Lecture 4 (Jan 27): Cylinders and quadric surfaces
Lecture 5 (Jan 29): Vector functions and space curves
Lecture 6 (Feb 1): Arc length and curvature
Lecture 7 (Feb 3): Motion in space
Lecture 8 (Feb 5): Functions of several variables
Lecture 9 (Feb 8): Limits and continuity
Lecture 10 (Feb 10): Partial derivatives
Lecture 11 (Feb 12): Tangent planes and linear approximations
Lecture 12 (Feb 17): The chain rule
Lecture 13 (Feb 19): Directional derivatives and the gradient
Lecture 14 (Feb 22): Maximum and minimum values
Lecture 15 (Feb 24): Lagrange multipliers
Lecture 16 (Feb 26): Midterm 1 review
Lecture 17 (Feb 29): Midterm 1
Lecture 18 (Mar 2): Double integrals over rectangles
Lecture 19 (Mar 4): Iterated integrals
Lecture 20 (Mar 7): Double integrals over general regions
Lecture 21 (Mar 9): Double integrals in polar coordinates
Lecture 22 (Mar 11): Applications of double integrals
Lecture 23 (Mar 14): Surface area
Lecture 24 (Mar 16): Triple integrals
Lecture 25 (Mar 18): Triple integrals in cylindrical coordinates
Lecture 26 (Mar 28): Triple integrals in spherical coordinates
Lecture 27 (Mar 30): Change of variables
Lecture 28 (Apr 1): Vector fields
Lecture 29 (Apr 4): Line integrals
Lecture 30 (Apr 6): Fundamental theorem for line integrals
Lecture 31 (Apr 8): Green's theorem
Lecture 32 (Apr 11): Midterm 2 review
Lecture 33 (Apr 13): Midterm 2
Lecture 34 (Apr 15): Curl and divergence
Lecture 35 (Apr 18): Parametric surfaces
Lecture 36 (Apr 20): Surface integrals

Homework and Exams

Homework 1: due Jan 29
Homework 2: due Feb 5
Homework 3: due Feb 12
Homework 4: due Feb 19
Homework 5: due Feb 26
Homework 6: due Mar 4
Homework 7: due Mar 11
Homework 8: due Mar 18
Homework 9: due Apr 1
Homework 10: due Apr 8
Homework 11: due Apr 15
Homework 12: due Apr 22
Midterm 1: Feb 29 in class
Midterm 2: Apr 13 in class
Final Exam: May 10, 3-6pm
`;

async function runMath200() {
  console.log("\n=== 4. MATH 200 — lecture-numbered with 36 units ===");
  const bytes = await makePdf(MATH_200_TEXT);
  const { url, close } = await servePdf(bytes);
  try {
    const text = await extractPdfText(url);
    assert(text.length > 500, `extracted ${text.length} chars`);
    const outcome = await parseSyllabusText(text);
    // The critical assertion: pre-fix schema rejected any number > 30.
    // This syllabus goes to Lecture 36 — the parser must not choke.
    assert(
      outcome.parsed.topics.length >= 30,
      `topics.length = ${outcome.parsed.topics.length} (>=30) — proves cap removed`,
    );
    const maxOrder = Math.max(
      ...outcome.parsed.topics.map((t) => t.orderNumber),
    );
    assert(maxOrder >= 30, `max orderNumber = ${maxOrder} (>=30)`);
    const uniqueLabels = new Set(outcome.parsed.topics.map((t) => t.orderLabel));
    assert(
      uniqueLabels.has("Lecture"),
      `used orderLabel="Lecture" (got: ${[...uniqueLabels].join(", ")})`,
    );
    const withDates = outcome.parsed.topics.filter((t) => t.date).length;
    assert(withDates > 20, `${withDates} topics have a date (>20)`);
    assert(
      outcome.parsed.tasks.length >= 10,
      `tasks.length = ${outcome.parsed.tasks.length} (>=10)`,
    );
    const exams = outcome.parsed.tasks.filter((t) => t.taskType === "exam");
    assert(
      exams.length >= 2,
      `exams found: ${exams.length} (>=2 — Midterm 1, Midterm 2, Final)`,
    );
    console.log(`  → ${outcome.parsed.topics.length} topics, ${outcome.parsed.tasks.length} tasks`);
  } finally {
    await close();
  }
}

async function runNoContent() {
  console.log("\n=== 4. NO CONTENT (guard territory) ===");
  const bytes = await makePdf(NO_CONTENT_TEXT);
  const { url, close } = await servePdf(bytes);
  try {
    const text = await extractPdfText(url);
    assert(text.length >= 500, `extracted ${text.length} chars`);
    const outcome = await parseSyllabusText(text);
    console.log(
      `  model returned: topics=${outcome.parsed.topics.length}, tasks=${outcome.parsed.tasks.length}`,
    );
  } finally {
    await close();
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY missing from .env.local");
    process.exit(2);
  }
  await runNotPdf();
  await runScanned();
  await runHappyPath();
  await runMath200();
  await runNoContent();
  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\n✓ pipeline sanity checks passed");
}

main().catch((err) => {
  console.error("\nUnhandled error:", err);
  process.exit(1);
});
