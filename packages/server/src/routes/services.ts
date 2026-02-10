import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createServiceSchema, createFeatureSchema } from "@testforge/core";
import { getDB } from "../db";
import { notFound } from "../utils/errors";

const app = new Hono()
  // GET /api/services - 서비스 목록
  .get("/", async (c) => {
    const db = await getDB();
    const services = await db.getAllServices();
    return c.json({ success: true, data: services });
  })

  // POST /api/services - 서비스 생성
  .post("/", zValidator("json", createServiceSchema), async (c) => {
    const db = await getDB();
    const data = c.req.valid("json");
    const service = await db.createService(data);
    return c.json({ success: true, data: service }, 201);
  })

  // GET /api/services/:id - 서비스 상세
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const service = await db.getService(id);

    if (!service) {
      throw notFound("Service", id);
    }

    return c.json({ success: true, data: service });
  })

  // PUT /api/services/:id - 서비스 수정
  .put("/:id", zValidator("json", createServiceSchema.partial()), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const service = await db.updateService(id, data);

    if (!service) {
      throw notFound("Service", id);
    }

    return c.json({ success: true, data: service });
  })

  // DELETE /api/services/:id - 서비스 삭제
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const deleted = await db.deleteService(id);

    if (!deleted) {
      throw notFound("Service", id);
    }

    return c.json({ success: true });
  })

  // GET /api/services/:serviceId/features - 서비스의 기능 목록
  .get("/:serviceId/features", async (c) => {
    const db = await getDB();
    const serviceId = c.req.param("serviceId");
    const service = await db.getService(serviceId);

    if (!service) {
      throw notFound("Service", serviceId);
    }

    const features = await db.getFeaturesByService(serviceId);
    return c.json({ success: true, data: features });
  })

  // POST /api/services/:serviceId/features - 기능 생성
  .post("/:serviceId/features", zValidator("json", createFeatureSchema), async (c) => {
    const db = await getDB();
    const serviceId = c.req.param("serviceId");

    // 서비스 존재 확인
    const service = await db.getService(serviceId);
    if (!service) {
      throw notFound("Service", serviceId);
    }

    const data = c.req.valid("json");

    // serviceId는 URL에서 가져와서 덮어씀
    const feature = await db.createFeature({ ...data, serviceId });
    return c.json({ success: true, data: feature }, 201);
  });

export type ServicesRoute = typeof app;
export default app;
