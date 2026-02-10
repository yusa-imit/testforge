import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createFeatureSchema } from "@testforge/core";
import { db } from "../db";

const app = new Hono()
  // GET /api/features/:id - 기능 상세
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const feature = db.getFeature(id);

    if (!feature) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feature not found" } },
        404
      );
    }

    return c.json({ success: true, data: feature });
  })

  // POST /api/features - 기능 생성
  .post("/", zValidator("json", createFeatureSchema), (c) => {
    const data = c.req.valid("json");
    
    // 서비스 존재 확인
    const service = db.getService(data.serviceId);
    if (!service) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service not found" } },
        404
      );
    }

    const feature = db.createFeature(data);
    return c.json({ success: true, data: feature }, 201);
  })

  // PUT /api/features/:id - 기능 수정
  .put("/:id", zValidator("json", createFeatureSchema.partial()), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const feature = db.updateFeature(id, data);

    if (!feature) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feature not found" } },
        404
      );
    }

    return c.json({ success: true, data: feature });
  })

  // DELETE /api/features/:id - 기능 삭제
  .delete("/:id", (c) => {
    const id = c.req.param("id");
    const deleted = db.deleteFeature(id);

    if (!deleted) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feature not found" } },
        404
      );
    }

    return c.json({ success: true });
  })

  // GET /api/features/:id/scenarios - 기능의 시나리오 목록
  .get("/:id/scenarios", (c) => {
    const id = c.req.param("id");
    const feature = db.getFeature(id);

    if (!feature) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Feature not found" } },
        404
      );
    }

    const scenarios = db.getScenariosByFeature(id);
    return c.json({ success: true, data: scenarios });
  });

export type FeaturesRoute = typeof app;
export default app;
