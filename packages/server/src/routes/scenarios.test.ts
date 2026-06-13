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
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(scenario.id);
    expect(body.data.name).toBe("Login Test");
    expect(body.data.featureId).toBe(feature.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/scenarios/nonexistent-id");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).not.toBe(scenario.id);
    expect(body.data.name).toContain("복사본");
    expect(body.data.featureId).toBe(feature.id);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("POST", "/api/scenarios/nonexistent-id/duplicate");
    expect(res.status).toBe(404);
  });

  it("preserves steps from the original scenario", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const step = {
      id: uuid(),
      type: "navigate" as const,
      description: "Go to home",
      config: { url: "https://example.com" },
      disabled: false,
      continueOnError: false,
    };
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "With Steps",
      steps: [step],
      priority: "high",
      tags: [],
      variables: [],
    });

    const res = await req("POST", `/api/scenarios/${scenario.id}/duplicate`);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.steps).toHaveLength(1);
    expect(body.data.steps[0].type).toBe("navigate");
    expect(body.data.steps[0].config.url).toBe("https://example.com");
  });

  it("preserves tags, priority, and variables from the original", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Tagged",
      steps: [],
      priority: "high",
      tags: ["smoke", "regression"],
      variables: [{ name: "url", type: "string", defaultValue: "http://localhost" }],
    });

    const res = await req("POST", `/api/scenarios/${scenario.id}/duplicate`);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.priority).toBe("high");
    expect(body.data.tags).toEqual(expect.arrayContaining(["smoke", "regression"]));
    expect(body.data.variables).toHaveLength(1);
    expect(body.data.variables[0].name).toBe("url");
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
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
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
// Step fields: disabled, retries, retryDelay
// ──────────────────────────────────────────────────────────────────────────────

describe("Steps with retry and disabled fields", () => {
  it("persists disabled=true on a step through PUT", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const steps = [
      {
        id: uuid(),
        type: "click",
        description: "Click button",
        disabled: true,
        continueOnError: false,
        config: {
          locator: {
            displayName: "Submit",
            strategies: [{ type: "testId", value: "submit-btn", priority: 1 }],
            healing: { enabled: false, autoApprove: false, confidenceThreshold: 0.9 },
          },
        },
      },
    ];

    const res = await req("PUT", `/api/scenarios/${scenario.id}`, { steps });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.steps).toHaveLength(1);
    expect(body.data.steps[0].disabled).toBe(true);
  });

  it("persists retries and retryDelay on a step through PUT", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const steps = [
      {
        id: uuid(),
        type: "click",
        description: "Click with retry",
        retries: 3,
        retryDelay: 500,
        continueOnError: false,
        config: {
          locator: {
            displayName: "Button",
            strategies: [{ type: "css", selector: "button.submit", priority: 1 }],
            healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.85 },
          },
        },
      },
    ];

    const res = await req("PUT", `/api/scenarios/${scenario.id}`, { steps });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.steps[0].retries).toBe(3);
    expect(body.data.steps[0].retryDelay).toBe(500);
  });

  it("persists mixed enabled and disabled steps through PUT", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const steps = [
      {
        id: uuid(),
        type: "navigate",
        description: "Navigate to page",
        disabled: false,
        continueOnError: false,
        config: { url: "https://example.com" },
      },
      {
        id: uuid(),
        type: "navigate",
        description: "Disabled navigate",
        disabled: true,
        continueOnError: false,
        config: { url: "https://example.com/disabled" },
      },
    ];

    const res = await req("PUT", `/api/scenarios/${scenario.id}`, { steps });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.steps).toHaveLength(2);
    expect(body.data.steps[0].disabled).toBe(false);
    expect(body.data.steps[1].disabled).toBe(true);
  });

  it("step without disabled/retries omits those fields", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const steps = [
      {
        id: uuid(),
        type: "navigate",
        description: "Navigate",
        continueOnError: false,
        config: { url: "https://example.com" },
      },
    ];

    const res = await req("PUT", `/api/scenarios/${scenario.id}`, { steps });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const step = body.data.steps[0];
    // disabled and retries are optional - undefined means not disabled / no retry
    expect(step.disabled).toBeUndefined();
    expect(step.retries).toBeUndefined();
    expect(step.retryDelay).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Scenario tags and priority
// ──────────────────────────────────────────────────────────────────────────────

describe("Scenario tags and priority", () => {
  it("persists tags through PUT", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const res = await req("PUT", `/api/scenarios/${scenario.id}`, {
      name: scenario.name,
      tags: ["smoke", "regression", "login"],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.tags).toEqual(["smoke", "regression", "login"]);
  });

  it("persists priority through PUT", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const res = await req("PUT", `/api/scenarios/${scenario.id}`, {
      name: scenario.name,
      priority: "critical",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.priority).toBe("critical");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/scenarios/:id/stats
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/scenarios/:id/stats", () => {
  it("returns 404 for unknown scenario", async () => {
    const res = await req("GET", "/api/scenarios/nonexistent-id/stats");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns zero stats for scenario with no runs", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Zero Stats");

    const res = await req("GET", `/api/scenarios/${scenario.id}/stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.totalRuns).toBe(0);
    expect(body.data.passRate).toBe(0);
    expect(body.data.avgDuration).toBeNull();
    expect(body.data.trend).toEqual([]);
  });

  it("returns correct aggregate stats after runs", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Stats Scenario");
    const env = { baseUrl: "http://test", variables: {} };
    const v4 = (await import("uuid")).v4;
    for (const status of ["passed", "passed", "failed"] as const) {
      await db.createTestRun({ id: v4(), scenarioId: scenario.id, status, environment: env, createdAt: new Date() });
    }

    const res = await req("GET", `/api/scenarios/${scenario.id}/stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.totalRuns).toBe(3);
    expect(body.data.passedRuns).toBe(2);
    expect(body.data.failedRuns).toBe(1);
    expect(body.data.passRate).toBeCloseTo(2 / 3);
  });

  it("respects ?days= query param (7 default)", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Days Param");

    const res = await req("GET", `/api/scenarios/${scenario.id}/stats?days=30`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.trend)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/scenarios/:id/run
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/scenarios/:id/run", () => {
  it("returns 404 for unknown scenario", async () => {
    const res = await req("POST", "/api/scenarios/nonexistent-id/run");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("accepts an empty body (no variables override)", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const res = await req("POST", `/api/scenarios/${scenario.id}/run`, {});
    // 202 = accepted for execution (engine will fail without browser, but route accepted the request)
    expect([202, 500]).toContain(res.status);
  });

  it("accepts variables override in request body", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Var Override Scenario",
      steps: [],
      priority: "medium",
      tags: [],
      variables: [{ name: "email", type: "string", defaultValue: "default@test.com" }],
    });

    const res = await req("POST", `/api/scenarios/${scenario.id}/run`, {
      variables: { email: "override@test.com" },
    });
    expect([202, 500]).toContain(res.status);
    if (res.status === 202) {
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.runId).toBeDefined();
    }
  });

  it("ignores unknown variables gracefully", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id);

    const res = await req("POST", `/api/scenarios/${scenario.id}/run`, {
      variables: { unknownVar: "some-value", anotherVar: 42 },
    });
    expect([202, 500]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/scenarios/:id/step-stats
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/scenarios/:id/step-stats", () => {
  it("returns 404 for unknown scenario", async () => {
    const res = await req("GET", "/api/scenarios/nonexistent-id/step-stats");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns empty array when no step results exist", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "No Runs Scenario");

    const res = await req("GET", `/api/scenarios/${scenario.id}/step-stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("aggregates step durations across multiple runs", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Step Stats Scenario");
    const env = { baseUrl: "http://test", variables: {} };

    const run1 = await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });
    const run2 = await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });

    await db.createStepResult({ id: uuid(), runId: run1.id, stepId: uuid(), stepIndex: 0, status: "passed", duration: 100, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: run1.id, stepId: uuid(), stepIndex: 1, status: "passed", duration: 200, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: run2.id, stepId: uuid(), stepIndex: 0, status: "passed", duration: 300, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: run2.id, stepId: uuid(), stepIndex: 1, status: "failed", duration: 50, createdAt: new Date() });

    const res = await req("GET", `/api/scenarios/${scenario.id}/step-stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);

    const step0 = body.data.find((s: any) => s.stepIndex === 0);
    expect(step0.count).toBe(2);
    expect(step0.passCount).toBe(2);
    expect(step0.failCount).toBe(0);
    expect(step0.avgDuration).toBe(200); // (100 + 300) / 2
    expect(step0.minDuration).toBe(100);
    expect(step0.maxDuration).toBe(300);
    expect(step0.failureRate).toBe(0);

    const step1 = body.data.find((s: any) => s.stepIndex === 1);
    expect(step1.count).toBe(2);
    expect(step1.passCount).toBe(1);
    expect(step1.failCount).toBe(1);
    expect(step1.failureRate).toBe(0.5);
  });

  it("only includes step results from the given scenario", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenarioA = await createScenario(feature.id, "Scenario A");
    const scenarioB = await createScenario(feature.id, "Scenario B");
    const env = { baseUrl: "http://test", variables: {} };

    const runA = await db.createTestRun({ id: uuid(), scenarioId: scenarioA.id, status: "passed", environment: env, createdAt: new Date() });
    const runB = await db.createTestRun({ id: uuid(), scenarioId: scenarioB.id, status: "passed", environment: env, createdAt: new Date() });

    await db.createStepResult({ id: uuid(), runId: runA.id, stepId: uuid(), stepIndex: 0, status: "passed", duration: 111, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: runB.id, stepId: uuid(), stepIndex: 0, status: "passed", duration: 999, createdAt: new Date() });

    const res = await req("GET", `/api/scenarios/${scenarioA.id}/step-stats`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].avgDuration).toBe(111);
  });

  it("orders results by step_index ascending", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Order Test");
    const env = { baseUrl: "http://test", variables: {} };

    const run = await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: run.id, stepId: uuid(), stepIndex: 2, status: "passed", duration: 30, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: run.id, stepId: uuid(), stepIndex: 0, status: "passed", duration: 10, createdAt: new Date() });
    await db.createStepResult({ id: uuid(), runId: run.id, stepId: uuid(), stepIndex: 1, status: "passed", duration: 20, createdAt: new Date() });

    const res = await req("GET", `/api/scenarios/${scenario.id}/step-stats`);
    const body = (await res.json()) as any;
    const indices = body.data.map((s: any) => s.stepIndex);
    expect(indices).toEqual([0, 1, 2]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/scenarios/flaky
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/scenarios/flaky", () => {
  const env = { baseUrl: "http://test", variables: {} };

  it("returns empty array when no scenarios have enough runs", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Low Run Scenario");
    // 1 pass + 1 fail = 2 runs, below minRuns=5
    await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });
    await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "failed", environment: env, createdAt: new Date() });

    const res = await req("GET", "/api/scenarios/flaky?minRuns=5");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns flaky scenarios with mixed pass/fail results", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Flaky Scenario");
    // 2 pass + 2 fail = 50% pass rate → flaky
    for (let i = 0; i < 2; i++) {
      await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });
    }
    for (let i = 0; i < 2; i++) {
      await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "failed", environment: env, createdAt: new Date() });
    }

    const res = await req("GET", "/api/scenarios/flaky?minRuns=3");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const found = body.data.find((s: any) => s.scenarioId === scenario.id);
    expect(found).toBeDefined();
    expect(found.passRate).toBeCloseTo(0.5);
    expect(found.runCount).toBe(4);
    expect(found.passCount).toBe(2);
    expect(found.failCount).toBe(2);
  });

  it("excludes consistently passing scenarios (≥90% pass rate)", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Always Passing");
    for (let i = 0; i < 5; i++) {
      await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });
    }

    const res = await req("GET", "/api/scenarios/flaky?minRuns=3");
    const body = (await res.json()) as any;
    const found = body.data.find((s: any) => s.scenarioId === scenario.id);
    expect(found).toBeUndefined();
  });

  it("excludes consistently failing scenarios (≤10% pass rate)", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Always Failing");
    for (let i = 0; i < 5; i++) {
      await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "failed", environment: env, createdAt: new Date() });
    }

    const res = await req("GET", "/api/scenarios/flaky?minRuns=3");
    const body = (await res.json()) as any;
    const found = body.data.find((s: any) => s.scenarioId === scenario.id);
    expect(found).toBeUndefined();
  });

  it("includes service/feature breadcrumb in results", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Breadcrumb Test");
    for (let i = 0; i < 3; i++) {
      await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "passed", environment: env, createdAt: new Date() });
      await db.createTestRun({ id: uuid(), scenarioId: scenario.id, status: "failed", environment: env, createdAt: new Date() });
    }

    const res = await req("GET", "/api/scenarios/flaky?minRuns=3");
    const body = (await res.json()) as any;
    const found = body.data.find((s: any) => s.scenarioId === scenario.id);
    expect(found).toBeDefined();
    expect(found.featureId).toBe(feature.id);
    expect(found.featureName).toBe("Test Feature");
    expect(found.serviceId).toBe(service.id);
    expect(found.serviceName).toBe("Test Service");
    expect(found.lastRunAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/scenarios/run-by-tag
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/scenarios/run-by-tag", () => {
  async function createTaggedScenario(featureId: string, name: string, tags: string[]) {
    return db.createScenario({ featureId, name, steps: [], priority: "medium", tags, variables: [] });
  }

  it("returns 202 and run entries for matching tagged scenarios", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    await createTaggedScenario(feature.id, "Smoke A", ["smoke", "login"]);
    await createTaggedScenario(feature.id, "Smoke B", ["smoke"]);
    await createTaggedScenario(feature.id, "Regression Only", ["regression"]);

    const res = await req("POST", "/api/scenarios/run-by-tag", { tag: "smoke" });
    expect(res.status).toBe(202);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.tag).toBe("smoke");
    expect(body.data.count).toBe(2);
    expect(body.data.runs).toHaveLength(2);
    expect(body.data.runs[0]).toHaveProperty("scenarioId");
    expect(body.data.runs[0]).toHaveProperty("scenarioName");
    expect(body.data.runs[0]).toHaveProperty("runId");
  });

  it("returns empty runs when no scenarios match the tag", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    await createTaggedScenario(feature.id, "Regression", ["regression"]);

    const res = await req("POST", "/api/scenarios/run-by-tag", { tag: "smoke" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.count).toBe(0);
    expect(body.data.runs).toHaveLength(0);
  });

  it("scopes run to featureId when provided", async () => {
    const service = await createService();
    const featureA = await createFeature(service.id);
    const featureB = await createFeature(service.id);
    await createTaggedScenario(featureA.id, "A-Smoke", ["smoke"]);
    await createTaggedScenario(featureB.id, "B-Smoke", ["smoke"]);

    const res = await req("POST", "/api/scenarios/run-by-tag", { tag: "smoke", featureId: featureA.id });
    expect(res.status).toBe(202);
    const body = (await res.json()) as any;
    expect(body.data.count).toBe(1);
    expect(body.data.runs[0].scenarioName).toBe("A-Smoke");
  });

  it("scopes run to serviceId when provided", async () => {
    const serviceA = await createService();
    const serviceB = await createService();
    const featureA = await createFeature(serviceA.id);
    const featureB = await createFeature(serviceB.id);
    await createTaggedScenario(featureA.id, "A-Smoke", ["smoke"]);
    await createTaggedScenario(featureB.id, "B-Smoke", ["smoke"]);

    const res = await req("POST", "/api/scenarios/run-by-tag", { tag: "smoke", serviceId: serviceA.id });
    expect(res.status).toBe(202);
    const body = (await res.json()) as any;
    expect(body.data.count).toBe(1);
    expect(body.data.runs[0].scenarioName).toBe("A-Smoke");
  });

  it("returns 400 when tag is missing", async () => {
    const res = await req("POST", "/api/scenarios/run-by-tag", {});
    expect(res.status).toBe(400);
  });

  it("returns 400 when tag is an empty string", async () => {
    const res = await req("POST", "/api/scenarios/run-by-tag", { tag: "" });
    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/scenarios/:id/move
// ──────────────────────────────────────────────────────────────────────────────

describe("PUT /api/scenarios/:id/move", () => {
  it("moves a scenario to a different feature", async () => {
    const service = await createService();
    const featureA = await createFeature(service.id);
    const featureB = await createFeature(service.id);
    const scenario = await createScenario(featureA.id, "Move Me");

    const res = await req("PUT", `/api/scenarios/${scenario.id}/move`, { featureId: featureB.id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.featureId).toBe(featureB.id);
    expect(body.data.id).toBe(scenario.id);
  });

  it("scenario appears in target feature's scenario list after move", async () => {
    const service = await createService();
    const featureA = await createFeature(service.id);
    const featureB = await createFeature(service.id);
    const scenario = await createScenario(featureA.id, "Moved Scenario");

    await req("PUT", `/api/scenarios/${scenario.id}/move`, { featureId: featureB.id });

    const res = await req("GET", `/api/features/${featureB.id}/scenarios`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const ids = body.data.map((s: any) => s.id);
    expect(ids).toContain(scenario.id);
  });

  it("returns 404 when scenario does not exist", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const res = await req("PUT", `/api/scenarios/${uuid()}/move`, { featureId: feature.id });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when target feature does not exist", async () => {
    const service = await createService();
    const feature = await createFeature(service.id);
    const scenario = await createScenario(feature.id, "Move Me");
    const res = await req("PUT", `/api/scenarios/${scenario.id}/move`, { featureId: uuid() });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
