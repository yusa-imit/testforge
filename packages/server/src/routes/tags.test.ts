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

async function req(path: string): Promise<Response> {
  return app.request(`http://localhost${path}`, { method: "GET" });
}

async function createScenarioWithTags(tags: string[]): Promise<string> {
  const service = await db.createService({ name: "S", baseUrl: "http://s.test", defaultTimeout: 5000 });
  const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });
  const scenario = await db.createScenario({
    featureId: feature.id,
    name: "Scenario",
    tags,
    priority: "medium",
    variables: [],
    steps: [],
  });
  return scenario.id;
}

describe("GET /api/tags", () => {
  it("returns empty array when no scenarios have tags", async () => {
    await createScenarioWithTags([]);
    const res = await req("/api/tags");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
  });

  it("returns single tag with count 1", async () => {
    await createScenarioWithTags(["smoke"]);
    const res = await req("/api/tags");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].tag).toBe("smoke");
    expect(body.data[0].scenarioCount).toBe(1);
  });

  it("counts each tag across multiple scenarios correctly", async () => {
    await createScenarioWithTags(["smoke", "regression"]);
    await createScenarioWithTags(["smoke", "critical"]);
    await createScenarioWithTags(["regression"]);

    const res = await req("/api/tags");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const tagMap: Record<string, number> = {};
    for (const item of body.data) {
      tagMap[item.tag] = item.scenarioCount;
    }
    expect(tagMap["smoke"]).toBe(2);
    expect(tagMap["regression"]).toBe(2);
    expect(tagMap["critical"]).toBe(1);
  });

  it("sorts tags by scenarioCount descending then tag name ascending", async () => {
    // popular = count 3, a-tag = count 2, z-tag = count 1
    await createScenarioWithTags(["popular", "a-tag"]);
    await createScenarioWithTags(["popular", "a-tag"]);
    await createScenarioWithTags(["popular", "z-tag"]);

    const res = await req("/api/tags");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    // popular (3) first, then a-tag (2), then z-tag (1)
    expect(body.data[0].tag).toBe("popular");
    expect(body.data[0].scenarioCount).toBe(3);
    expect(body.data[1].tag).toBe("a-tag");
    expect(body.data[1].scenarioCount).toBe(2);
    expect(body.data[2].tag).toBe("z-tag");
    expect(body.data[2].scenarioCount).toBe(1);
  });

  it("returns data array in response envelope", async () => {
    const res = await req("/api/tags");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.data)).toBe(true);
  });
});
