import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireDatabaseUrl } from "@/lib/config";
import * as schema from "./schema";

/**
 * Drizzle クライアント(Web/バッチ共用)。
 * サーバーレス(Vercel)とバッチ(GitHub Actions)の両方で使うため、
 * 接続数は最小限に抑える。
 */
let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const client = postgres(requireDatabaseUrl(), { max: 5, prepare: false });
  return drizzle(client, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
