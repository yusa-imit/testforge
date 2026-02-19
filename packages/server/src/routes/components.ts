import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createComponentSchema } from "@testforge/core";
import { getDB } from "../db";
import { notFound } from "../utils/errors";

const app = new Hono()
  // GET /api/components - 컴포넌트 목록
  .get("/", async (c) => {
    const db = await getDB();
    const components = await db.getAllComponents();
    return c.json({ success: true, data: components });
  })

  // GET /api/components/:id - 컴포넌트 상세
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const component = await db.getComponent(id);

    if (!component) {
      throw notFound("Component", id);
    }

    return c.json({ success: true, data: component });
  })

  // POST /api/components - 컴포넌트 생성
  .post("/", zValidator("json", createComponentSchema), async (c) => {
    const db = await getDB();
    const data = c.req.valid("json");
    const component = await db.createComponent(data);
    return c.json({ success: true, data: component }, 201);
  })

  // PUT /api/components/:id - 컴포넌트 수정
  .put("/:id", zValidator("json", createComponentSchema.partial()), async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const component = await db.updateComponent(id, data);

    if (!component) {
      throw notFound("Component", id);
    }

    return c.json({ success: true, data: component });
  })

  // DELETE /api/components/:id - 컴포넌트 삭제
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const deleted = await db.deleteComponent(id);

    if (!deleted) {
      throw notFound("Component", id);
    }

    return c.json({ success: true });
  })

  // GET /api/components/:id/usages - 컴포넌트 사용처
  .get("/:id/usages", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const component = await db.getComponent(id);

    if (!component) {
      throw notFound("Component", id);
    }

    const usages = await db.getComponentUsages(id);
    return c.json({
      success: true,
      data: {
        component,
        usedBy: usages,
        totalUsages: usages.reduce((sum: number, u: { scenarioId: string; stepIndices: number[] }) => sum + u.stepIndices.length, 0),
      },
    });
  });

export type ComponentsRoute = typeof app;
export default app;
