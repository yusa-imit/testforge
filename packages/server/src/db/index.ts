/**
 * Database Module
 *
 * Provides singleton database instance using DuckDB for persistence.
 * Replaces the previous in-memory Map storage.
 */

import { initDatabase } from "./connection";
import { DuckDBDatabase } from "./database";
import { runMigrations } from "./migrate";

/**
 * Singleton database instance
 */
let dbInstance: DuckDBDatabase | null = null;

/**
 * Initialize and return database instance
 *
 * Runs migrations on first initialization.
 */
async function initDB(): Promise<DuckDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // Connect to DuckDB
  const connection = await initDatabase();

  // Run migrations
  await runMigrations();

  // Create database instance
  dbInstance = new DuckDBDatabase(connection);

  return dbInstance;
}

/**
 * Get database instance
 *
 * Note: This returns a Promise. In route handlers, use:
 * ```
 * const database = await getDB();
 * ```
 */
export async function getDB(): Promise<DuckDBDatabase> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Set database instance (for testing only)
 *
 * Allows integration tests to inject a pre-configured in-memory database.
 * Call this before the first `getDB()` call in tests.
 */
export function setDB(instance: DuckDBDatabase): void {
  dbInstance = instance;
}

/**
 * Reset database instance (for testing only)
 *
 * Clears the singleton so a fresh DB can be injected.
 */
export function resetDB(): void {
  dbInstance = null;
}

/**
 * Legacy compatibility export
 *
 * For synchronous code that expects the old InMemoryDB interface,
 * throw an error to force migration to async/await pattern.
 */
export const db = new Proxy({} as any, {
  get() {
    throw new Error(
      "Database is now async. Use `await getDB()` instead of `db` directly."
    );
  },
});
