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

/** Create a minimal service → feature → scenario hierarchy and return scenarioId */
async function createScenario(): Promise<string> {
  const service = await db.createService({ name: "S", baseUrl: "http://s.test", defaultTimeout: 5000 });
  const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });
  const scenario = await db.createScenario({
    featureId: feature.id,
    name: "Test Scenario",
    tags: [],
    priority: "medium",
    variables: [],
    steps: [],
  });
  return scenario.id;
}

describe("GET /api/schedules", () => {
  it("returns empty list when no schedules", async () => {
    const res = await req("GET", "/api/schedules");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
  });

  it("returns created schedules with scenarioName", async () => {
    const scenarioId = await createScenario();
    await db.createSchedule({ name: "Hourly", scenarioId, intervalMinutes: 60 });
    const res = await req("GET", "/api/schedules");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].scenarioName).toBe("Test Scenario");
    expect(body.data[0].intervalMinutes).toBe(60);
  });
});

describe("POST /api/schedules", () => {
  it("creates a schedule with valid payload", async () => {
    const scenarioId = await createScenario();
    const res = await req("POST", "/api/schedules", {
      name: "Nightly",
      scenarioId,
      intervalMinutes: 1440,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("Nightly");
    expect(body.data.intervalMinutes).toBe(1440);
    expect(body.data.enabled).toBe(true);
    expect(body.data.lastRunAt).toBeNull();
    expect(body.data.nextRunAt).not.toBeNull();
  });

  it("returns 404 when scenarioId not found", async () => {
    const res = await req("POST", "/api/schedules", {
      name: "Bad",
      scenarioId: "00000000-0000-0000-0000-000000000000",
      intervalMinutes: 60,
    });
    expect(res.status).toBe(404);
  });

  it("rejects invalid intervalMinutes", async () => {
    const scenarioId = await createScenario();
    const res = await req("POST", "/api/schedules", {
      name: "Bad",
      scenarioId,
      intervalMinutes: 7, // not in VALID_INTERVALS
    });
    expect(res.status).toBe(400);
  });

  it("rejects missing name", async () => {
    const scenarioId = await createScenario();
    const res = await req("POST", "/api/schedules", { scenarioId, intervalMinutes: 60 });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/schedules/:id", () => {
  it("returns schedule by id", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "X", scenarioId, intervalMinutes: 30 });
    const res = await req("GET", `/api/schedules/${s.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(s.id);
    expect(body.data.intervalMinutes).toBe(30);
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("GET", "/api/schedules/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/schedules/:id", () => {
  it("updates schedule fields", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Old", scenarioId, intervalMinutes: 60 });
    const res = await req("PUT", `/api/schedules/${s.id}`, { name: "New", enabled: false });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("New");
    expect(body.data.enabled).toBe(false);
    expect(body.data.intervalMinutes).toBe(60);
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("PUT", "/api/schedules/nonexistent", { name: "X" });
    expect(res.status).toBe(404);
  });

  it("rejects invalid intervalMinutes on update", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Q", scenarioId, intervalMinutes: 60 });
    const res = await req("PUT", `/api/schedules/${s.id}`, { intervalMinutes: 3 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/schedules/:id", () => {
  it("deletes a schedule", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Del", scenarioId, intervalMinutes: 60 });
    const res = await req("DELETE", `/api/schedules/${s.id}`);
    expect(res.status).toBe(200);
    expect(await db.getSchedule(s.id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("DELETE", "/api/schedules/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("DB: getDueSchedules", () => {
  it("returns only schedules with nextRunAt in the past", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Due", scenarioId, intervalMinutes: 60 });
    // Force nextRunAt to past by direct update
    await (db as any).db.run(`UPDATE schedules SET next_run_at = ? WHERE id = ?`, [
      new Date(Date.now() - 5000),
      s.id,
    ]);
    const due = await db.getDueSchedules();
    expect(due.some((d) => d.id === s.id)).toBe(true);
  });

  it("excludes disabled schedules", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Disabled", scenarioId, intervalMinutes: 60 });
    await db.updateSchedule(s.id, { enabled: false });
    await (db as any).db.run(`UPDATE schedules SET next_run_at = ? WHERE id = ?`, [
      new Date(Date.now() - 5000),
      s.id,
    ]);
    const due = await db.getDueSchedules();
    expect(due.some((d) => d.id === s.id)).toBe(false);
  });

  it("excludes schedules with future nextRunAt", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Future", scenarioId, intervalMinutes: 1440 });
    const due = await db.getDueSchedules();
    expect(due.some((d) => d.id === s.id)).toBe(false);
  });
});

describe("DB: recordScheduleRun", () => {
  it("updates lastRunAt and advances nextRunAt", async () => {
    const scenarioId = await createScenario();
    const s = await db.createSchedule({ name: "Run", scenarioId, intervalMinutes: 60 });
    expect(s.lastRunAt).toBeNull();

    const updated = await db.recordScheduleRun(s.id);
    expect(updated).toBeDefined();
    expect(updated!.lastRunAt).not.toBeNull();
    const nextMs = updated!.nextRunAt!.getTime();
    const lastMs = updated!.lastRunAt!.getTime();
    expect(nextMs - lastMs).toBeCloseTo(60 * 60 * 1000, -3);
  });
});
