import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createScenarioSchema, TestExecutor } from "@testforge/core";
import { db } from "../db";
import { v4 as uuid } from "uuid";

const app = new Hono()
  // GET /api/scenarios - 시나리오 목록
  .get("/", (c) => {
    const scenarios = db.getAllScenarios();
    return c.json({ success: true, data: scenarios });
  })

  // GET /api/scenarios/:id - 시나리오 상세
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const scenario = db.getScenario(id);

    if (!scenario) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scenario not found" } },
        404
      );
    }

    return c.json({ success: true, data: scenario });
  })

  // POST /api/scenarios - 시나리오 생성
  .post("/", zValidator("json", createScenarioSchema), (c) => {
    const data = c.req.valid("json");

    // 기능 존재 확인
    const feature = db.getFeature(data.featureId);
    if (!feature) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feature not found" } },
        404
      );
    }

    const scenario = db.createScenario(data);
    return c.json({ success: true, data: scenario }, 201);
  })

  // PUT /api/scenarios/:id - 시나리오 수정
  .put("/:id", zValidator("json", createScenarioSchema.partial()), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const scenario = db.updateScenario(id, data);

    if (!scenario) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scenario not found" } },
        404
      );
    }

    return c.json({ success: true, data: scenario });
  })

  // DELETE /api/scenarios/:id - 시나리오 삭제
  .delete("/:id", (c) => {
    const id = c.req.param("id");
    const deleted = db.deleteScenario(id);

    if (!deleted) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scenario not found" } },
        404
      );
    }

    return c.json({ success: true });
  })

  // POST /api/scenarios/:id/duplicate - 시나리오 복제
  .post("/:id/duplicate", (c) => {
    const id = c.req.param("id");
    const duplicated = db.duplicateScenario(id);

    if (!duplicated) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scenario not found" } },
        404
      );
    }

    return c.json({ success: true, data: duplicated }, 201);
  })

  // POST /api/scenarios/:id/run - 시나리오 실행
  .post("/:id/run", async (c) => {
    const id = c.req.param("id");
    const scenario = db.getScenario(id);

    if (!scenario) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scenario not found" } },
        404
      );
    }

    // 기능 및 서비스 조회
    const feature = db.getFeature(scenario.featureId);
    if (!feature) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feature not found" } },
        404
      );
    }

    const service = db.getService(feature.serviceId);
    if (!service) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service not found" } },
        404
      );
    }

    // 실행
    const executor = new TestExecutor();
    
    try {
      const result = await executor.execute(scenario, service, {
        headless: true,
      });

      // 결과 저장
      db.createTestRun(result.run);
      for (const stepResult of result.stepResults) {
        db.createStepResult(stepResult);
      }

      // Healing 이벤트 저장
      for (const event of result.healingEvents) {
        db.createHealingRecord({
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
      return c.json(
        {
          success: false,
          error: {
            code: "EXECUTION_ERROR",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        },
        500
      );
    }
  })

  // GET /api/scenarios/:id/runs - 시나리오 실행 이력
  .get("/:id/runs", (c) => {
    const id = c.req.param("id");
    const scenario = db.getScenario(id);

    if (!scenario) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Scenario not found" } },
        404
      );
    }

    const runs = db.getTestRunsByScenario(id);
    return c.json({ success: true, data: runs });
  });

export type ScenariosRoute = typeof app;
export default app;
