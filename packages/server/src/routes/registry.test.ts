/**
 * Element Registry API Integration Tests
 *
 * Tests the /api/registry routes using an in-memory DuckDB and Hono's
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

// Sample locator for test fixtures
const sampleLocator = {
  displayName: "Submit Button",
  strategies: [
    { type: "testId", value: "submit-btn", priority: 1 },
    { type: "css", selector: ".btn-submit", priority: 2 },
  ],
  healing: {
    enabled: true,
    autoApprove: false,
    confidenceThreshold: 0.9,
  },
};

// Factory: create a registry element directly via DB
async function createElement(
  serviceId: string,
  overrides: {
    displayName?: string;
    pagePattern?: string;
  } = {}
) {
  return db.createRegistryElement({
    id: crypto.randomUUID(),
    serviceId,
    displayName: overrides.displayName ?? "Submit Button",
    pagePattern: overrides.pagePattern,
    currentLocator: sampleLocator,
  });
}

// Factory: create a service via DB for use in registry tests
async function createService() {
  return db.createService({
    name: "Test Service",
    description: "For registry tests",
    baseUrl: "https://example.com",
    defaultTimeout: 30000,
  });
}

describe("GET /api/registry", () => {
  it("returns empty list when no elements exist", async () => {
    const res = await req("GET", "/api/registry");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns all elements", async () => {
    const svc = await createService();
    await createElement(svc.id, { displayName: "Button A" });
    await createElement(svc.id, { displayName: "Input B" });
    const res = await req("GET", "/api/registry");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });

  it("filters by serviceId", async () => {
    const svc1 = await createService();
    const svc2 = await createService();
    await createElement(svc1.id, { displayName: "Element A" });
    await createElement(svc2.id, { displayName: "Element B" });

    const res = await req("GET", `/api/registry?serviceId=${svc1.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].display_name).toBe("Element A");
  });

  it("filters by search query", async () => {
    const svc = await createService();
    await createElement(svc.id, { displayName: "Submit Button" });
    await createElement(svc.id, { displayName: "Login Input" });

    const res = await req("GET", "/api/registry?search=submit");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].display_name).toBe("Submit Button");
  });

  it("returns all when serviceId=all", async () => {
    const svc1 = await createService();
    const svc2 = await createService();
    await createElement(svc1.id);
    await createElement(svc2.id);

    const res = await req("GET", "/api/registry?serviceId=all");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/registry/:id", () => {
  it("returns an element by ID", async () => {
    const svc = await createService();
    const element = await createElement(svc.id, { displayName: "My Element" });

    const res = await req("GET", `/api/registry/${element.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(element.id);
    expect(body.data.display_name).toBe("My Element");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/registry/nonexistent-id");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/registry", () => {
  it("creates a new element registry entry", async () => {
    const svc = await createService();
    const res = await req("POST", "/api/registry", {
      serviceId: svc.id,
      displayName: "New Element",
      currentLocator: sampleLocator,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.display_name).toBe("New Element");
    expect(body.data.service_id).toBe(svc.id);
    expect(body.data.id).toBeTruthy();
  });

  it("creates entry with optional pagePattern", async () => {
    const svc = await createService();
    const res = await req("POST", "/api/registry", {
      serviceId: svc.id,
      displayName: "Page-specific Element",
      pagePattern: "/dashboard/*",
      currentLocator: sampleLocator,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.page_pattern).toBe("/dashboard/*");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await req("POST", "/api/registry", {
      displayName: "No service",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing displayName", async () => {
    const svc = await createService();
    const res = await req("POST", "/api/registry", {
      serviceId: svc.id,
      currentLocator: sampleLocator,
    });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/registry/:id", () => {
  it("updates displayName of an element", async () => {
    const svc = await createService();
    const element = await createElement(svc.id, { displayName: "Old Name" });

    const res = await req("PUT", `/api/registry/${element.id}`, {
      displayName: "New Name",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.display_name).toBe("New Name");
  });

  it("adds to history when locator is changed", async () => {
    const svc = await createService();
    const element = await createElement(svc.id);

    const newLocator = {
      displayName: "Submit Button",
      strategies: [{ type: "testId", value: "new-btn", priority: 1 }],
    };
    const res = await req("PUT", `/api/registry/${element.id}`, {
      currentLocator: newLocator,
      reason: "DOM refactor",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.history).toHaveLength(1);
    expect(body.data.history[0].reason).toBe("DOM refactor");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("PUT", "/api/registry/nonexistent-id", {
      displayName: "X",
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/registry/:id", () => {
  it("deletes a registry element", async () => {
    const svc = await createService();
    const element = await createElement(svc.id);

    const res = await req("DELETE", `/api/registry/${element.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Confirm it's gone
    const getRes = await req("GET", `/api/registry/${element.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("DELETE", "/api/registry/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/registry/:id/usage", () => {
  it("adds usage tracking to a registry element", async () => {
    const svc = await createService();
    const element = await createElement(svc.id);
    const scenarioId = crypto.randomUUID();
    const stepId = crypto.randomUUID();

    const res = await req("POST", `/api/registry/${element.id}/usage`, {
      scenarioId,
      stepId,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.usedIn).toHaveLength(1);
    expect(body.data.usedIn[0].scenarioId).toBe(scenarioId);
    expect(body.data.usedIn[0].stepId).toBe(stepId);
  });

  it("returns 404 for unknown element ID", async () => {
    const res = await req("POST", "/api/registry/nonexistent-id/usage", {
      scenarioId: crypto.randomUUID(),
      stepId: crypto.randomUUID(),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing scenarioId", async () => {
    const svc = await createService();
    const element = await createElement(svc.id);

    const res = await req("POST", `/api/registry/${element.id}/usage`, {
      stepId: crypto.randomUUID(),
    });
    expect(res.status).toBe(400);
  });
});
