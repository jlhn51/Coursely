// Apply drizzle migrations against Neon over HTTP.
//
// Why not `drizzle-kit migrate`? drizzle-kit auto-detects the Neon URL and
// reaches for a websocket driver we don't have installed, then hangs and
// exits nonzero. This script uses the exact same @neondatabase/serverless
// HTTP client the app already uses in src/db/index.ts.
//
// Run with:  pnpm db:migrate
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  console.log("Applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
