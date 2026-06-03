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

async function createTestData() {
  const service = await db.createService({
    name: "Payment Service",
    description: "Handles payments",
    baseUrl: "https://pay.example.com",
    defaultTimeout: 30000,
  });
  const service2 = await db.createService({
    name: "Auth Service",
    description: "Handles authentication",
    baseUrl: "https://auth.example.com",
    defaultTimeout: 30000,
  });
  const feature = await db.createFeature({
    serviceId: service.id,
    name: "Checkout Flow",
    description: "Payment checkout steps",
    owners: [],
  });
  const scenario = await db.createScenario({
    featureId: feature.id,
    name: "Successful payment",
    description: "Completes a payment successfully",
    steps: [],
    variables: [],
    tags: [],
    priority: "medium",
  });
  return { service, service2, feature, scenario };
}

describe("GET /api/search", () => {
  it("returns 400 for missing q param", async () => {
    const res = await req("/api/search");
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty q param", async () => {
    const res = await req("/api/search?q=");
    expect(res.status).toBe(400);
  });

  it("returns empty results when nothing matches", async () => {
    await createTestData();
    const res = await req("/api/search?q=zzzzznotfound");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });

  it("finds services by name", async () => {
    const { service } = await createTestData();
    const res = await req("/api/search?q=Payment");
    expect(res.status).toBe(200);
    const json = await res.json();
    const services = json.data.filter((r: any) => r.type === "service");
    expect(services.length).toBeGreaterThanOrEqual(1);
    expect(services[0].id).toBe(service.id);
    expect(services[0].name).toBe("Payment Service");
  });

  it("finds features by name with service context", async () => {
    const { service, feature } = await createTestData();
    const res = await req("/api/search?q=Checkout");
    expect(res.status).toBe(200);
    const json = await res.json();
    const features = json.data.filter((r: any) => r.type === "feature");
    expect(features.length).toBe(1);
    expect(features[0].id).toBe(feature.id);
    expect(features[0].serviceId).toBe(service.id);
    expect(features[0].serviceName).toBe("Payment Service");
  });

  it("finds scenarios by name with feature and service context", async () => {
    const { service, feature, scenario } = await createTestData();
    const res = await req("/api/search?q=payment");
    expect(res.status).toBe(200);
    const json = await res.json();
    const scenarios = json.data.filter((r: any) => r.type === "scenario");
    expect(scenarios.length).toBeGreaterThanOrEqual(1);
    const found = scenarios.find((s: any) => s.id === scenario.id);
    expect(found).toBeDefined();
    expect(found.featureId).toBe(feature.id);
    expect(found.featureName).toBe("Checkout Flow");
    expect(found.serviceId).toBe(service.id);
    expect(found.serviceName).toBe("Payment Service");
  });

  it("search is case-insensitive", async () => {
    await createTestData();
    const res = await req("/api/search?q=CHECKOUT");
    expect(res.status).toBe(200);
    const json = await res.json();
    const features = json.data.filter((r: any) => r.type === "feature");
    expect(features.length).toBe(1);
  });

  it("respects the limit param", async () => {
    for (let i = 0; i < 10; i++) {
      const s = await db.createService({
        name: `Searchable Service ${i}`,
        baseUrl: "https://example.com",
        defaultTimeout: 30000,
      });
      await db.createFeature({ serviceId: s.id, name: `Searchable Feature ${i}`, description: "", owners: [] });
    }
    const res = await req("/api/search?q=Searchable&limit=6");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBeLessThanOrEqual(6);
  });

  it("finds by description text", async () => {
    await createTestData();
    const res = await req("/api/search?q=authentication");
    expect(res.status).toBe(200);
    const json = await res.json();
    const services = json.data.filter((r: any) => r.type === "service");
    expect(services.some((s: any) => s.name === "Auth Service")).toBe(true);
  });
});
