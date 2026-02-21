/**
 * Runs API Integration Tests
 *
 * Tests the /api/runs routes (read-only operations only; execution
 * requires Playwright which is not available in unit/integration tests).
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
});

afterEach(() => {
  teardown();
});

async function req(method: string, path: string, body?: unknown): Promise<Response> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return app.request(`http://localhost${path}`, init);
}

// Helper to seed a complete hierarchy and create a test run
async function createTestRun(status: "passed" | "failed" | "running" = "passed") {
  const service = await db.createService({
    name: "Test Service",
    baseUrl: "https://example.com",
    defaultTimeout: 30000,
  });
  const feature = await db.createFeature({
    serviceId: service.id,
    name: "Test Feature",
    owners: [],
  });
  const scenario = await db.createScenario({
    featureId: feature.id,
    name: "Test Scenario",
    steps: [],
    variables: [],
    tags: [],
    priority: "medium",
  });

  const runId = uuid();
  const now = new Date();
  await db.createTestRun({
    id: runId,
    scenarioId: scenario.id,
    status,
    environment: { baseUrl: service.baseUrl, variables: {} },
    startedAt: now,
    createdAt: now,
  });

  return { service, feature, scenario, runId };
}

describe("GET /api/runs", () => {
  it("returns empty list when no runs exist", async () => {
    const res = await req("GET", "/api/runs");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns created runs", async () => {
    await createTestRun("passed");
    const res = await req("GET", "/api/runs");
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("passed");
  });

  it("respects limit parameter", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs?limit=1");
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("includes scenario name in run data", async () => {
    const { scenario } = await createTestRun("passed");
    const res = await req("GET", "/api/runs");
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].scenarioName).toBe(scenario.name);
  });
});

describe("GET /api/runs/dashboard", () => {
  it("returns dashboard stats", async () => {
    const res = await req("GET", "/api/runs/dashboard");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.stats).toBeDefined();
    expect(body.data.stats.total).toBeDefined();
    expect(body.data.stats.passed).toBeDefined();
    expect(body.data.stats.failed).toBeDefined();
  });

  it("counts runs by status correctly", async () => {
    await createTestRun("passed");
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs/dashboard");
    const body = await res.json();
    // Note: dashboard only shows runs from last 24h
    expect(body.data.stats.total).toBe(3);
    expect(body.data.stats.passed).toBe(2);
    expect(body.data.stats.failed).toBe(1);
  });
});

describe("GET /api/runs/:id", () => {
  it("returns a run by ID", async () => {
    const { runId } = await createTestRun("passed");
    const res = await req("GET", `/api/runs/${runId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(runId);
    expect(body.data.status).toBe("passed");
  });

  it("returns 404 for unknown run ID", async () => {
    const res = await req("GET", "/api/runs/nonexistent-run-id");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/runs/:id/steps", () => {
  it("returns step results for a run (empty for new run)", async () => {
    const { runId } = await createTestRun();
    const res = await req("GET", `/api/runs/${runId}/steps`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("returns step results when steps exist", async () => {
    const { runId } = await createTestRun();
    const stepId = uuid();
    await db.createStepResult({
      id: uuid(),
      runId,
      stepId,
      stepIndex: 0,
      status: "passed",
      duration: 123,
      createdAt: new Date(),
    });
    const res = await req("GET", `/api/runs/${runId}/steps`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].runId).toBe(runId);
    expect(body.data[0].stepIndex).toBe(0);
    expect(body.data[0].status).toBe("passed");
    expect(body.data[0].duration).toBe(123);
  });

  it("returns 404 for unknown run", async () => {
    const res = await req("GET", "/api/runs/nonexistent-run/steps");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/runs/:id (cancel)", () => {
  it("cancels a running run", async () => {
    const { runId } = await createTestRun("running");
    const res = await req("DELETE", `/api/runs/${runId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("cancelled");
  });

  it("returns 400 for already-completed run", async () => {
    const { runId } = await createTestRun("passed");
    const res = await req("DELETE", `/api/runs/${runId}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 404 for unknown run", async () => {
    const res = await req("DELETE", "/api/runs/nonexistent-run");
    expect(res.status).toBe(404);
  });
});
