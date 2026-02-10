import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createServiceSchema } from "@testforge/core";
import { db } from "../db";

const app = new Hono()
  // GET /api/services - 서비스 목록
  .get("/", (c) => {
    const services = db.getAllServices();
    return c.json({ success: true, data: services });
  })

  // POST /api/services - 서비스 생성
  .post("/", zValidator("json", createServiceSchema), (c) => {
    const data = c.req.valid("json");
    const service = db.createService(data);
    return c.json({ success: true, data: service }, 201);
  })

  // GET /api/services/:id - 서비스 상세
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const service = db.getService(id);

    if (!service) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service not found" } },
        404
      );
    }

    return c.json({ success: true, data: service });
  })

  // PUT /api/services/:id - 서비스 수정
  .put("/:id", zValidator("json", createServiceSchema.partial()), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const service = db.updateService(id, data);

    if (!service) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service not found" } },
        404
      );
    }

    return c.json({ success: true, data: service });
  })

  // DELETE /api/services/:id - 서비스 삭제
  .delete("/:id", (c) => {
    const id = c.req.param("id");
    const deleted = db.deleteService(id);

    if (!deleted) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service not found" } },
        404
      );
    }

    return c.json({ success: true });
  })

  // GET /api/services/:id/features - 서비스의 기능 목록
  .get("/:id/features", (c) => {
    const id = c.req.param("id");
    const service = db.getService(id);

    if (!service) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Service not found" } },
        404
      );
    }

    const features = db.getFeaturesByService(id);
    return c.json({ success: true, data: features });
  });

export type ServicesRoute = typeof app;
export default app;
