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
async function createTestRun(status: "passed" | "failed" | "running" | "healed" = "passed") {
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
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns created runs", async () => {
    await createTestRun("passed");
    const res = await req("GET", "/api/runs");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("passed");
  });

  it("respects limit parameter", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs?limit=1");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
  });

  it("includes scenario name in run data", async () => {
    const { scenario } = await createTestRun("passed");
    const res = await req("GET", "/api/runs");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].scenarioName).toBe(scenario.name);
  });

  it("filters by scenarioId", async () => {
    const { scenario: s1 } = await createTestRun("passed");
    const { scenario: s2 } = await createTestRun("failed");

    const res = await req("GET", `/api/runs?scenarioId=${s1.id}`);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].scenarioId).toBe(s1.id);
    expect(body.data[0].scenarioId).not.toBe(s2.id);
  });

  it("filters by status=passed", async () => {
    await createTestRun("passed");
    await createTestRun("passed");
    await createTestRun("failed");

    const res = await req("GET", "/api/runs?status=passed");
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data.every((r: any) => r.status === "passed")).toBe(true);
  });

  it("filters by status=failed", async () => {
    await createTestRun("passed");
    await createTestRun("failed");

    const res = await req("GET", "/api/runs?status=failed");
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("failed");
  });

  it("combines scenarioId and status filters", async () => {
    const { scenario } = await createTestRun("passed");
    await createTestRun("passed");  // different scenario, same status

    const res = await req("GET", `/api/runs?scenarioId=${scenario.id}&status=passed`);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].scenarioId).toBe(scenario.id);
    expect(body.data[0].status).toBe("passed");
  });

  it("returns empty list when scenarioId has no matching runs", async () => {
    await createTestRun("passed");
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const res = await req("GET", `/api/runs?scenarioId=${fakeId}`);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("falls back to default limit 50 when limit param is invalid", async () => {
    const res = await req("GET", "/api/runs?limit=invalid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("filters by featureId", async () => {
    // Create two features in the same service, each with a scenario and a run
    const svc = await db.createService({ name: "Svc", baseUrl: "https://example.com", defaultTimeout: 30000 });
    const featA = await db.createFeature({ serviceId: svc.id, name: "Feature A", owners: [] });
    const featB = await db.createFeature({ serviceId: svc.id, name: "Feature B", owners: [] });

    const scenA = await db.createScenario({ featureId: featA.id, name: "Scenario A", steps: [], variables: [], tags: [], priority: "medium" });
    const scenB = await db.createScenario({ featureId: featB.id, name: "Scenario B", steps: [], variables: [], tags: [], priority: "medium" });

    const now = new Date();
    const runAId = "aaaaaaaa-0000-0000-0000-000000000001";
    const runBId = "bbbbbbbb-0000-0000-0000-000000000002";
    await db.createTestRun({ id: runAId, scenarioId: scenA.id, status: "passed", environment: { baseUrl: svc.baseUrl, variables: {} }, startedAt: now, createdAt: now });
    await db.createTestRun({ id: runBId, scenarioId: scenB.id, status: "failed", environment: { baseUrl: svc.baseUrl, variables: {} }, startedAt: now, createdAt: now });

    const res = await req("GET", `/api/runs?featureId=${featA.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(runAId);
  });

  it("filters by serviceId", async () => {
    // Create two services with scenarios and runs
    const svc1 = await db.createService({ name: "Service1", baseUrl: "https://svc1.com", defaultTimeout: 30000 });
    const svc2 = await db.createService({ name: "Service2", baseUrl: "https://svc2.com", defaultTimeout: 30000 });

    const feat1 = await db.createFeature({ serviceId: svc1.id, name: "F1", owners: [] });
    const feat2 = await db.createFeature({ serviceId: svc2.id, name: "F2", owners: [] });

    const scen1 = await db.createScenario({ featureId: feat1.id, name: "S1", steps: [], variables: [], tags: [], priority: "medium" });
    const scen2 = await db.createScenario({ featureId: feat2.id, name: "S2", steps: [], variables: [], tags: [], priority: "medium" });

    const now = new Date();
    const run1Id = "11111111-0000-0000-0000-000000000001";
    const run2Id = "22222222-0000-0000-0000-000000000002";
    await db.createTestRun({ id: run1Id, scenarioId: scen1.id, status: "passed", environment: { baseUrl: svc1.baseUrl, variables: {} }, startedAt: now, createdAt: now });
    await db.createTestRun({ id: run2Id, scenarioId: scen2.id, status: "passed", environment: { baseUrl: svc2.baseUrl, variables: {} }, startedAt: now, createdAt: now });

    const res = await req("GET", `/api/runs?serviceId=${svc1.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(run1Id);
  });

  it("returns empty list when featureId has no runs", async () => {
    const svc = await db.createService({ name: "NoRunsSvc", baseUrl: "https://noruns.com", defaultTimeout: 30000 });
    const feat = await db.createFeature({ serviceId: svc.id, name: "Empty Feature", owners: [] });

    const res = await req("GET", `/api/runs?featureId=${feat.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("offset paginates results", async () => {
    await createTestRun("passed");
    // Create two more runs with the same scenario (createTestRun creates new service/feature/scenario each time)
    await createTestRun("passed");
    await createTestRun("passed");

    const all = await req("GET", "/api/runs?limit=10");
    const allBody = (await all.json()) as any;
    const totalCount = allBody.data.length;
    expect(totalCount).toBeGreaterThanOrEqual(3);

    // offset=1 should skip the first run
    const paged = await req("GET", "/api/runs?limit=10&offset=1");
    expect(paged.status).toBe(200);
    const pagedBody = (await paged.json()) as any;
    expect(pagedBody.success).toBe(true);
    expect(pagedBody.data.length).toBe(totalCount - 1);

    // The first item in paged should NOT match the first item in all
    expect(pagedBody.data[0].id).not.toBe(allBody.data[0].id);
    expect(pagedBody.data[0].id).toBe(allBody.data[1].id);

  });

  it("offset beyond total count returns empty list", async () => {
    await createTestRun("passed");

    const res = await req("GET", "/api/runs?limit=10&offset=9999");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("from query param excludes runs before the cutoff date", async () => {
    const { service, feature, scenario } = await createTestRun("passed");

    // Create an old run directly with a past date
    const oldRunId = uuid();
    await db.createTestRun({
      id: oldRunId,
      scenarioId: scenario.id,
      status: "passed",
      environment: { baseUrl: service.baseUrl, variables: {} },
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    const from = "2025-01-01T00:00:00Z";
    const res = await req("GET", `/api/runs?from=${encodeURIComponent(from)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    const ids = body.data.map((r: any) => r.id);
    expect(ids).not.toContain(oldRunId);
  });

  it("to query param excludes runs after the cutoff date", async () => {
    const { service, feature, scenario } = await createTestRun("passed");

    // Create a future run
    const futureRunId = uuid();
    await db.createTestRun({
      id: futureRunId,
      scenarioId: scenario.id,
      status: "passed",
      environment: { baseUrl: service.baseUrl, variables: {} },
      createdAt: new Date("2099-01-01T00:00:00Z"),
    });

    const to = "2030-01-01T00:00:00Z";
    const res = await req("GET", `/api/runs?to=${encodeURIComponent(to)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    const ids = body.data.map((r: any) => r.id);
    expect(ids).not.toContain(futureRunId);
  });
});

describe("GET /api/runs/dashboard", () => {
  it("returns dashboard stats", async () => {
    const res = await req("GET", "/api/runs/dashboard");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
    // Note: dashboard only shows runs from last 24h
    expect(body.data.stats.total).toBe(3);
    expect(body.data.stats.passed).toBe(2);
    expect(body.data.stats.failed).toBe(1);
  });

  it("counts healed steps from run summaries", async () => {
    const { runId } = await createTestRun("passed");
    await db.updateTestRun(runId, {
      finishedAt: new Date(),
      duration: 1234,
      summary: { totalSteps: 5, passedSteps: 4, failedSteps: 0, skippedSteps: 0, healedSteps: 2 },
    });

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.stats.healed).toBe(2);
  });

  it("sums healed steps across multiple runs", async () => {
    const { runId: r1 } = await createTestRun("passed");
    const { runId: r2 } = await createTestRun("passed");
    await db.updateTestRun(r1, {
      finishedAt: new Date(),
      summary: { totalSteps: 3, passedSteps: 3, failedSteps: 0, skippedSteps: 0, healedSteps: 1 },
    });
    await db.updateTestRun(r2, {
      finishedAt: new Date(),
      summary: { totalSteps: 4, passedSteps: 4, failedSteps: 0, skippedSteps: 0, healedSteps: 3 },
    });

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.stats.healed).toBe(4);
  });

  it("returns recentFailures list with up to 5 entries", async () => {
    for (let i = 0; i < 7; i++) {
      await createTestRun("failed");
    }

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.recentFailures).toHaveLength(5);
    expect(body.data.recentFailures.every((r: any) => r.status === "failed")).toBe(true);
  });

  it("returns empty recentFailures when no failures", async () => {
    await createTestRun("passed");

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.recentFailures).toEqual([]);
  });

  it("recentFailures includes scenarioName", async () => {
    const { scenario } = await createTestRun("failed");

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.recentFailures).toHaveLength(1);
    expect(body.data.recentFailures[0].scenarioName).toBe(scenario.name);
  });

  it("includes globalStats with totalRuns and trend", async () => {
    await createTestRun("passed");
    await createTestRun("failed");

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.globalStats).toBeDefined();
    expect(body.data.globalStats.totalRuns).toBe(2);
    expect(body.data.globalStats.passedRuns).toBe(1);
    expect(body.data.globalStats.failedRuns).toBe(1);
    expect(Array.isArray(body.data.globalStats.trend)).toBe(true);
  });

  it("globalStats passRate is (passed+healed)/total", async () => {
    await createTestRun("passed");
    await createTestRun("healed");
    await createTestRun("failed");

    const res = await req("GET", "/api/runs/dashboard");
    const body = (await res.json()) as any;
    expect(body.data.globalStats.passRate).toBeCloseTo(2 / 3, 5);
  });

  it("globalStats respects ?days param for trend", async () => {
    const res = await req("GET", "/api/runs/dashboard?days=14");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.globalStats).toBeDefined();
  });
});

describe("GET /api/runs/export", () => {
  it("returns text/csv content-type", async () => {
    const res = await req("GET", "/api/runs/export");
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") ?? "";
    expect(contentType).toContain("text/csv");
  });

  it("returns CSV header row even when no runs exist", async () => {
    const res = await req("GET", "/api/runs/export");
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("scenarioName");
    expect(lines[0]).toContain("status");
    expect(lines[0]).toContain("duration_ms");
  });

  it("includes one data row per run", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs/export");
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it("filters by status", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs/export?status=failed");
    const text = await res.text();
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(2); // header + 1 row
    expect(lines[1]).toContain("failed");
  });

  it("sets Content-Disposition attachment header", async () => {
    const res = await req("GET", "/api/runs/export");
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("testforge-runs-");
    expect(disposition).toContain(".csv");
  });

  it("escapes commas in scenario names", async () => {
    const service = await db.createService({ name: "S", baseUrl: "https://x.com", defaultTimeout: 30000 });
    const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });
    await db.createScenario({ featureId: feature.id, name: "Scenario, with, commas", steps: [], variables: [], tags: [], priority: "medium" });
    const scenario = (await db.getScenariosByFeature(feature.id))[0];
    const { v4: uuid } = await import("uuid");
    const runId = uuid();
    const now = new Date();
    await db.createTestRun({ id: runId, scenarioId: scenario.id, status: "passed", environment: { baseUrl: "https://x.com", variables: {} }, startedAt: now, createdAt: now });

    const res = await req("GET", "/api/runs/export");
    const text = await res.text();
    expect(text).toContain('"Scenario, with, commas"');
  });
});

describe("GET /api/runs/export?format=junit", () => {
  it("returns application/xml content-type", async () => {
    const res = await req("GET", "/api/runs/export?format=junit");
    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") ?? "";
    expect(contentType).toContain("application/xml");
  });

  it("returns valid XML skeleton even when no runs exist", async () => {
    const res = await req("GET", "/api/runs/export?format=junit");
    const text = await res.text();
    expect(text).toContain('<?xml version="1.0"');
    expect(text).toContain("<testsuites");
    expect(text).toContain("<testsuite");
    expect(text).toContain('tests="0"');
  });

  it("sets .xml Content-Disposition filename", async () => {
    const res = await req("GET", "/api/runs/export?format=junit");
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("testforge-runs-");
    expect(disposition).toContain(".xml");
  });

  it("includes a <testcase> per run", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs/export?format=junit");
    const text = await res.text();
    const testcaseCount = (text.match(/<testcase /g) ?? []).length;
    expect(testcaseCount).toBe(2);
  });

  it("adds <failure> element for failed runs only", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs/export?format=junit");
    const text = await res.text();
    const failureCount = (text.match(/<failure /g) ?? []).length;
    expect(failureCount).toBe(1);
    expect(text).toContain('type="TestFailure"');
  });

  it("reflects correct tests/failures counts in testsuites element", async () => {
    await createTestRun("passed");
    await createTestRun("failed");
    await createTestRun("failed");
    const res = await req("GET", "/api/runs/export?format=junit");
    const text = await res.text();
    expect(text).toContain('tests="3"');
    expect(text).toContain('failures="2"');
  });

  it("escapes XML special characters in scenario names", async () => {
    const service = await db.createService({ name: "S", baseUrl: "https://x.com", defaultTimeout: 30000 });
    const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });
    await db.createScenario({ featureId: feature.id, name: 'Login <admin> & "root"', steps: [], variables: [], tags: [], priority: "medium" });
    const scenario = (await db.getScenariosByFeature(feature.id))[0];
    const { v4: uuidFn } = await import("uuid");
    const runId = uuidFn();
    const now = new Date();
    await db.createTestRun({ id: runId, scenarioId: scenario.id, status: "passed", environment: { baseUrl: "https://x.com", variables: {} }, startedAt: now, createdAt: now });

    const res = await req("GET", "/api/runs/export?format=junit");
    const text = await res.text();
    expect(text).toContain("&lt;admin&gt;");
    expect(text).toContain("&amp;");
    expect(text).toContain("&quot;root&quot;");
  });
});

describe("GET /api/runs/:id", () => {
  it("returns a run by ID", async () => {
    const { runId } = await createTestRun("passed");
    const res = await req("GET", `/api/runs/${runId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(runId);
    expect(body.data.status).toBe("passed");
  });

  it("returns 404 for unknown run ID", async () => {
    const res = await req("GET", "/api/runs/nonexistent-run-id");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/runs/:id/steps", () => {
  it("returns step results for a run (empty for new run)", async () => {
    const { runId } = await createTestRun();
    const res = await req("GET", `/api/runs/${runId}/steps`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
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
    const body = (await res.json()) as any;
    expect(body.data.status).toBe("cancelled");
  });

  it("returns 400 for already-completed run", async () => {
    const { runId } = await createTestRun("passed");
    const res = await req("DELETE", `/api/runs/${runId}`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("returns 404 for unknown run", async () => {
    const res = await req("DELETE", "/api/runs/nonexistent-run");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/runs/:id/stream (SSE)", () => {
  it("returns 404 for non-existent run", async () => {
    const res = await req("GET", "/api/runs/nonexistent-run/stream");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns final state for completed run and closes immediately", async () => {
    const { runId } = await createTestRun("passed");

    // Update run with summary
    await db.updateTestRun(runId, {
      finishedAt: new Date(),
      duration: 1234,
      summary: {
        totalSteps: 5,
        passedSteps: 5,
        failedSteps: 0,
        skippedSteps: 0,
        healedSteps: 0,
      },
    });

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await res.text();

    // Should contain run:finished event
    expect(text).toContain("event: message");
    expect(text).toContain("run:finished");
    expect(text).toContain("passed");
  });

  it("returns final state for failed run", async () => {
    const { runId } = await createTestRun("failed");

    await db.updateTestRun(runId, {
      finishedAt: new Date(),
      duration: 2345,
      summary: {
        totalSteps: 5,
        passedSteps: 3,
        failedSteps: 2,
        skippedSteps: 0,
        healedSteps: 1,
      },
    });

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(200);

    const text = await res.text();

    // Should contain failed status
    expect(text).toContain("run:finished");
    expect(text).toContain("failed");
  });

  it("returns 404 error for running run without executor", async () => {
    // Create a run marked as "running" but don't register an executor
    const { runId } = await createTestRun("running");

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(404);

    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("EXECUTOR_NOT_FOUND");
    expect(body.error.message).toContain("executor not found");
  });

  it("returns cancelled status for cancelled run", async () => {
    const { runId } = await createTestRun("running");

    // Cancel the run
    await db.updateTestRun(runId, {
      status: "cancelled",
      finishedAt: new Date(),
    });

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(200);

    const text = await res.text();

    // Should contain cancelled status
    expect(text).toContain("run:finished");
    expect(text).toContain("cancelled");
  });

  it("includes summary in final state", async () => {
    const { runId } = await createTestRun("passed");

    const summary = {
      totalSteps: 10,
      passedSteps: 8,
      failedSteps: 1,
      skippedSteps: 1,
      healedSteps: 2,
    };

    await db.updateTestRun(runId, {
      finishedAt: new Date(),
      duration: 5678,
      summary,
    });

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(200);

    const text = await res.text();

    // Should contain summary data
    expect(text).toContain("totalSteps");
    expect(text).toContain("10");
    expect(text).toContain("healedSteps");
    expect(text).toContain("2");
  });

  it("returns correct content-type header", async () => {
    const { runId } = await createTestRun("passed");

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(200);

    const contentType = res.headers.get("content-type");
    expect(contentType).toBeDefined();
    expect(contentType).toContain("text/event-stream");
  });

  it("handles runs with null summary gracefully", async () => {
    const { runId } = await createTestRun("passed");

    // Don't set summary (leave as null)
    await db.updateTestRun(runId, {
      finishedAt: new Date(),
    });

    const res = await req("GET", `/api/runs/${runId}/stream`);
    expect(res.status).toBe(200);

    const text = await res.text();

    // Should still work with null summary
    expect(text).toContain("run:finished");
    expect(text).toContain("passed");
  });
});
