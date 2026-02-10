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

    // TODO: 동일 로케이터를 사용하는 다른 시나리오에 전파 로직 구현
    // 현재는 빈 배열 반환
    const propagatedTo: string[] = [];

    const updated = await db.updateHealingRecord(id, {
      propagatedTo,
    });

    return c.json({ success: true, data: updated });
  });

export type HealingRoute = typeof app;
export default app;
