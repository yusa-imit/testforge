import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";

const reviewSchema = z.object({
  reviewedBy: z.string().optional(),
  reviewNote: z.string().optional(),
});

const app = new Hono()
  // GET /api/healing - Healing 기록 목록
  .get("/", (c) => {
    const status = c.req.query("status");
    
    let records = db.getAllHealingRecords();
    
    if (status) {
      records = records.filter((r) => r.status === status);
    }

    return c.json({ success: true, data: records });
  })

  // GET /api/healing/stats - Healing 통계
  .get("/stats", (c) => {
    const stats = db.getHealingStats();
    return c.json({ success: true, data: stats });
  })

  // GET /api/healing/:id - Healing 기록 상세
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const record = db.getHealingRecord(id);

    if (!record) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Healing record not found" } },
        404
      );
    }

    return c.json({ success: true, data: record });
  })

  // POST /api/healing/:id/approve - Healing 승인
  .post("/:id/approve", zValidator("json", reviewSchema), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const record = db.getHealingRecord(id);

    if (!record) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Healing record not found" } },
        404
      );
    }

    if (record.status !== "pending") {
      return c.json(
        { success: false, error: { code: "INVALID_STATE", message: "Record is not pending" } },
        400
      );
    }

    const updated = db.updateHealingRecord(id, {
      status: "approved",
      reviewedBy: data.reviewedBy,
      reviewNote: data.reviewNote,
      reviewedAt: new Date(),
    });

    return c.json({ success: true, data: updated });
  })

  // POST /api/healing/:id/reject - Healing 거부
  .post("/:id/reject", zValidator("json", reviewSchema), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const record = db.getHealingRecord(id);

    if (!record) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Healing record not found" } },
        404
      );
    }

    if (record.status !== "pending") {
      return c.json(
        { success: false, error: { code: "INVALID_STATE", message: "Record is not pending" } },
        400
      );
    }

    const updated = db.updateHealingRecord(id, {
      status: "rejected",
      reviewedBy: data.reviewedBy,
      reviewNote: data.reviewNote,
      reviewedAt: new Date(),
    });

    return c.json({ success: true, data: updated });
  })

  // POST /api/healing/:id/propagate - 다른 시나리오에 전파
  .post("/:id/propagate", async (c) => {
    const id = c.req.param("id");
    const record = db.getHealingRecord(id);

    if (!record) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Healing record not found" } },
        404
      );
    }

    if (record.status !== "approved" && record.status !== "auto_approved") {
      return c.json(
        { success: false, error: { code: "INVALID_STATE", message: "Record must be approved" } },
        400
      );
    }

    // TODO: 동일 로케이터를 사용하는 다른 시나리오에 전파 로직 구현
    // 현재는 빈 배열 반환
    const propagatedTo: string[] = [];

    const updated = db.updateHealingRecord(id, {
      propagatedTo,
    });

    return c.json({ success: true, data: updated });
  });

export type HealingRoute = typeof app;
export default app;
