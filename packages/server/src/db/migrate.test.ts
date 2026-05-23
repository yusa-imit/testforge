import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { runMigrations } from "./migrate";
import { getDatabase, resetDatabaseInstance } from "./connection";
import { mkdirSync, rmSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "fs";
import { join } from "path";

const TEST_DIR = join(__dirname, "__test_migrate_dbs__");
const MIGRATIONS_DIR = join(__dirname, "migrations");
const BACKUP_DIR = join(__dirname, "migrations_backup");

describe("runMigrations", () => {
  beforeAll(() => {
    // Backup existing migrations if they exist
    if (existsSync(MIGRATIONS_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
      const files = readdirSync(MIGRATIONS_DIR);
      for (const file of files) {
        copyFileSync(join(MIGRATIONS_DIR, file), join(BACKUP_DIR, file));
      }
      // Clear migrations directory for testing
      rmSync(MIGRATIONS_DIR, { recursive: true, force: true });
    }

    // Create fresh directories
    mkdirSync(MIGRATIONS_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  beforeEach(() => {
    // Clear all migration files before each test
    try {
      const files = readdirSync(MIGRATIONS_DIR);
      for (const file of files) {
        if (file.endsWith('.sql')) {
          rmSync(join(MIGRATIONS_DIR, file));
        }
      }
    } catch (_err) {
      // Ignore
    }
  });

  afterEach(async () => {
    // Close the current singleton connection (getDatabase returns the same instance regardless of path)
    try {
      const db = getDatabase();
      await db.close();
    } catch (_err) {
      // Ignore
    }

    // Reset singleton so the next test gets a fresh connection to its own DB file
    resetDatabaseInstance();

    // Clean up test databases
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
      mkdirSync(TEST_DIR, { recursive: true });
    } catch (_err) {
      // Ignore
    }
  });

  afterAll(() => {
    // Clean up test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (_err) {
      // Ignore
    }

    // Remove test migrations
    try {
      rmSync(MIGRATIONS_DIR, { recursive: true, force: true });
    } catch (_err) {
      // Ignore
    }

    // Restore original migrations if backup exists
    if (existsSync(BACKUP_DIR)) {
      mkdirSync(MIGRATIONS_DIR, { recursive: true });
      const files = readdirSync(BACKUP_DIR);
      for (const file of files) {
        copyFileSync(join(BACKUP_DIR, file), join(MIGRATIONS_DIR, file));
      }
      rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
  });

  function createTestDBPath(name: string): string {
    return join(TEST_DIR, `${name}.duckdb`);
  }

  it("should handle empty migrations directory", async () => {
    const dbPath = createTestDBPath("empty");
    await runMigrations(dbPath);

    // Should not throw - verify DB works
    const db = getDatabase(dbPath);
    const result = await db.all("SELECT 1 as value");
    expect(result[0].value).toBe(1);
  });

  it("should run simple migration file", async () => {
    const dbPath = createTestDBPath("simple");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_create_users.sql"),
      "CREATE TABLE users (id INTEGER, name VARCHAR);"
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all("SELECT * FROM users");
    expect(result).toEqual([]);
  });

  it("should run multiple statements in one file", async () => {
    const dbPath = createTestDBPath("multi");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_products.sql"),
      `
CREATE TABLE products (id INTEGER, name VARCHAR);
INSERT INTO products VALUES (1, 'Widget');
INSERT INTO products VALUES (2, 'Gadget');
      `.trim()
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all<{ id: number; name: string }>(
      "SELECT * FROM products ORDER BY id"
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: "Widget" });
    expect(result[1]).toEqual({ id: 2, name: "Gadget" });
  });

  it("should handle SQL with strings containing semicolons", async () => {
    const dbPath = createTestDBPath("semicolons");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_messages.sql"),
      `
CREATE TABLE messages (id INTEGER, text VARCHAR);
INSERT INTO messages VALUES (1, 'Hello; World');
INSERT INTO messages VALUES (2, 'Test; Data');
      `.trim()
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all<{ id: number; text: string }>(
      "SELECT * FROM messages ORDER BY id"
    );
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Hello; World");
    expect(result[1].text).toBe("Test; Data");
  });

  it("should handle SQL with line comments", async () => {
    const dbPath = createTestDBPath("comments");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_items.sql"),
      `
-- This is a comment
CREATE TABLE items (id INTEGER);
-- Another comment
INSERT INTO items VALUES (1);
      `.trim()
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all<{ id: number }>("SELECT * FROM items");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("should handle migrations with no trailing semicolon", async () => {
    const dbPath = createTestDBPath("no_semi");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_no_semi.sql"),
      "CREATE TABLE no_semi (id INTEGER)" // No semicolon
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all("SELECT * FROM no_semi");
    expect(result).toEqual([]);
  });

  it("should handle complex migration with mixed content", async () => {
    const dbPath = createTestDBPath("complex");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_orders.sql"),
      `
-- Create main table
CREATE TABLE orders (
  id INTEGER,
  customer VARCHAR,
  total DOUBLE
);

-- Insert test data
INSERT INTO orders VALUES (1, 'Alice', 100.50);
INSERT INTO orders VALUES (2, 'Bob', 200.75);
      `.trim()
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all<{ id: number; customer: string; total: number }>(
      "SELECT * FROM orders ORDER BY id"
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, customer: "Alice", total: 100.5 });
    expect(result[1]).toEqual({ id: 2, customer: "Bob", total: 200.75 });
  });

  it("should handle multi-line statements", async () => {
    const dbPath = createTestDBPath("multiline");

    writeFileSync(
      join(MIGRATIONS_DIR, "001_employees.sql"),
      `
CREATE TABLE employees (
  id INTEGER,
  first_name VARCHAR,
  last_name VARCHAR,
  department VARCHAR
);

INSERT INTO employees
VALUES
  (1, 'John', 'Doe', 'Engineering'),
  (2, 'Jane', 'Smith', 'Marketing');
      `.trim()
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all<{ id: number; first_name: string }>(
      "SELECT * FROM employees ORDER BY id"
    );
    expect(result).toHaveLength(2);
    expect(result[0].first_name).toBe("John");
    expect(result[1].first_name).toBe("Jane");
  });

  it("should run migrations in alphabetical order", async () => {
    const dbPath = createTestDBPath("ordered");

    // Create migrations out of order
    writeFileSync(
      join(MIGRATIONS_DIR, "003_third.sql"),
      "INSERT INTO ordered VALUES (3);"
    );
    writeFileSync(
      join(MIGRATIONS_DIR, "001_first.sql"),
      "CREATE TABLE ordered (id INTEGER); INSERT INTO ordered VALUES (1);"
    );
    writeFileSync(
      join(MIGRATIONS_DIR, "002_second.sql"),
      "INSERT INTO ordered VALUES (2);"
    );

    await runMigrations(dbPath);

    const db = getDatabase(dbPath);
    const result = await db.all<{ id: number }>("SELECT * FROM ordered ORDER BY id");
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
    expect(result[2].id).toBe(3);
  });
});
