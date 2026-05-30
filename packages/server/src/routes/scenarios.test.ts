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
      type: "navigate",
      description: "Go to home",
      config: { url: "https://example.com" },
      disabled: false,
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
// POST /api/scenarios/:id/run
// ──────────────────────────────────────────────────────────────────────────────

describe("POST /api/scenarios/:id/run", () => {
  it("returns 404 for unknown scenario", async () => {
    const res = await req("POST", "/api/scenarios/nonexistent-id/run");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
