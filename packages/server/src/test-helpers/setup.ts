/**
 * Integration Test Setup Helpers
 *
 * Provides utilities for setting up an isolated in-memory DuckDB
 * for server integration tests. Each test suite gets a fresh DB.
 */

import { DuckDBConnection } from "../db/connection";
import { DuckDBDatabase } from "../db/database";
import { setDB, resetDB } from "../db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

/**
 * Split SQL into individual statements (mirrors migrate.ts logic)
 */
function splitSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let inComment = false;
  let stringChar = "";

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === "-" && next === "-" && !inString) {
      inComment = true;
      continue;
    }
    if (inComment) {
      if (char === "\n") inComment = false;
      continue;
    }
    if ((char === "'" || char === '"') && !inString) {
      inString = true;
      stringChar = char;
      current += char;
      continue;
    }
    if (char === stringChar && inString) {
      inString = false;
      stringChar = "";
      current += char;
      continue;
    }
    if (char === ";" && !inString) {
      const stmt = current.trim();
      if (stmt.length > 0) statements.push(stmt);
      current = "";
      continue;
    }
    current += char;
  }
  const last = current.trim();
  if (last.length > 0) statements.push(last);
  return statements;
}

/**
 * Create and initialize an in-memory DuckDB with all migrations applied.
 */
export async function createTestDB(): Promise<DuckDBDatabase> {
  const conn = new DuckDBConnection(":memory:");
  await conn.connect();

  // Run all migration files in order
  const migrationsDir = join(
    import.meta.dir,
    "..",
    "db",
    "migrations"
  );
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf-8");
    for (const stmt of splitSQL(sql)) {
      await conn.run(stmt);
    }
  }

  return new DuckDBDatabase(conn);
}

/**
 * Set up a fresh in-memory DB before tests and inject it as the singleton.
 * Returns a cleanup function to call after tests.
 */
export async function setupTestDB(): Promise<{
  db: DuckDBDatabase;
  teardown: () => void;
}> {
  const db = await createTestDB();
  setDB(db);
  return {
    db,
    teardown: () => resetDB(),
  };
}
