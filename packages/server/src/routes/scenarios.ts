import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createScenarioSchema } from "@testforge/core";
import { getDB } from "../db";
import { notFound } from "../utils/errors";
import { executeScenarioRun } from "../execution/runHelper";

const runScenarioSchema = z.object({
  variables: z.record(z.unknown()).optional(),
  environmentId: z.string().optional(),
});

const app = new Hono()
  // GET /api/scenarios - 전체 시나리오 목록 (스케줄 드롭다운 등에서 사용)
  .get("/", async (c) => {
    const db = await getDB();
    const scenarios = await db.getAllScenarios();
    return c.json({ success: true, data: scenarios });
  })

  // GET /api/scenarios/flaky - 불안정 시나리오 목록
  .get("/flaky", async (c) => {
    const db = await getDB();
    const minRunsRaw = parseInt(c.req.query("minRuns") ?? "3", 10);
    const daysRaw = parseInt(c.req.query("days") ?? "30", 10);
    const minRuns = isNaN(minRunsRaw) || minRunsRaw < 1 ? 3 : Math.min(minRunsRaw, 100);
    const days = isNaN(daysRaw) || daysRaw < 1 ? 30 : Math.min(daysRaw, 365);
    const scenarios = await db.getFlakyScenarios(minRuns, days);
    return c.json({ success: true, data: scenarios });
  })

  // GET /api/scenarios/:id - 시나리오 상세
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const scenario = await db.getScenario(id);

    if (!scenario) {
      throw notFound("Scenario", id);
    }

    return c.json({ success: true, data: scenario });
  })

  // PUT /api/scenarios/:id - 시나리오 수정
  .put("/:id", zValidator("json", createScenarioSchema.partial()), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const scenario = await db.updateScenario(id, data);

    if (!scenario) {
      throw notFound("Scenario", id);
    }

    return c.json({ success: true, data: scenario });
  })

  // DELETE /api/scenarios/:id - 시나리오 삭제
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const deleted = await db.deleteScenario(id);

    if (!deleted) {
      throw notFound("Scenario", id);
    }

    return c.json({ success: true });
  })

  // POST /api/scenarios/:id/duplicate - 시나리오 복제
  .post("/:id/duplicate", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const duplicated = await db.duplicateScenario(id);

    if (!duplicated) {
      throw notFound("Scenario", id);
    }

    return c.json({ success: true, data: duplicated }, 201);
  })

  // GET /api/scenarios/:id/stats - 시나리오 실행 통계
  .get("/:id/stats", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const scenario = await db.getScenario(id);

    if (!scenario) {
      throw notFound("Scenario", id);
    }

    const daysParam = c.req.query("days");
    const days = daysParam ? Math.max(1, Math.min(90, parseInt(daysParam, 10) || 7)) : 7;
    const stats = await db.getScenarioStats(id, days);
    return c.json({ success: true, data: stats });
  })

  // GET /api/scenarios/:id/step-stats - 스텝별 성능 통계
  .get("/:id/step-stats", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const scenario = await db.getScenario(id);

    if (!scenario) {
      throw notFound("Scenario", id);
    }

    const stats = await db.getScenarioStepStats(id);
    return c.json({ success: true, data: stats });
  })

  // POST /api/scenarios/:id/run - 시나리오 실행 (body: { variables? })
  .post("/:id/run", zValidator("json", runScenarioSchema.optional()), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const scenario = await db.getScenario(id);

    if (!scenario) {
      throw notFound("Scenario", id);
    }

    // 기능 및 서비스 조회
    const feature = await db.getFeature(scenario.featureId);
    if (!feature) {
      throw notFound("Feature", scenario.featureId);
    }

    const service = await db.getService(feature.serviceId);
    if (!service) {
      throw notFound("Service", feature.serviceId);
    }

    const overrideVars = body?.variables as Record<string, any> | undefined;

    // Resolve environment override if environmentId provided
    let environmentOverride: { baseUrl?: string; variables?: Record<string, any> } | undefined;
    if (body?.environmentId) {
      const env = await db.getEnvironment(body.environmentId);
      if (env) {
        environmentOverride = {
          baseUrl: env.baseUrl,
          variables: Object.keys(env.variables).length > 0 ? env.variables : undefined,
        };
      }
    }

    const runId = await executeScenarioRun(scenario, service, db, overrideVars, environmentOverride);

    return c.json(
      {
        success: true,
        data: {
          runId,
          status: "running",
          message: "Execution started. Connect to /api/runs/:id/stream for real-time updates.",
        },
      },
      202
    );
  })

  // GET /api/scenarios/:id/runs - 시나리오 실행 이력
  .get("/:id/runs", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const scenario = await db.getScenario(id);

    if (!scenario) {
      throw notFound("Scenario", id);
    }

    const runs = await db.getTestRunsByScenario(id);
    return c.json({ success: true, data: runs });
  });

export type ScenariosRoute = typeof app;
export default app;
