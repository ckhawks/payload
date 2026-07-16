import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit doesn't read Next's .env.local on its own — load it here so
// `npm run db:migrate` targets the same database the app connects to.
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
