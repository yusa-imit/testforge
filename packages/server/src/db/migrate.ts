/**
 * Database Migration Runner
 *
 * Runs SQL migration files against DuckDB.
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { getDatabase } from "./connection";
import { logger } from "../utils/logger";

/**
 * Split SQL file into individual statements
 * Handles semicolons inside strings and comments
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

    // Handle line comments
    if (char === "-" && next === "-" && !inString) {
      inComment = true;
      continue;
    }

    if (inComment) {
      if (char === "\n") {
        inComment = false;
      }
      continue;
    }

    // Handle strings
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

    // Handle semicolons (statement terminators)
    if (char === ";" && !inString) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = "";
      continue;
    }

    current += char;
  }

  // Add last statement if it doesn't end with semicolon
  const lastStmt = current.trim();
  if (lastStmt.length > 0) {
    statements.push(lastStmt);
  }

  return statements;
}

/**
 * Run all pending migrations
 */
export async function runMigrations(dbPath = "./testforge.duckdb"): Promise<void> {
  const db = getDatabase(dbPath);
  await db.connect();

  logger.info("Starting database migrations");

  // Get migration files
  const migrationsDir = join(__dirname, "migrations");
  const files = await readdir(migrationsDir);
  const sqlFiles = files
    .filter((f) => f.endsWith(".sql"))
    .sort(); // Run in order

  if (sqlFiles.length === 0) {
    logger.info("No migration files found");
    return;
  }

  // Run each migration
  for (const file of sqlFiles) {
    logger.info("Running migration", { file });
    const filePath = join(migrationsDir, file);
    const sql = await readFile(filePath, "utf-8");

    // Split into statements
    const statements = splitSQL(sql);

    for (const statement of statements) {
      await db.run(statement);
    }

    logger.info("Migration completed", { file });
  }

  logger.info("All migrations completed successfully");
}

/**
 * CLI entry point
 */
if (import.meta.main) {
  runMigrations()
    .then(() => {
      logger.info("Migration complete");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Migration failed", { error: err });
      process.exit(1);
    });
}
