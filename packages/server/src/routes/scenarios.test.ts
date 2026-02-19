/**
 * Scenarios API Integration Tests
 *
 * Tests the /api/scenarios routes using an in-memory DuckDB and Hono's
 * built-in request testing utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { v4 as uuid } from "uuid";
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

// ── Setup helpers ─────────────────────────────────────────────────────────────

async function createService() {
  return db.createService({
    name: "Test Service",
    baseUrl: "https://example.com",
    defaultTimeout: 30000,
  });
}

async function createFeature(serviceId: string) {
  return db.createFeature({ serviceId, name: "Test Feature", description: "", owners: [] });
}

async function createScenario(featureId: string, name = "Test Scenario") {
  return db.createScenario({ featureId, name, steps: [], priority: "medium", tags: [], variables: [] });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/scenarios/:id
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/scenarios/:id", () => {
  it("returns a scenario by ID", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Login Test");
    const res = await req("GET", `/api/scenarios/${scenario.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(scenario.id);
    expect(body.data.name).toBe("Login Test");
    expect(body.data.featureId).toBe(feature.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/scenarios/nonexistent-id");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/scenarios/:id
// ──────────────────────────────────────────────────────────────────────────────

describe("PUT /api/scenarios/:id", () => {
  it("updates a scenario's name", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);
    const res = await req("PUT", `/api/scenarios/${scenario.id}`, {
      name: "Updated Scenario",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Updated Scenario");
    expect(body.data.featureId).toBe(feature.id);
  });

  it("updates a scenario's description", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);
    const res = await req("PUT", `/api/scenarios/${scenario.id}`, {
      name: scenario.name,
      description: "Updated description",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.description).toBe("Updated description");
    expect(body.data.featureId).toBe(feature.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("PUT", "/api/scenarios/nonexistent-id", {
      name: "X",
    });
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/scenarios/:id
// ──────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/scenarios/:id", () => {
  it("deletes a scenario", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);
    const res = await req("DELETE", `/api/scenarios/${scenario.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Confirm it's gone
    const getRes = await req("GET", `/api/scenarios/${scenario.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("DELETE", "/api/scenarios/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/scenarios/:id/duplicate
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/scenarios/:id/duplicate", () => {
  it("duplicates a scenario", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Original");
    const res = await req("POST", `/api/scenarios/${scenario.id}/duplicate`);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).not.toBe(scenario.id);
    expect(body.data.name).toContain("복사본");
    expect(body.data.featureId).toBe(feature.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("POST", "/api/scenarios/nonexistent-id/duplicate");
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/scenarios/:id/runs
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/scenarios/:id/runs", () => {
  it("returns empty list when scenario has no runs", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);
    const res = await req("GET", `/api/scenarios/${scenario.id}/runs`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns run history for a scenario", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);
    const now = new Date();
    await db.createTestRun({
      id: uuid(),
      scenarioId: scenario.id,
      status: "passed",
      environment: { baseUrl: service.baseUrl, variables: {} },
      startedAt: now,
      createdAt: now,
    });
    const res = await req("GET", `/api/scenarios/${scenario.id}/runs`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].scenarioId).toBe(scenario.id);
    expect(body.data[0].status).toBe("passed");
  });

  it("returns 404 for unknown scenario", async () => {
    const res = await req("GET", "/api/scenarios/nonexistent-id/runs");
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/scenarios/:id/run
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/scenarios/:id/run", () => {
  it("returns 404 for unknown scenario", async () => {
    const res = await req("POST", "/api/scenarios/nonexistent-id/run");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
