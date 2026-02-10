import { Hono } from "hono";
import { getDB } from "../db";
import { notFound, badRequest } from "../utils/errors";

const app = new Hono()
  // GET /api/runs - 실행 목록
  .get("/", async (c) => {
    const db = await getDB();
    const limitParam = c.req.query("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const runs = await db.getAllTestRuns(limit);
    return c.json({ success: true, data: runs });
  })

  // GET /api/runs/:id - 실행 상세
  .get("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const run = await db.getTestRun(id);

    if (!run) {
      throw notFound("Run", id);
    }

    return c.json({ success: true, data: run });
  })

  // GET /api/runs/:id/steps - 실행의 스텝 결과
  .get("/:id/steps", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const run = await db.getTestRun(id);

    if (!run) {
      throw notFound("Run", id);
    }

    const stepResults = await db.getStepResultsByRun(id);
    return c.json({ success: true, data: stepResults });
  })

  // DELETE /api/runs/:id - 실행 취소 (상태 업데이트)
  .delete("/:id", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const run = await db.getTestRun(id);

    if (!run) {
      throw notFound("Run", id);
    }

    if (run.status !== "running") {
      throw badRequest("Run is not running", {
        code: "INVALID_STATE",
        currentStatus: run.status
      });
    }

    const updated = await db.updateTestRun(id, {
      status: "cancelled",
      finishedAt: new Date(),
    });

    return c.json({ success: true, data: updated });
  });

export type RunsRoute = typeof app;
export default app;
