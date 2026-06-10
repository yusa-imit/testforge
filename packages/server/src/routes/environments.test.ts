import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import app from "../index";
import { setupTestDB } from "../test-helpers/setup";
import type { DuckDBDatabase } from "../db/database";

let db: DuckDBDatabase;
let teardown: () => void;

beforeEach(async () => {
  ({ db, teardown } = await setupTestDB());
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  teardown();
});

async function req(method: string, path: string, body?: unknown): Promise<Response> {
  return app.request(`http://localhost${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/environments", () => {
  it("returns empty list when no environments exist", async () => {
    const res = await req("GET", "/api/environments");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns list of created environments", async () => {
    await db.createEnvironment({ name: "Staging", baseUrl: "https://staging.example.com" });
    await db.createEnvironment({ name: "Production", baseUrl: "https://prod.example.com" });
    const res = await req("GET", "/api/environments");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(2);
  });

  it("returns default environment first", async () => {
    await db.createEnvironment({ name: "Local", isDefault: false });
    await db.createEnvironment({ name: "Staging", isDefault: true });
    const res = await req("GET", "/api/environments");
    const body = (await res.json()) as any;
    expect(body.data[0].name).toBe("Staging");
    expect(body.data[0].isDefault).toBe(true);
  });
});

describe("POST /api/environments", () => {
  it("creates an environment with minimal payload", async () => {
    const res = await req("POST", "/api/environments", { name: "Local" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("Local");
    expect(body.data.baseUrl).toBeUndefined();
    expect(body.data.variables).toEqual({});
    expect(body.data.isDefault).toBe(false);
  });

  it("creates an environment with full payload", async () => {
    const res = await req("POST", "/api/environments", {
      name: "Staging",
      description: "Staging server",
      baseUrl: "https://staging.example.com",
      variables: { API_KEY: "staging-key", TIMEOUT: 5000 },
      isDefault: true,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("Staging");
    expect(body.data.baseUrl).toBe("https://staging.example.com");
    expect(body.data.variables).toEqual({ API_KEY: "staging-key", TIMEOUT: 5000 });
    expect(body.data.isDefault).toBe(true);
  });

  it("only one environment can be default", async () => {
    await req("POST", "/api/environments", { name: "Env A", isDefault: true });
    await req("POST", "/api/environments", { name: "Env B", isDefault: true });
    const res = await req("GET", "/api/environments");
    const body = (await res.json()) as any;
    const defaults = body.data.filter((e: any) => e.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe("Env B");
  });

  it("rejects missing name", async () => {
    const res = await req("POST", "/api/environments", { baseUrl: "https://example.com" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid base URL", async () => {
    const res = await req("POST", "/api/environments", { name: "Bad", baseUrl: "not-a-url" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/environments/:id", () => {
  it("returns the environment by id", async () => {
    const env = await db.createEnvironment({ name: "Dev", baseUrl: "http://localhost:3000" });
    const res = await req("GET", `/api/environments/${env.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(env.id);
    expect(body.data.name).toBe("Dev");
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("GET", "/api/environments/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/environments/:id", () => {
  it("updates an environment", async () => {
    const env = await db.createEnvironment({ name: "Dev" });
    const res = await req("PUT", `/api/environments/${env.id}`, {
      name: "Development",
      baseUrl: "http://localhost:4000",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("Development");
    expect(body.data.baseUrl).toBe("http://localhost:4000");
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("PUT", "/api/environments/nonexistent-id", { name: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/environments/:id", () => {
  it("deletes an environment", async () => {
    const env = await db.createEnvironment({ name: "Temp" });
    const res = await req("DELETE", `/api/environments/${env.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    const check = await db.getEnvironment(env.id);
    expect(check).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("DELETE", "/api/environments/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
