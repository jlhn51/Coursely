#!/usr/bin/env tsx
// Runs a single migration SQL file against DATABASE_URL. Used when
// drizzle-kit's interactive prompts get in the way (e.g. column renames).
//
// Usage: npx tsx scripts/apply-migration.ts drizzle/0004_topics_ordering.sql

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("usage: apply-migration.ts <path-to-sql>");
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(2);
}

const raw = readFileSync(path.resolve(file), "utf8");
const statements = raw
  .split("--> statement-breakpoint")
  .map((chunk) =>
    chunk
      // Strip both --line comments and blank leading lines so a statement
      // whose chunk starts with a comment header still runs.
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter((s) => s.length > 0);

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log(`applying ${file} — ${statements.length} statement(s)`);
  for (const [i, stmt] of statements.entries()) {
    // Strip trailing semicolon so neon's tag call is clean.
    const clean = stmt.replace(/;\s*$/, "");
    console.log(`  [${i + 1}/${statements.length}] ${clean.slice(0, 80)}…`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sql as any).query(clean);
  }
  console.log("✓ done");
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
