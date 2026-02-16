import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createFeatureSchema, createScenarioSchema } from "@testforge/core";
import { getDB } from "../db";
import { notFound } from "../utils/errors";
import { executeScenarioRun } from "../execution/runHelper";

const app = new Hono()
  // GET /api/features/:id - 기능 상세
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const feature = await db.getFeature(id);

    if (!feature) {
      throw notFound("Feature", id);
    }

    return c.json({ success: true, data: feature });
  })

  // PUT /api/features/:id - 기능 수정
  .put("/:id", zValidator("json", createFeatureSchema.partial()), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const feature = await db.updateFeature(id, data);

    if (!feature) {
      throw notFound("Feature", id);
    }

    return c.json({ success: true, data: feature });
  })

  // DELETE /api/features/:id - 기능 삭제
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const deleted = await db.deleteFeature(id);

    if (!deleted) {
      throw notFound("Feature", id);
    }

    return c.json({ success: true });
  })

  // GET /api/features/:featureId/scenarios - 기능의 시나리오 목록
  .get("/:featureId/scenarios", async (c) => {
    const db = await getDB();
    const featureId = c.req.param("featureId");
    const feature = await db.getFeature(featureId);

    if (!feature) {
      throw notFound("Feature", featureId);
    }

    const scenarios = await db.getScenariosByFeature(featureId);
    return c.json({ success: true, data: scenarios });
  })

  // POST /api/features/:id/run - 기능 전체 실행 (PRD Section 4.1)
  .post("/:id/run", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const feature = await db.getFeature(id);

    if (!feature) {
      throw notFound("Feature", id);
    }

    const service = await db.getService(feature.serviceId);
    if (!service) {
      throw notFound("Service", feature.serviceId);
    }

    const scenarios = await db.getScenariosByFeature(id);
    if (scenarios.length === 0) {
      return c.json({
        success: true,
        data: { runIds: [], message: "No scenarios to run." },
      });
    }

    // Execute all scenarios sequentially
    const runIds: string[] = [];
    for (const scenario of scenarios) {
      const runId = await executeScenarioRun(scenario, service, db);
      runIds.push(runId);
    }

    return c.json(
      {
        success: true,
        data: {
          runIds,
          total: scenarios.length,
          message: `Started ${scenarios.length} scenario(s). Connect to /api/runs/:id/stream for updates.`,
        },
      },
      202
    );
  })

  // POST /api/features/:featureId/scenarios - 시나리오 생성
  .post("/:featureId/scenarios", zValidator("json", createScenarioSchema), async (c) => {
    const db = await getDB();
    const featureId = c.req.param("featureId");

    // 기능 존재 확인
    const feature = await db.getFeature(featureId);
    if (!feature) {
      throw notFound("Feature", featureId);
    }

    const data = c.req.valid("json");

    // featureId는 URL에서 가져와서 덮어씀
    const scenario = await db.createScenario({ ...data, featureId });
    return c.json({ success: true, data: scenario }, 201);
  });

export type FeaturesRoute = typeof app;
export default app;
