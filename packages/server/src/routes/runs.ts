import { Hono } from "hono";
import { db } from "../db";

const app = new Hono()
  // GET /api/runs - 실행 목록
  .get("/", (c) => {
    const limitParam = c.req.query("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const runs = db.getAllTestRuns(limit);
    return c.json({ success: true, data: runs });
  })

  // GET /api/runs/:id - 실행 상세
  .get("/:id", (c) => {
    const id = c.req.param("id");
    const run = db.getTestRun(id);

    if (!run) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Run not found" } },
        404
      );
    }

    return c.json({ success: true, data: run });
  })

  // GET /api/runs/:id/steps - 실행의 스텝 결과
  .get("/:id/steps", (c) => {
    const id = c.req.param("id");
    const run = db.getTestRun(id);

    if (!run) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Run not found" } },
        404
      );
    }

    const stepResults = db.getStepResultsByRun(id);
    return c.json({ success: true, data: stepResults });
  })

  // DELETE /api/runs/:id - 실행 취소 (상태 업데이트)
  .delete("/:id", (c) => {
    const id = c.req.param("id");
    const run = db.getTestRun(id);

    if (!run) {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Run not found" } },
        404
      );
    }

    if (run.status !== "running") {
      return c.json(
        { success: false, error: { code: "INVALID_STATE", message: "Run is not running" } },
        400
      );
    }

    const updated = db.updateTestRun(id, {
      status: "cancelled",
      finishedAt: new Date(),
    });

    return c.json({ success: true, data: updated });
  });

export type RunsRoute = typeof app;
export default app;
