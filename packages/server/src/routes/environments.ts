import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDB } from "../db";
import { notFound } from "../utils/errors";

const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  variables: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

const app = new Hono()
  // GET /api/environments
  .get("/", async (c) => {
    const db = await getDB();
    const environments = await db.getAllEnvironments();
    return c.json({ success: true, data: environments });
  })

  // POST /api/environments
  .post("/", zValidator("json", createEnvironmentSchema), async (c) => {
    const db = await getDB();
    const data = c.req.valid("json");
    const environment = await db.createEnvironment({
      name: data.name,
      description: data.description,
      baseUrl: data.baseUrl || undefined,
      variables: (data.variables as Record<string, any>) ?? {},
      isDefault: data.isDefault ?? false,
    });
    return c.json({ success: true, data: environment }, 201);
  })

  // GET /api/environments/:id
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const environment = await db.getEnvironment(id);
    if (!environment) throw notFound("Environment", id);
    return c.json({ success: true, data: environment });
  })

  // PUT /api/environments/:id
  .put("/:id", zValidator("json", createEnvironmentSchema.partial()), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const environment = await db.updateEnvironment(id, {
      name: data.name,
      description: data.description,
      baseUrl: data.baseUrl !== undefined ? (data.baseUrl || undefined) : undefined,
      variables: data.variables as Record<string, any> | undefined,
      isDefault: data.isDefault,
    });
    if (!environment) throw notFound("Environment", id);
    return c.json({ success: true, data: environment });
  })

  // DELETE /api/environments/:id
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const deleted = await db.deleteEnvironment(id);
    if (!deleted) throw notFound("Environment", id);
    return c.json({ success: true });
  });

export default app;
