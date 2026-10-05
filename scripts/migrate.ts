import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { env } from "../lib/env";

async function main() {
  if (!env.databaseUrl) throw new Error("Set DATABASE_URL or POSTGRES_URL first.");
  const sql = postgres(env.databaseUrl, { prepare: false });
  try {
    const migration = await fs.readFile(path.join(__dirname, "../db/001_init.sql"), "utf8");
    await sql.unsafe(migration);
    console.log("Database migration applied.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
