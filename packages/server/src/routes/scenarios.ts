import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createScenarioSchema, TestExecutor } from "@testforge/core";
import { getDB } from "../db";
import { v4 as uuid } from "uuid";
import { notFound, executionError } from "../utils/errors";

const app = new Hono()
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

  // POST /api/scenarios/:id/run - 시나리오 실행
  .post("/:id/run", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
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

    // 실행
    const executor = new TestExecutor();

    try {
      const result = await executor.execute(scenario, service, {
        headless: true,
        // 컴포넌트 로더 제공 (PRD Section 5.3)
        componentLoader: async (componentId: string) => {
          return db.getComponent(componentId);
        },
      });

      // 결과 저장
      await db.createTestRun(result.run);
      for (const stepResult of result.stepResults) {
        await db.createStepResult(stepResult);
      }

      // Healing 이벤트 저장
      for (const event of result.healingEvents) {
        await db.createHealingRecord({
          id: uuid(),
          scenarioId: event.scenarioId,
          stepId: event.stepId,
          runId: event.runId,
          locatorDisplayName: event.locatorDisplayName,
          originalStrategy: event.originalStrategy,
          healedStrategy: event.healedStrategy,
          trigger: "element_not_found",
          confidence: event.confidence,
          status: event.confidence >= 0.9 ? "auto_approved" : "pending",
          createdAt: new Date(),
        });
      }

      return c.json({ success: true, data: result.run });
    } catch (error) {
      throw executionError(
        error instanceof Error ? error.message : "Unknown execution error",
        { originalError: error }
      );
    }
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
