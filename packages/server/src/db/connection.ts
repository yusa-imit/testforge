/**
 * DuckDB Connection Management
 *
 * Provides singleton connection to DuckDB database.
 * Uses duckdb package for Node.js/Bun compatibility.
 */

import { Database } from "duckdb";

/**
 * DuckDB Connection Wrapper
 *
 * Provides async/await interface for DuckDB operations.
 */
export class DuckDBConnection {
  private db: Database | null = null;
  private isConnected = false;

  constructor(private readonly dbPath: string) {}

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to DuckDB: ${err.message}`));
          return;
        }
        this.isConnected = true;
        console.log(`[DB] Connected to DuckDB at ${this.dbPath}`);
        resolve();
      });
    });
  }

  /**
   * Execute a query that doesn't return results (CREATE, INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<void> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.db!.run(sql, ...params, (err) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}\nSQL: ${sql}`));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Execute a query and return all results
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureConnected();

    return new Promise((resolve, reject) => {
      this.db!.all(sql, ...params, (err, rows) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}\nSQL: ${sql}`));
          return;
        }
        resolve((rows || []) as T[]);
      });
    });
  }

  /**
   * Execute a query and return first result
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
          return;
        }
        this.isConnected = false;
        this.db = null;
        console.log("[DB] Database connection closed");
        resolve();
      });
    });
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
  }
}

/**
 * Singleton database instance
 */
let dbInstance: DuckDBConnection | null = null;

/**
 * Get or create database instance
 */
export function getDatabase(dbPath = "./testforge.duckdb"): DuckDBConnection {
  if (!dbInstance) {
    dbInstance = new DuckDBConnection(dbPath);
  }
  return dbInstance;
}

/**
 * Initialize database and run migrations
 */
export async function initDatabase(dbPath = "./testforge.duckdb"): Promise<DuckDBConnection> {
  const db = getDatabase(dbPath);
  await db.connect();
  return db;
}
