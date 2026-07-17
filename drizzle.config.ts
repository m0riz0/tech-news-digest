import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // .env が無い環境(CI)では環境変数をそのまま使う
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
