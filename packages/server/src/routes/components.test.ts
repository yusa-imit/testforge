/**
 * Components API Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { v4 as uuid } from "uuid";
import type { CreateComponent } from "@testforge/core";
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

const componentPayload: CreateComponent = {
  name: "Login Flow",
  description: "Reusable login steps",
  type: "flow",
  parameters: [
    { name: "username", type: "string", required: true },
    { name: "password", type: "string", required: true },
  ],
  steps: [],
};

describe("GET /api/components", () => {
  it("returns empty list when no components exist", async () => {
    const res = await req("GET", "/api/components");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns created components", async () => {
    await db.createComponent(componentPayload);
    const res = await req("GET", "/api/components");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Login Flow");
  });
});

describe("POST /api/components", () => {
  it("creates a component with valid data", async () => {
    const res = await req("POST", "/api/components", componentPayload);
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Login Flow");
    expect(body.data.type).toBe("flow");
    expect(body.data.parameters).toHaveLength(2);
    expect(body.data.steps).toHaveLength(0);
    expect(body.data.id).toBeTruthy();
  });

  it("returns 400 for missing name", async () => {
    const res = await req("POST", "/api/components", {
      type: "flow",
      parameters: [],
      steps: [],
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/components/:id", () => {
  it("returns a component by ID", async () => {
    const component = await db.createComponent(componentPayload);
    const res = await req("GET", `/api/components/${component.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(component.id);
    expect(body.data.name).toBe("Login Flow");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/components/nonexistent-id");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/components/:id", () => {
  it("updates a component", async () => {
    const component = await db.createComponent(componentPayload);
    const res = await req("PUT", `/api/components/${component.id}`, {
      name: "Updated Login Flow",
      description: "Updated desc",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("Updated Login Flow");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("PUT", "/api/components/nonexistent-id", {
      name: "X",
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/components/:id", () => {
  it("deletes a component", async () => {
    const component = await db.createComponent(componentPayload);
    const res = await req("DELETE", `/api/components/${component.id}`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).success).toBe(true);

    const getRes = await req("GET", `/api/components/${component.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("DELETE", "/api/components/nonexistent-id");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/components/:id/usages", () => {
  it("returns usages for a component not used in any scenario", async () => {
    const component = await db.createComponent(componentPayload);
    const res = await req("GET", `/api/components/${component.id}/usages`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.component.id).toBe(component.id);
    expect(body.data.usedBy).toEqual([]);
    expect(body.data.totalUsages).toBe(0);
  });

  it("returns usages for a component used in scenarios", async () => {
    const component = await db.createComponent(componentPayload);
    const service = await db.createService({ name: "S", baseUrl: "http://x", defaultTimeout: 30000 });
    const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });

    // Create scenario that uses this component
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Uses Component",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [
        {
          id: uuid(),
          type: "component",
          description: "Run login flow",
          continueOnError: false,
          config: { componentId: component.id, parameters: {} },
        },
      ],
    });

    const res = await req("GET", `/api/components/${component.id}/usages`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.usedBy).toHaveLength(1);
    expect(body.data.usedBy[0].scenarioId).toBe(scenario.id);
    expect(body.data.usedBy[0].stepIndices).toContain(0);
    expect(body.data.totalUsages).toBe(1);
  });

  it("returns 404 for unknown component", async () => {
    const res = await req("GET", "/api/components/nonexistent-id/usages");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("Component types and parameters", () => {
  it("creates components with all valid types", async () => {
    const types = ["flow", "assertion", "setup", "teardown"] as const;
    for (const type of types) {
      const res = await req("POST", "/api/components", {
        name: `${type} component`,
        type,
        parameters: [],
        steps: [],
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.data.type).toBe(type);
    }
  });

  it("returns 400 for invalid component type", async () => {
    const res = await req("POST", "/api/components", {
      name: "Bad type",
      type: "invalid-type",
      parameters: [],
      steps: [],
    });
    expect(res.status).toBe(400);
  });

  it("updates component parameters", async () => {
    const component = await db.createComponent({
      name: "Parameterized",
      type: "flow",
      parameters: [{ name: "url", type: "string", required: true }],
      steps: [],
    });

    const res = await req("PUT", `/api/components/${component.id}`, {
      parameters: [
        { name: "url", type: "string", required: true },
        { name: "timeout", type: "number", required: false, defaultValue: 5000 },
      ],
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.parameters).toHaveLength(2);
    expect(body.data.parameters[1].name).toBe("timeout");
    expect(body.data.parameters[1].defaultValue).toBe(5000);
  });
});
