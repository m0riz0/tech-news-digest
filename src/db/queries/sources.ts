import { getDb } from "@/db/client";
import { sources, tags } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function listActiveSources() {
  const db = getDb();
  return db.select().from(sources).where(eq(sources.isActive, true)).orderBy(asc(sources.id));
}

export async function listActiveTags() {
  const db = getDb();
  return db.select().from(tags).where(eq(tags.isActive, true)).orderBy(asc(tags.id));
}
