/**
 * Features API Integration Tests
 *
 * Tests the /api/features routes using an in-memory DuckDB and Hono's
 * built-in request testing utilities.
 */

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

async function req(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return app.request(`http://localhost${path}`, init);
}

// Helpers to create prerequisite data
async function createService() {
  return db.createService({
    name: "Test Service",
    baseUrl: "https://example.com",
    defaultTimeout: 30000,
  });
}

async function createFeature(serviceId: string, name = "Login Feature") {
  return db.createFeature({ serviceId, name, description: "desc", owners: [] });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/features/:id
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/features/:id", () => {
  it("returns a feature by ID", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("GET", `/api/features/${feature.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(feature.id);
    expect(body.data.name).toBe("Login Feature");
    expect(body.data.serviceId).toBe(service.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/features/nonexistent-id");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/features/:id
// ──────────────────────────────────────────────────────────────────────────────

describe("PUT /api/features/:id", () => {
  it("updates a feature's name", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("PUT", `/api/features/${feature.id}`, {
      name: "Updated Feature",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Updated Feature");
    expect(body.data.serviceId).toBe(service.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("PUT", "/api/features/nonexistent-id", {
      name: "X",
    });
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/features/:id
// ──────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/features/:id", () => {
  it("deletes a feature", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("DELETE", `/api/features/${feature.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Confirm it's gone
    const getRes = await req("GET", `/api/features/${feature.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("DELETE", "/api/features/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/features/:featureId/scenarios
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/features/:featureId/scenarios", () => {
  it("returns empty list when feature has no scenarios", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("GET", `/api/features/${feature.id}/scenarios`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns scenarios belonging to the feature", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    await db.createScenario({ featureId: feature.id, name: "Scenario A", steps: [], priority: "medium", tags: [], variables: [] });
    await db.createScenario({ featureId: feature.id, name: "Scenario B", steps: [], priority: "medium", tags: [], variables: [] });
    const res = await req("GET", `/api/features/${feature.id}/scenarios`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    const names = body.data.map((s: { name: string }) => s.name).sort();
    expect(names).toEqual(["Scenario A", "Scenario B"]);
  });

  it("returns 404 for unknown feature", async () => {
    const res = await req("GET", "/api/features/nonexistent/scenarios");
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/features/:featureId/scenarios
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/features/:featureId/scenarios", () => {
  it("creates a scenario under a feature", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("POST", `/api/features/${feature.id}/scenarios`, {
      name: "Login Test",
      featureId: feature.id,
      steps: [],
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Login Test");
    expect(body.data.featureId).toBe(feature.id);
    expect(body.data.id).toBeTruthy();
  });

  it("returns 400 for missing required fields", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("POST", `/api/features/${feature.id}/scenarios`, {
      featureId: feature.id,
      // missing name
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown feature UUID", async () => {
    const fakeUUID = "00000000-0000-0000-0000-000000000000";
    const res = await req("POST", `/api/features/${fakeUUID}/scenarios`, {
      name: "Test",
      featureId: fakeUUID,
      steps: [],
    });
    expect(res.status).toBe(404);
  });
});
