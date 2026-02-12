import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { notFound, badRequest } from "../utils/errors";

/**
 * Element Registry Routes
 *
 * Tracks elements across scenarios for Self-Healing quality improvement.
 * PRD Reference: Section 3.3 (ElementRegistry)
 */

const locatorStrategySchema = z.object({
  type: z.enum(["testId", "role", "text", "label", "css", "xpath"]),
  value: z.string().optional(),
  role: z.string().optional(),
  name: z.string().optional(),
  exact: z.boolean().optional(),
  selector: z.string().optional(),
  expression: z.string().optional(),
  priority: z.number(),
});

const elementLocatorSchema = z.object({
  displayName: z.string(),
  strategies: z.array(locatorStrategySchema),
  healing: z.object({
    enabled: z.boolean().default(true),
    autoApprove: z.boolean().default(false),
    confidenceThreshold: z.number().min(0).max(1).default(0.9),
  }).optional(),
});

const createRegistrySchema = z.object({
  serviceId: z.string(),
  displayName: z.string(),
  pagePattern: z.string().optional(),
  currentLocator: elementLocatorSchema,
});

const updateRegistrySchema = z.object({
  displayName: z.string().optional(),
  pagePattern: z.string().optional(),
  currentLocator: elementLocatorSchema.optional(),
  reason: z.string().optional(),
});

const addUsageSchema = z.object({
  scenarioId: z.string(),
  stepId: z.string(),
});

const app = new Hono()
  // GET /api/registry - List all elements (optionally filtered by service)
  .get("/", async (c) => {
    const db = await getDB();
    const serviceId = c.req.query("serviceId");
    const search = c.req.query("search");

    let elements = await db.getAllRegistryElements(
      serviceId !== "all" && serviceId ? serviceId : undefined
    );

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      elements = elements.filter((el: any) =>
        el.display_name?.toLowerCase().includes(searchLower) ||
        el.page_pattern?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({ success: true, data: elements });
  })

  // GET /api/registry/:id - Get element details
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");

    const element = await db.getRegistryElement(id);

    if (!element) {
      throw notFound("Element registry entry", id);
    }

    return c.json({ success: true, data: element });
  })

  // POST /api/registry - Create new element registry entry
  .post("/", zValidator("json", createRegistrySchema), async (c) => {
    const db = await getDB();
    const data = c.req.valid("json");
    const id = crypto.randomUUID();

    try {
      const element = await db.createRegistryElement({
        id,
        serviceId: data.serviceId,
        displayName: data.displayName,
        pagePattern: data.pagePattern,
        currentLocator: data.currentLocator,
      });

      return c.json({ success: true, data: element }, 201);
    } catch (error: any) {
      throw badRequest("Failed to create element registry entry", { error: error.message });
    }
  })

  // PUT /api/registry/:id - Update element (adds to history)
  .put("/:id", zValidator("json", updateRegistrySchema), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const element = await db.updateRegistryElement(id, {
      displayName: data.displayName,
      pagePattern: data.pagePattern,
      currentLocator: data.currentLocator,
      reason: data.reason,
    });

    if (!element) {
      throw notFound("Element registry entry", id);
    }

    return c.json({ success: true, data: element });
  })

  // POST /api/registry/:id/usage - Add usage tracking
  .post("/:id/usage", zValidator("json", addUsageSchema), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const result = await db.addRegistryUsage(id, {
      scenarioId: data.scenarioId,
      stepId: data.stepId,
    });

    if (!result) {
      throw notFound("Element registry entry", id);
    }

    return c.json({ success: true, data: result });
  })

  // DELETE /api/registry/:id - Delete element registry entry
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");

    const deleted = await db.deleteRegistryElement(id);

    if (!deleted) {
      throw notFound("Element registry entry", id);
    }

    return c.json({ success: true });
  })

  // GET /api/registry/by-name/:displayName - Find element by display name
  .get("/by-name/:displayName", async (c) => {
    const db = await getDB();
    const displayName = decodeURIComponent(c.req.param("displayName"));
    const serviceId = c.req.query("serviceId");

    const element = await db.findRegistryByName(displayName, serviceId);

    return c.json({ success: true, data: element });
  });

export default app;
