import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDB } from "../db";
import { notFound, badRequest } from "../utils/errors";
import { ExecutionManager } from "../execution/manager";
import type { RunEvent } from "@testforge/core";
import { logger } from "../utils/logger";

const app = new Hono()
  // GET /api/runs - 실행 목록
  .get("/", async (c) => {
    const db = await getDB();
    const limitParam = c.req.query("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const runs = await db.getAllTestRuns(limit);
    return c.json({ success: true, data: runs });
  })

  // GET /api/runs/dashboard - 대시보드 데이터
  .get("/dashboard", async (c) => {
    const db = await getDB();
    const runs = await db.getDashboardRuns(24);

    const total = runs.length;
    const passed = runs.filter((r) => r.status === "passed").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const healed = runs.reduce(
      (acc, r) => acc + (r.summary?.healedSteps || 0),
      0
    );
    const recentFailures = runs
      .filter((r) => r.status === "failed")
      .slice(0, 5);

    return c.json({
      success: true,
      data: {
        stats: { total, passed, failed, healed },
        recentFailures,
      },
    });
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
  })

  // GET /api/runs/:id/stream - 실시간 실행 상태 스트림 (SSE)
  // PRD Section 4.2 - 실시간 통신
  .get("/:id/stream", async (c) => {
    const db = await getDB();
    const id = c.req.param("id");
    const run = await db.getTestRun(id);

    if (!run) {
      throw notFound("Run", id);
    }

    const executionManager = ExecutionManager.getInstance();

    // 이미 완료된 실행인 경우 최종 상태만 전송하고 종료
    if (run.status !== "running") {
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "run:finished",
            data: { status: run.status, summary: run.summary },
          }),
          event: "message",
        });
        await stream.close();
      });
    }

    // 활성 실행 조회
    const executor = executionManager.getExecutor(id);
    if (!executor) {
      // 실행 중이지만 executor를 찾을 수 없는 경우
      return c.json(
        {
          success: false,
          error: {
            code: "EXECUTOR_NOT_FOUND",
            message: "Run is marked as running but executor not found",
          },
        },
        404
      );
    }

    // SSE 스트림 시작
    return streamSSE(c, async (stream) => {
      let closed = false;

      // 이벤트 리스너 등록
      const eventHandler = async (event: RunEvent) => {
        if (closed) return;

        try {
          await stream.writeSSE({
            data: JSON.stringify(event),
            event: "message",
          });

          // run:finished 이벤트 후 스트림 종료
          if (event.type === "run:finished") {
            closed = true;
            await stream.close();
          }
        } catch (error) {
          // 클라이언트 연결 끊김 등의 에러 처리
          logger.error("SSE write error", { error, runId: id });
          closed = true;
        }
      };

      executor.on("event", eventHandler);

      // Keep-alive: 30초마다 heartbeat 전송
      const heartbeatInterval = setInterval(async () => {
        if (closed) {
          clearInterval(heartbeatInterval);
          return;
        }

        try {
          await stream.writeSSE({
            data: JSON.stringify({ type: "heartbeat" }),
            event: "heartbeat",
          });
        } catch (error) {
          logger.error("SSE heartbeat error", { error, runId: id });
          closed = true;
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // 클라이언트 연결 끊김 처리
      c.req.raw.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeatInterval);
        executor.off("event", eventHandler);
      });
    });
  });

export type RunsRoute = typeof app;
export default app;
