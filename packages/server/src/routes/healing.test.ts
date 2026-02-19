/**
 * Healing API Integration Tests
 *
 * Tests the /api/healing routes using an in-memory DuckDB and Hono's
 * built-in request testing utilities.
 *
 * healing_records has FK constraints:
 *   scenario_id → scenarios(id)
 *   run_id      → test_runs(id)
 * So we must create service → feature → scenario → test_run first.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { v4 as uuid } from "uuid";
import app from "../index";
import { setupTestDB } from "../test-helpers/setup";
import type { DuckDBDatabase } from "../db/database";
import type { HealingRecord } from "@testforge/core";

let db: DuckDBDatabase;
let teardown: () => void;

// Shared IDs created once per test (beforeEach)
let scenarioId: string;
let runId: string;

beforeEach(async () => {
  ({ db, teardown } = await setupTestDB());
  process.env.NODE_ENV = "test";

  // Build the required hierarchy for FK constraints
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
  scenarioId = scenario.id;

  runId = uuid();
  const now = new Date();
  await db.createTestRun({
    id: runId,
    scenarioId,
    status: "passed",
    environment: { baseUrl: service.baseUrl, variables: {} },
    startedAt: now,
    createdAt: now,
  });
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

// Factory: create a healing record with proper FK references
async function createHealingRecord(
  overrides: Partial<HealingRecord> = {}
): Promise<HealingRecord> {
  const record: HealingRecord = {
    id: uuid(),
    scenarioId,
    stepId: uuid(),
    runId,
    locatorDisplayName: "Submit Button",
    originalStrategy: { type: "css", selector: ".btn-old", priority: 1 },
    healedStrategy: { type: "testId", value: "submit-btn", priority: 1 },
    trigger: "element_not_found",
    confidence: 0.92,
    status: "pending",
    createdAt: new Date(),
    ...overrides,
  };
  return db.createHealingRecord(record);
}

describe("GET /api/healing", () => {
  it("returns empty list when no records exist", async () => {
    const res = await req("GET", "/api/healing");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns all healing records", async () => {
    await createHealingRecord();
    await createHealingRecord({ locatorDisplayName: "Login Button" });
    const res = await req("GET", "/api/healing");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("filters records by status=pending", async () => {
    await createHealingRecord({ status: "pending" });
    await createHealingRecord({ status: "approved" });
    const res = await req("GET", "/api/healing?status=pending");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("pending");
  });

  it("filters records by status=approved", async () => {
    await createHealingRecord({ status: "pending" });
    await createHealingRecord({ status: "approved" });
    await createHealingRecord({ status: "rejected" });
    const res = await req("GET", "/api/healing?status=approved");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("approved");
  });
});

describe("GET /api/healing/stats", () => {
  it("returns zero stats when no records exist", async () => {
    const res = await req("GET", "/api/healing/stats");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(0);
    expect(body.data.pending).toBe(0);
    expect(body.data.approved).toBe(0);
    expect(body.data.rejected).toBe(0);
  });

  it("returns correct stats with mixed statuses", async () => {
    await createHealingRecord({ status: "pending" });
    await createHealingRecord({ status: "pending" });
    await createHealingRecord({ status: "approved" });
    await createHealingRecord({ status: "rejected" });
    await createHealingRecord({ status: "auto_approved" });

    const res = await req("GET", "/api/healing/stats");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.total).toBe(5);
    expect(body.data.pending).toBe(2);
    expect(body.data.approved).toBe(1);
    expect(body.data.rejected).toBe(1);
    expect(body.data.autoApproved).toBe(1);
  });
});

describe("GET /api/healing/:id", () => {
  it("returns a healing record by ID", async () => {
    const record = await createHealingRecord();
    const res = await req("GET", `/api/healing/${record.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(record.id);
    expect(body.data.locatorDisplayName).toBe("Submit Button");
    expect(body.data.status).toBe("pending");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/healing/nonexistent-id");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/healing/:id/approve", () => {
  it("approves a pending healing record", async () => {
    const record = await createHealingRecord({ status: "pending" });
    const res = await req("POST", `/api/healing/${record.id}/approve`, {
      reviewedBy: "qa-engineer",
      reviewNote: "Looks good",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("approved");
    expect(body.data.reviewedBy).toBe("qa-engineer");
    expect(body.data.reviewNote).toBe("Looks good");
  });

  it("approves with no review metadata", async () => {
    const record = await createHealingRecord({ status: "pending" });
    const res = await req("POST", `/api/healing/${record.id}/approve`, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("approved");
  });

  it("returns 400 when record is not pending", async () => {
    const record = await createHealingRecord({ status: "approved" });
    const res = await req("POST", `/api/healing/${record.id}/approve`, {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("POST", "/api/healing/nonexistent-id/approve", {});
    expect(res.status).toBe(404);
  });
});

describe("POST /api/healing/:id/reject", () => {
  it("rejects a pending healing record", async () => {
    const record = await createHealingRecord({ status: "pending" });
    const res = await req("POST", `/api/healing/${record.id}/reject`, {
      reviewedBy: "reviewer",
      reviewNote: "False positive",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("rejected");
    expect(body.data.reviewNote).toBe("False positive");
  });

  it("returns 400 when record is not pending", async () => {
    const record = await createHealingRecord({ status: "rejected" });
    const res = await req("POST", `/api/healing/${record.id}/reject`, {});
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("POST", "/api/healing/nonexistent-id/reject", {});
    expect(res.status).toBe(404);
  });
});

describe("POST /api/healing/:id/propagate", () => {
  it("returns 404 for unknown healing record", async () => {
    const res = await req("POST", "/api/healing/nonexistent-id/propagate");
    expect(res.status).toBe(404);
  });

  it("returns 400 when record is not approved", async () => {
    const record = await createHealingRecord({ status: "pending" });
    const res = await req("POST", `/api/healing/${record.id}/propagate`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("propagates to zero scenarios when none match", async () => {
    const record = await createHealingRecord({ status: "approved" });
    const res = await req("POST", `/api/healing/${record.id}/propagate`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.propagatedTo).toEqual([]);
  });

  it("allows propagation for auto_approved records", async () => {
    const record = await createHealingRecord({ status: "auto_approved" });
    const res = await req("POST", `/api/healing/${record.id}/propagate`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
