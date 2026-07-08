import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs in a plain Node context, so Next.js's automatic
// .env.local loading isn't in play — pull it in explicitly.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
});
