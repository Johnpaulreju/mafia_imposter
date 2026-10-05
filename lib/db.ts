import postgres from "postgres";
import { env } from "./env";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (sql) return sql;
  if (!env.databaseUrl) return null;
  sql = postgres(env.databaseUrl, { max: 5, prepare: false });
  return sql;
}
