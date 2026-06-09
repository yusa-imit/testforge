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

describe("GET /api/webhooks", () => {
  it("returns empty list when no webhooks", async () => {
    const res = await req("GET", "/api/webhooks");
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data).toEqual([]);
  });

  it("returns list of created webhooks", async () => {
    await db.createWebhook({ name: "CI", url: "https://ci.example.com/hook", events: ["run.failed"] });
    await db.createWebhook({ name: "Slack", url: "https://hooks.slack.com/x", events: ["run.completed"] });
    const res = await req("GET", "/api/webhooks");
    const body = (await res.json()) as any;
    expect(body.data).toHaveLength(2);
  });
});

describe("POST /api/webhooks", () => {
  it("creates a webhook with valid payload", async () => {
    const res = await req("POST", "/api/webhooks", {
      name: "My Hook",
      url: "https://example.com/webhook",
      events: ["run.failed", "run.passed"],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("My Hook");
    expect(body.data.events).toEqual(["run.failed", "run.passed"]);
    expect(body.data.enabled).toBe(true);
    expect(body.data.secret).toBeUndefined();
  });

  it("stores optional secret", async () => {
    const res = await req("POST", "/api/webhooks", {
      name: "Secured",
      url: "https://example.com/secured",
      secret: "supersecretkey",
      events: ["run.completed"],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.data.secret).toBe("supersecretkey");
  });

  it("rejects invalid URL", async () => {
    const res = await req("POST", "/api/webhooks", {
      name: "Bad URL",
      url: "not-a-url",
      events: ["run.failed"],
    });
    expect(res.status).toBe(400);
  });

  it("rejects empty events array", async () => {
    const res = await req("POST", "/api/webhooks", {
      name: "No Events",
      url: "https://example.com/hook",
      events: [],
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid event type", async () => {
    const res = await req("POST", "/api/webhooks", {
      name: "Bad Event",
      url: "https://example.com/hook",
      events: ["run.bogus"],
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/webhooks/:id", () => {
  it("returns webhook by id", async () => {
    const hook = await db.createWebhook({ name: "Test", url: "https://x.com/h", events: ["run.completed"] });
    const res = await req("GET", `/api/webhooks/${hook.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.id).toBe(hook.id);
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("GET", "/api/webhooks/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/webhooks/:id", () => {
  it("updates webhook fields", async () => {
    const hook = await db.createWebhook({ name: "Old", url: "https://old.com/h", events: ["run.failed"] });
    const res = await req("PUT", `/api/webhooks/${hook.id}`, {
      name: "New",
      enabled: false,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.name).toBe("New");
    expect(body.data.enabled).toBe(false);
    expect(body.data.events).toEqual(["run.failed"]);
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("PUT", "/api/webhooks/nonexistent", { name: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/webhooks/:id", () => {
  it("deletes a webhook", async () => {
    const hook = await db.createWebhook({ name: "Del", url: "https://del.com/h", events: ["run.completed"] });
    const res = await req("DELETE", `/api/webhooks/${hook.id}`);
    expect(res.status).toBe(200);
    expect(await db.getWebhook(hook.id)).toBeUndefined();
  });

  it("returns 404 for unknown id", async () => {
    const res = await req("DELETE", "/api/webhooks/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("DB: getEnabledWebhooksForEvent", () => {
  it("returns only webhooks subscribed to the given event", async () => {
    await db.createWebhook({ name: "A", url: "https://a.com/h", events: ["run.failed"] });
    await db.createWebhook({ name: "B", url: "https://b.com/h", events: ["run.completed"] });
    await db.createWebhook({ name: "C", url: "https://c.com/h", events: ["run.passed", "run.failed"] });

    const hooks = await db.getEnabledWebhooksForEvent("run.failed");
    expect(hooks.map((h) => h.name).sort()).toEqual(["A", "C"]);
  });

  it("excludes disabled webhooks", async () => {
    const hook = await db.createWebhook({ name: "D", url: "https://d.com/h", events: ["run.failed"] });
    await db.updateWebhook(hook.id, { enabled: false });

    const hooks = await db.getEnabledWebhooksForEvent("run.failed");
    expect(hooks.find((h) => h.id === hook.id)).toBeUndefined();
  });
});
