/**
 * Components API Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns created components", async () => {
    await db.createComponent(componentPayload);
    const res = await req("GET", "/api/components");
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Login Flow");
  });
});

describe("POST /api/components", () => {
  it("creates a component with valid data", async () => {
    const res = await req("POST", "/api/components", componentPayload);
    expect(res.status).toBe(201);
    const body = await res.json();
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
    const body = await res.json();
    expect(body.data.id).toBe(component.id);
    expect(body.data.name).toBe("Login Flow");
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("GET", "/api/components/nonexistent-id");
    expect(res.status).toBe(404);
    const body = await res.json();
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
    const body = await res.json();
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
    expect((await res.json()).success).toBe(true);

    const getRes = await req("GET", `/api/components/${component.id}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await req("DELETE", "/api/components/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
