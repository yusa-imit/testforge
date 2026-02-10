import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getDB } from "../db";
import { notFound, badRequest } from "../utils/errors";

const reviewSchema = z.object({
  reviewedBy: z.string().optional(),
  reviewNote: z.string().optional(),
});

const app = new Hono()
  // GET /api/healing - Healing 기록 목록
  .get("/", async (c) => {
    const db = await getDB();
    const status = c.req.query("status");

    let records = await db.getAllHealingRecords();

    if (status) {
      records = records.filter((r: any) => r.status === status);
    }

    return c.json({ success: true, data: records });
  })

  // GET /api/healing/stats - Healing 통계
  .get("/stats", async (c) => {
    const db = await getDB();
    const stats = await db.getHealingStats();
    return c.json({ success: true, data: stats });
  })

  // GET /api/healing/:id - Healing 기록 상세
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const record = await db.getHealingRecord(id);

    if (!record) {
      throw notFound("Healing record", id);
    }

    return c.json({ success: true, data: record });
  })

  // POST /api/healing/:id/approve - Healing 승인
  .post("/:id/approve", zValidator("json", reviewSchema), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const record = await db.getHealingRecord(id);

    if (!record) {
      throw notFound("Healing record", id);
    }

    if (record.status !== "pending") {
      throw badRequest("Record is not pending", {
        code: "INVALID_STATE",
        currentStatus: record.status
      });
    }

    const updated = await db.updateHealingRecord(id, {
      status: "approved",
      reviewedBy: data.reviewedBy,
      reviewNote: data.reviewNote,
      reviewedAt: new Date(),
    });

    return c.json({ success: true, data: updated });
  })

  // POST /api/healing/:id/reject - Healing 거부
  .post("/:id/reject", zValidator("json", reviewSchema), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const record = await db.getHealingRecord(id);

    if (!record) {
      throw notFound("Healing record", id);
    }

    if (record.status !== "pending") {
      throw badRequest("Record is not pending", {
        code: "INVALID_STATE",
        currentStatus: record.status
      });
    }

    const updated = await db.updateHealingRecord(id, {
      status: "rejected",
      reviewedBy: data.reviewedBy,
      reviewNote: data.reviewNote,
      reviewedAt: new Date(),
    });

    return c.json({ success: true, data: updated });
  })

  // POST /api/healing/:id/propagate - 다른 시나리오에 전파
  .post("/:id/propagate", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const record = await db.getHealingRecord(id);

    if (!record) {
      throw notFound("Healing record", id);
    }

    if (record.status !== "approved" && record.status !== "auto_approved") {
      throw badRequest("Record must be approved", {
        code: "INVALID_STATE",
        currentStatus: record.status
      });
    }

    // 동일 로케이터를 사용하는 다른 시나리오 찾기
    const allScenarios = await db.getAllScenarios();
    const propagatedTo: string[] = [];

    for (const scenario of allScenarios) {
      // 자기 자신은 제외
      if (scenario.id === record.scenarioId) {
        continue;
      }

      let scenarioModified = false;
      const updatedSteps = scenario.steps.map((step: any) => {
        // 로케이터를 가진 스텝 타입인지 확인
        const hasLocator = ["click", "fill", "select", "hover", "wait", "assert"].includes(step.type);
        if (!hasLocator || !step.config?.locator) {
          return step;
        }

        // 동일한 displayName을 가진 로케이터인지 확인
        if (step.config.locator.displayName !== record.locatorDisplayName) {
          return step;
        }

        // 로케이터 전략 업데이트
        const currentStrategies = step.config.locator.strategies || [];

        // 기존 전략에서 healed strategy와 동일한 타입 제거
        const filteredStrategies = currentStrategies.filter(
          (s: any) => s.type !== record.healedStrategy.type
        );

        // healed strategy를 최우선(priority: 1)으로 추가
        const updatedStrategies = [
          { ...record.healedStrategy, priority: 1 },
          ...filteredStrategies.map((s: any, idx: number) => ({
            ...s,
            priority: idx + 2
          }))
        ];

        scenarioModified = true;

        return {
          ...step,
          config: {
            ...step.config,
            locator: {
              ...step.config.locator,
              strategies: updatedStrategies
            }
          }
        };
      });

      // 시나리오가 수정되었으면 저장
      if (scenarioModified) {
        await db.updateScenario(scenario.id, { steps: updatedSteps });
        propagatedTo.push(scenario.id);
      }
    }

    const updated = await db.updateHealingRecord(id, {
      propagatedTo,
    });

    return c.json({
      success: true,
      data: updated,
      message: `${propagatedTo.length}개 시나리오에 전파되었습니다.`
    });
  });

export type HealingRoute = typeof app;
export default app;
