import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDB } from "../db";

const WEBHOOK_EVENTS = ["run.completed", "run.passed", "run.failed", "run.healed"] as const;

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  secret: z.string().min(8).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

const updateWebhookSchema = createWebhookSchema.partial().extend({
  enabled: z.boolean().optional(),
});

const app = new Hono()
  .get("/", async (c) => {
    const db = await getDB();
    const webhooks = await db.getAllWebhooks();
    return c.json({ data: webhooks });
  })

  .post("/", zValidator("json", createWebhookSchema), async (c) => {
    const db = await getDB();
    const body = c.req.valid("json");
    const webhook = await db.createWebhook(body);
    return c.json({ data: webhook }, 201);
  })

  .get("/:id", async (c) => {
    const db = await getDB();
    const webhook = await db.getWebhook(c.req.param("id"));
    if (!webhook) return c.json({ error: "Webhook not found" }, 404);
    return c.json({ data: webhook });
  })

  .put("/:id", zValidator("json", updateWebhookSchema), async (c) => {
    const db = await getDB();
    const updated = await db.updateWebhook(c.req.param("id"), c.req.valid("json"));
    if (!updated) return c.json({ error: "Webhook not found" }, 404);
    return c.json({ data: updated });
  })

  .delete("/:id", async (c) => {
    const db = await getDB();
    const deleted = await db.deleteWebhook(c.req.param("id"));
    if (!deleted) return c.json({ error: "Webhook not found" }, 404);
    return c.json({ data: { deleted: true } });
  });

export default app;
