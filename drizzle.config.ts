import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const migrationUrl = process.env.DATABASE_URL_UNPOOLED;
if (process.argv.includes("migrate") && !migrationUrl) {
  throw new Error("DATABASE_URL_UNPOOLED is required to run Drizzle migrations.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  ...(migrationUrl ? { dbCredentials: { url: migrationUrl } } : {}),
});
