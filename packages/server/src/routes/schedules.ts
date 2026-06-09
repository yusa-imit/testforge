import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDB } from "../db";
import { executeScenarioRun } from "../execution/runHelper";

const VALID_INTERVALS = [15, 30, 60, 180, 360, 720, 1440, 10080] as const;

const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  scenarioId: z.string().uuid(),
  intervalMinutes: z.number().int().positive().refine(
    (v) => VALID_INTERVALS.includes(v as any),
    { message: `intervalMinutes must be one of: ${VALID_INTERVALS.join(", ")}` }
  ),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scenarioId: z.string().uuid().optional(),
  intervalMinutes: z.number().int().positive().refine(
    (v) => VALID_INTERVALS.includes(v as any),
    { message: `intervalMinutes must be one of: ${VALID_INTERVALS.join(", ")}` }
  ).optional(),
  enabled: z.boolean().optional(),
});

const app = new Hono()
  .get("/", async (c) => {
    const db = await getDB();
    const schedules = await db.getAllSchedules();
    return c.json({ data: schedules });
  })

  .post("/", zValidator("json", createScheduleSchema), async (c) => {
    const db = await getDB();
    const body = c.req.valid("json");

    // Verify the scenario exists
    const scenario = await db.getScenario(body.scenarioId);
    if (!scenario) return c.json({ error: "Scenario not found" }, 404);

    const schedule = await db.createSchedule(body);
    return c.json({ data: schedule }, 201);
  })

  .get("/:id", async (c) => {
    const db = await getDB();
    const schedule = await db.getSchedule(c.req.param("id"));
    if (!schedule) return c.json({ error: "Schedule not found" }, 404);
    return c.json({ data: schedule });
  })

  .put("/:id", zValidator("json", updateScheduleSchema), async (c) => {
    const db = await getDB();
    const body = c.req.valid("json");

    if (body.scenarioId) {
      const scenario = await db.getScenario(body.scenarioId);
      if (!scenario) return c.json({ error: "Scenario not found" }, 404);
    }

    const updated = await db.updateSchedule(c.req.param("id"), body);
    if (!updated) return c.json({ error: "Schedule not found" }, 404);
    return c.json({ data: updated });
  })

  .delete("/:id", async (c) => {
    const db = await getDB();
    const deleted = await db.deleteSchedule(c.req.param("id"));
    if (!deleted) return c.json({ error: "Schedule not found" }, 404);
    return c.json({ data: { deleted: true } });
  })

  .post("/:id/trigger", async (c) => {
    const db = await getDB();
    const schedule = await db.getSchedule(c.req.param("id"));
    if (!schedule) return c.json({ error: "Schedule not found" }, 404);

    const scenario = await db.getScenario(schedule.scenarioId);
    if (!scenario) return c.json({ error: "Scenario not found" }, 404);

    // Resolve the service via feature
    const feature = await db.getFeature(scenario.featureId);
    if (!feature) return c.json({ error: "Feature not found" }, 500);
    const service = await db.getService(feature.serviceId);
    if (!service) return c.json({ error: "Service not found" }, 500);

    // Record the run time on the schedule
    await db.recordScheduleRun(schedule.id);

    const runId = await executeScenarioRun(scenario, service, db);
    return c.json({ data: { runId } }, 202);
  });

export default app;
