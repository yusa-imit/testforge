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
    
    let elements: any[] = [];
    
    try {
      if (serviceId) {
        const result = await db.db.all(
          `SELECT * FROM element_registry WHERE service_id = ? ORDER BY updated_at DESC`,
          [serviceId]
        );
        elements = result;
      } else {
        const result = await db.db.all(
          `SELECT * FROM element_registry ORDER BY updated_at DESC`
        );
        elements = result;
      }
    } catch (error) {
      // Table might not exist yet
      elements = [];
    }
    
    // Parse JSON fields
    elements = elements.map((el: any) => ({
      ...el,
      currentLocator: JSON.parse(el.current_locator || "{}"),
      history: JSON.parse(el.history || "[]"),
      usedIn: JSON.parse(el.used_in || "[]"),
    }));
    
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
    
    try {
      const result = await db.db.all(
        `SELECT * FROM element_registry WHERE id = ?`,
        [id]
      );
      
      if (result.length === 0) {
        throw notFound("Element registry entry", id);
      }
      
      const el = result[0];
      const element = {
        ...el,
        currentLocator: JSON.parse(el.current_locator || "{}"),
        history: JSON.parse(el.history || "[]"),
        usedIn: JSON.parse(el.used_in || "[]"),
      };
      
      return c.json({ success: true, data: element });
    } catch (error: any) {
      if (error.code === "NOT_FOUND") throw error;
      throw notFound("Element registry entry", id);
    }
  })

  // POST /api/registry - Create new element registry entry
  .post("/", zValidator("json", createRegistrySchema), async (c) => {
    const db = await getDB();
    const data = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    try {
      await db.db.run(
        `INSERT INTO element_registry (id, service_id, display_name, page_pattern, current_locator, history, used_in, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, '[]', '[]', ?, ?)`,
        [id, data.serviceId, data.displayName, data.pagePattern || null, JSON.stringify(data.currentLocator), now, now]
      );
      
      const element = {
        id,
        serviceId: data.serviceId,
        displayName: data.displayName,
        pagePattern: data.pagePattern,
        currentLocator: data.currentLocator,
        history: [],
        usedIn: [],
        createdAt: now,
        updatedAt: now,
      };
      
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
    const now = new Date().toISOString();
    
    // Get current element
    const result = await db.db.all(
      `SELECT * FROM element_registry WHERE id = ?`,
      [id]
    );
    
    if (result.length === 0) {
      throw notFound("Element registry entry", id);
    }
    
    const current = result[0];
    const currentLocator = JSON.parse(current.current_locator || "{}");
    const history = JSON.parse(current.history || "[]");
    
    // If locator is changing, add current to history
    if (data.currentLocator) {
      history.push({
        locator: currentLocator,
        changedAt: now,
        reason: data.reason || "Manual update",
      });
    }
    
    // Update the element
    await db.db.run(
      `UPDATE element_registry
       SET display_name = COALESCE(?, display_name),
           page_pattern = COALESCE(?, page_pattern),
           current_locator = COALESCE(?, current_locator),
           history = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        data.displayName || null,
        data.pagePattern || null,
        data.currentLocator ? JSON.stringify(data.currentLocator) : null,
        JSON.stringify(history),
        now,
        id
      ]
    );
    
    // Get updated element
    const updated = await db.db.all(
      `SELECT * FROM element_registry WHERE id = ?`,
      [id]
    );
    
    const el = updated[0];
    const element = {
      ...el,
      currentLocator: JSON.parse(el.current_locator || "{}"),
      history: JSON.parse(el.history || "[]"),
      usedIn: JSON.parse(el.used_in || "[]"),
    };
    
    return c.json({ success: true, data: element });
  })

  // POST /api/registry/:id/usage - Add usage tracking
  .post("/:id/usage", zValidator("json", addUsageSchema), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const now = new Date().toISOString();
    
    // Get current element
    const result = await db.db.all(
      `SELECT * FROM element_registry WHERE id = ?`,
      [id]
    );
    
    if (result.length === 0) {
      throw notFound("Element registry entry", id);
    }
    
    const current = result[0];
    const usedIn = JSON.parse(current.used_in || "[]");
    
    // Check if usage already exists
    const exists = usedIn.some(
      (u: any) => u.scenarioId === data.scenarioId && u.stepId === data.stepId
    );
    
    if (!exists) {
      usedIn.push({
        scenarioId: data.scenarioId,
        stepId: data.stepId,
        addedAt: now,
      });
      
      await db.db.run(
        `UPDATE element_registry SET used_in = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(usedIn), now, id]
      );
    }
    
    return c.json({ success: true, data: { usedIn } });
  })

  // DELETE /api/registry/:id - Delete element registry entry
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    
    try {
      const result = await db.db.run(
        `DELETE FROM element_registry WHERE id = ?`,
        [id]
      );
      
      return c.json({ success: true });
    } catch (error: any) {
      throw notFound("Element registry entry", id);
    }
  })

  // GET /api/registry/by-name/:displayName - Find element by display name
  .get("/by-name/:displayName", async (c) => {
    const db = await getDB();
    const displayName = decodeURIComponent(c.req.param("displayName"));
    const serviceId = c.req.query("serviceId");
    
    try {
      let query = `SELECT * FROM element_registry WHERE display_name = ?`;
      const params: any[] = [displayName];
      
      if (serviceId) {
        query += ` AND service_id = ?`;
        params.push(serviceId);
      }
      
      const result = await db.db.all(query, params);
      
      if (result.length === 0) {
        return c.json({ success: true, data: null });
      }
      
      const el = result[0];
      const element = {
        ...el,
        currentLocator: JSON.parse(el.current_locator || "{}"),
        history: JSON.parse(el.history || "[]"),
        usedIn: JSON.parse(el.used_in || "[]"),
      };
      
      return c.json({ success: true, data: element });
    } catch (error) {
      return c.json({ success: true, data: null });
    }
  });

export default app;
