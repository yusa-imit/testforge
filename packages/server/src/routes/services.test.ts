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
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns created services", async () => {
    await db.createService(servicePayload);
    const res = await req("GET", "/api/services");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("My App");
  });
});

describe("POST /api/services", () => {
  it("creates a service with valid data", async () => {
    const res = await req("POST", "/api/services", servicePayload);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("My App");
    expect(body.data.baseUrl).toBe("https://example.com");
    expect(body.data.id).toBeTruthy();
  });

  it("returns 400 for missing required fields", async () => {
    const res = await req("POST", "/api/services", { description: "No name" });
    expect(res.status).toBe(400);
    const body = await res.json();
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
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(service.id);
    expect(body.data.name).toBe("My App");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/services/nonexistent-id");
    expect(res.status).toBe(404);
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
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
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Feature A");
  });

  it("returns 404 for unknown service", async () => {
    const res = await req("GET", "/api/services/nonexistent/features");
    expect(res.status).toBe(404);
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
    const body = await res.json();
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
