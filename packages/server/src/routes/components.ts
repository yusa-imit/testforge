import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createComponentSchema } from "@testforge/core";
import { db } from "../db";

const app = new Hono()
  // GET /api/components - 컴포넌트 목록
  .get("/", (c) => {
    const components = db.getAllComponents();
    return c.json({ success: true, data: components });
  })

  // GET /api/components/:id - 컴포넌트 상세
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const component = db.getComponent(id);

    if (!component) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Component not found" } },
        404
      );
    }

    return c.json({ success: true, data: component });
  })

  // POST /api/components - 컴포넌트 생성
  .post("/", zValidator("json", createComponentSchema), (c) => {
    const data = c.req.valid("json");
    const component = db.createComponent(data);
    return c.json({ success: true, data: component }, 201);
  })

  // PUT /api/components/:id - 컴포넌트 수정
  .put("/:id", zValidator("json", createComponentSchema.partial()), (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const component = db.updateComponent(id, data);

    if (!component) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Component not found" } },
        404
      );
    }

    return c.json({ success: true, data: component });
  })

  // DELETE /api/components/:id - 컴포넌트 삭제
  .delete("/:id", (c) => {
    const id = c.req.param("id");
    const deleted = db.deleteComponent(id);

    if (!deleted) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Component not found" } },
        404
      );
    }

    return c.json({ success: true });
  })

  // GET /api/components/:id/usages - 컴포넌트 사용처
  .get("/:id/usages", (c) => {
    const id = c.req.param("id");
    const component = db.getComponent(id);

    if (!component) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Component not found" } },
        404
      );
    }

    const usages = db.getComponentUsages(id);
    return c.json({
      success: true,
      data: {
        component,
        usedBy: usages,
        totalUsages: usages.reduce((sum, u) => sum + u.stepIndices.length, 0),
      },
    });
  });

export type ComponentsRoute = typeof app;
export default app;
