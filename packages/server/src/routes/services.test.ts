/**
 * Services API Integration Tests
 *
 * Tests the /api/services routes using an in-memory DuckDB and Hono's
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
  // Suppress logger output during tests
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  teardown();
});

// Helper: make a request via Hono's test interface
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

// Sample service payload
const servicePayload = {
  name: "My App",
  description: "Test service",
  baseUrl: "https://example.com",
  defaultTimeout: 30000,
};

describe("GET /api/services", () => {
  it("returns empty list when no services exist", async () => {
    const res = await req("GET", "/api/services");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns created services", async () => {
    await db.createService(servicePayload);
    const res = await req("GET", "/api/services");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("My App");
  });

  it("includes featureCount and scenarioCount stats", async () => {
    const svc = await db.createService(servicePayload);
    const feature = await db.createFeature({ serviceId: svc.id, name: "F1", owners: [] });
    await db.createScenario({ featureId: feature.id, name: "S1", tags: [], priority: "medium", variables: [], steps: [] });
    await db.createScenario({ featureId: feature.id, name: "S2", tags: [], priority: "medium", variables: [], steps: [] });

    const res = await req("GET", "/api/services");
    const body = (await res.json()) as any;
    expect(body.data[0].featureCount).toBe(1);
    expect(body.data[0].scenarioCount).toBe(2);
    expect(body.data[0].lastRunStatus).toBeNull();
  });

  it("includes lastRunStatus from most recent run", async () => {
    const svc = await db.createService(servicePayload);
    const feature = await db.createFeature({ serviceId: svc.id, name: "F-run", owners: [] });
    const scenario = await db.createScenario({ featureId: feature.id, name: "S-run", tags: [], priority: "medium", variables: [], steps: [] });
    const env = { baseUrl: "http://localhost", variables: {} };
    const { v4: genId } = await import("uuid");
    await db.createTestRun({ id: genId(), scenarioId: scenario.id, status: "failed", environment: env, createdAt: new Date(Date.now() - 5000) });
    await db.createTestRun({ id: genId(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date(Date.now() - 1000) });

    const res = await req("GET", "/api/services");
    const body = (await res.json()) as any;
    expect(body.data[0].lastRunStatus).toBe("passed");
  });
});

describe("POST /api/services", () => {
  it("creates a service with valid data", async () => {
    const res = await req("POST", "/api/services", servicePayload);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("My App");
    expect(body.data.baseUrl).toBe("https://example.com");
    expect(body.data.id).toBeTruthy();
  });

  it("returns 400 for missing required fields", async () => {
    const res = await req("POST", "/api/services", { description: "No name" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBeTruthy();
  });

  it("returns 400 for empty name", async () => {
    const res = await req("POST", "/api/services", {
      name: "",
      baseUrl: "https://example.com",
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/services/:id", () => {
  it("returns a service by ID", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("GET", `/api/services/${service.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(service.id);
    expect(body.data.name).toBe("My App");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/services/nonexistent-id");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/services/:id", () => {
  it("updates a service", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("PUT", `/api/services/${service.id}`, {
      name: "Updated Name",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Updated Name");
    expect(body.data.baseUrl).toBe("https://example.com");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("PUT", "/api/services/nonexistent-id", {
      name: "X",
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/services/:id", () => {
  it("deletes a service", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("DELETE", `/api/services/${service.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);

    // Confirm it's gone
    const getRes = await req("GET", `/api/services/${service.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("DELETE", "/api/services/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/services/:serviceId/features", () => {
  it("returns empty list when service has no features", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("GET", `/api/services/${service.id}/features`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
  });

  it("returns features for a service", async () => {
    const service = await db.createService(servicePayload);
    await db.createFeature({
      serviceId: service.id,
      name: "Feature A",
      description: "desc",
      owners: [],
    });
    const res = await req("GET", `/api/services/${service.id}/features`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Feature A");
  });

  it("returns 404 for unknown service", async () => {
    const res = await req("GET", "/api/services/nonexistent/features");
    expect(res.status).toBe(404);
  });

  it("returns scenarioCount for each feature", async () => {
    const service = await db.createService(servicePayload);
    const feature = await db.createFeature({ serviceId: service.id, name: "F-Count", owners: [] });
    await db.createScenario({ featureId: feature.id, name: "S1", tags: [], priority: "medium", variables: [], steps: [] });
    await db.createScenario({ featureId: feature.id, name: "S2", tags: [], priority: "medium", variables: [], steps: [] });

    const res = await req("GET", `/api/services/${service.id}/features`);
    const body = (await res.json()) as any;
    expect(body.data[0].scenarioCount).toBe(2);
  });

  it("returns lastRunStatus for each feature", async () => {
    const env = { baseUrl: "http://localhost", variables: {} };
    const service = await db.createService(servicePayload);
    const feature = await db.createFeature({ serviceId: service.id, name: "F-LastRun", owners: [] });
    const scenario = await db.createScenario({ featureId: feature.id, name: "SR", tags: [], priority: "medium", variables: [], steps: [] });
    await db.createTestRun({ id: crypto.randomUUID(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });

    const res = await req("GET", `/api/services/${service.id}/features`);
    const body = (await res.json()) as any;
    expect(body.data[0].lastRunStatus).toBe("passed");
    expect(body.data[0].lastRunId).toBeDefined();
  });
});

describe("POST /api/services/:serviceId/features", () => {
  it("creates a feature under a service", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("POST", `/api/services/${service.id}/features`, {
      name: "Login Feature",
      description: "All login tests",
      serviceId: service.id,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Login Feature");
    expect(body.data.serviceId).toBe(service.id);
  });

  it("returns 404 for unknown service UUID", async () => {
    const fakeUUID = "00000000-0000-0000-0000-000000000000";
    const res = await req("POST", `/api/services/${fakeUUID}/features`, {
      name: "Feature",
      serviceId: fakeUUID,
    });
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/services/:id/run
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/services/:id/run", () => {
  it("returns 404 for unknown service", async () => {
    const res = await req("POST", "/api/services/nonexistent-id/run");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 200 with empty runIds when service has no features", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("POST", `/api/services/${service.id}/run`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.runIds).toEqual([]);
    expect(body.data.message).toBe("No scenarios to run.");
  });

  it("returns 200 with empty runIds when service has features but no scenarios", async () => {
    const service = await db.createService(servicePayload);
    await db.createFeature({ serviceId: service.id, name: "Empty Feature", owners: [] });
    const res = await req("POST", `/api/services/${service.id}/run`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.runIds).toEqual([]);
    expect(body.data.message).toBe("No scenarios to run.");
  });

  it("includes all scenarios from multiple features in run count", async () => {
    const service = await db.createService(servicePayload);
    const f1 = await db.createFeature({ serviceId: service.id, name: "Feature 1", owners: [] });
    const f2 = await db.createFeature({ serviceId: service.id, name: "Feature 2", owners: [] });
    const scenarioBase = { tags: [] as string[], priority: "medium" as const, variables: [] as any[], steps: [] as any[] };
    await db.createScenario({ featureId: f1.id, name: "Scenario A", ...scenarioBase });
    await db.createScenario({ featureId: f2.id, name: "Scenario B", ...scenarioBase });

    const res = await req("POST", `/api/services/${service.id}/run`);
    expect(res.status).toBe(202);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.runIds).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.message).toContain("2 scenario(s)");
    expect(body.data.message).toContain("2 feature(s)");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/services/:id/stats
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/services/:id/stats", () => {
  const env = { baseUrl: "http://test", variables: {} };

  it("returns 404 for unknown service", async () => {
    const res = await req("GET", "/api/services/no-such-id/stats");
    expect(res.status).toBe(404);
  });

  it("returns zero stats for service with no runs", async () => {
    const service = await db.createService(servicePayload);
    const res = await req("GET", `/api/services/${service.id}/stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.totalRuns).toBe(0);
    expect(body.data.passRate).toBe(0);
    expect(body.data.trend).toEqual([]);
  });

  it("aggregates runs across features and scenarios", async () => {
    const service = await db.createService(servicePayload);
    const feat = await db.createFeature({ serviceId: service.id, name: "F1", owners: [] });
    const s = await db.createScenario({ featureId: feat.id, name: "S1", tags: [], priority: "medium" as const, variables: [], steps: [] });
    await db.createTestRun({ id: crypto.randomUUID(), scenarioId: s.id, status: "passed", environment: env, createdAt: new Date() });
    await db.createTestRun({ id: crypto.randomUUID(), scenarioId: s.id, status: "failed", environment: env, createdAt: new Date() });
    const res = await req("GET", `/api/services/${service.id}/stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.totalRuns).toBe(2);
    expect(body.data.passedRuns).toBe(1);
    expect(body.data.failedRuns).toBe(1);
    expect(body.data.passRate).toBeCloseTo(0.5);
  });

  it("respects ?days query param", async () => {
    const service = await db.createService(servicePayload);
    const feat = await db.createFeature({ serviceId: service.id, name: "F2", owners: [] });
    const s = await db.createScenario({ featureId: feat.id, name: "S2", tags: [], priority: "low" as const, variables: [], steps: [] });
    await db.createTestRun({ id: crypto.randomUUID(), scenarioId: s.id, status: "passed", environment: env, createdAt: new Date() });
    const res = await req("GET", `/api/services/${service.id}/stats?days=30`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.totalRuns).toBe(1);
  });
});

// ============================================================
// defaultVariables: PRD Appendix B — service-level variable defaults
// ============================================================
describe("Service defaultVariables", () => {
  it("creates service with defaultVariables and returns them", async () => {
    const res = await req("POST", "/api/services", {
      name: "Var Service",
      baseUrl: "https://example.com",
      defaultVariables: [
        { name: "apiKey", type: "string", defaultValue: "secret-123" },
        { name: "retries", type: "number", defaultValue: 3 },
      ],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.defaultVariables).toHaveLength(2);
    expect(body.data.defaultVariables[0].name).toBe("apiKey");
    expect(body.data.defaultVariables[0].defaultValue).toBe("secret-123");
  });

  it("defaults to empty array when not provided", async () => {
    const res = await req("POST", "/api/services", servicePayload);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.defaultVariables).toEqual([]);
  });

  it("returns defaultVariables in GET /api/services/:id", async () => {
    const svc = await db.createService({
      ...servicePayload,
      defaultVariables: [{ name: "env", type: "string", defaultValue: "staging" }],
    });
    const res = await req("GET", `/api/services/${svc.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.defaultVariables).toHaveLength(1);
    expect(body.data.defaultVariables[0].name).toBe("env");
  });

  it("updates defaultVariables via PUT", async () => {
    const svc = await db.createService(servicePayload);
    const res = await req("PUT", `/api/services/${svc.id}`, {
      defaultVariables: [{ name: "timeout", type: "number", defaultValue: 5000 }],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.defaultVariables).toHaveLength(1);
    expect(body.data.defaultVariables[0].name).toBe("timeout");
  });

  it("returns defaultVariables in GET /api/services list", async () => {
    await db.createService({
      ...servicePayload,
      defaultVariables: [{ name: "region", type: "string", defaultValue: "us-east-1" }],
    });
    const res = await req("GET", "/api/services");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data[0].defaultVariables).toHaveLength(1);
    expect(body.data[0].defaultVariables[0].name).toBe("region");
  });
});
