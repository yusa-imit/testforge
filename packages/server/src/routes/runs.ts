import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDB } from "../db";
import { notFound, badRequest } from "../utils/errors";
import { ExecutionManager } from "../execution/manager";
import type { RunEvent } from "@testforge/core";
import { logger } from "../utils/logger";

const app = new Hono()
  // GET /api/runs - 실행 목록 (PRD Section 4.1: 필터링 지원)
  .get("/", async (c) => {
    const db = await getDB();
    const limitParam = c.req.query("limit");
    const offsetParam = c.req.query("offset");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const scenarioId = c.req.query("scenarioId") || undefined;
    const status = c.req.query("status") || undefined;
    const featureId = c.req.query("featureId") || undefined;
    const serviceId = c.req.query("serviceId") || undefined;
    const fromParam = c.req.query("from");
    const toParam = c.req.query("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;
    const runs = await db.getAllTestRuns(limit, { scenarioId, status, featureId, serviceId, from, to }, offset);
    return c.json({ success: true, data: runs });
  })

  // GET /api/runs/dashboard - 대시보드 데이터
  .get("/dashboard", async (c) => {
    const db = await getDB();
    const daysParam = c.req.query("days");
    const days = daysParam ? Math.max(1, Math.min(90, parseInt(daysParam, 10) || 7)) : 7;

    const [runs, globalStats] = await Promise.all([
      db.getDashboardRuns(24),
      db.getDashboardStats(days),
    ]);

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
        globalStats,
      },
    });
  })

  // GET /api/runs/export - 다운로드 (CSV 또는 JUnit XML, ?format=junit|csv)
  .get("/export", async (c) => {
    const db = await getDB();
    const format = c.req.query("format") || "csv";
    const scenarioId = c.req.query("scenarioId") || undefined;
    const status = c.req.query("status") || undefined;
    const featureId = c.req.query("featureId") || undefined;
    const serviceId = c.req.query("serviceId") || undefined;
    const fromParam = c.req.query("from");
    const toParam = c.req.query("to");
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const runs = await db.getAllTestRuns(10000, { scenarioId, status, featureId, serviceId, from, to }, 0);
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "junit") {
      const escapeXml = (str: string): string =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

      const totalTests = runs.length;
      const totalFailures = runs.filter((r) => r.status === "failed" || r.status === "cancelled").length;
      const totalTime = runs.reduce((acc, r) => acc + (r.duration ?? 0), 0) / 1000;

      const testcases = runs.map((run) => {
        const name = escapeXml((run as any).scenarioName ?? run.scenarioId);
        const timeS = ((run.duration ?? 0) / 1000).toFixed(3);
        const timestamp = (run.startedAt ?? run.createdAt).toISOString();
        const failed = run.status === "failed" || run.status === "cancelled";
        const failureEl = failed
          ? `      <failure message="${escapeXml(`Run ${run.status}`)}" type="TestFailure">` +
            `Status: ${run.status}` +
            (run.summary ? `&#10;Steps: ${run.summary.totalSteps} total, ${run.summary.passedSteps} passed, ${run.summary.failedSteps} failed` : "") +
            `</failure>\n`
          : "";
        return (
          `    <testcase name="${name}" classname="${name}" time="${timeS}" timestamp="${timestamp}">\n` +
          failureEl +
          `    </testcase>`
        );
      });

      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<testsuites name="TestForge" tests="${totalTests}" failures="${totalFailures}" errors="0" time="${totalTime.toFixed(3)}">\n` +
        `  <testsuite name="TestForge Run Export" tests="${totalTests}" failures="${totalFailures}" errors="0" time="${totalTime.toFixed(3)}" timestamp="${new Date().toISOString()}">\n` +
        testcases.join("\n") + "\n" +
        `  </testsuite>\n` +
        `</testsuites>`;

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="testforge-runs-${dateStr}.xml"`,
        },
      });
    }

    // Default: CSV
    const escapeCSV = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = [
      "id", "scenarioName", "status",
      "startedAt", "finishedAt", "duration_ms",
      "totalSteps", "passedSteps", "failedSteps", "healedSteps", "skippedSteps",
      "createdAt",
    ];
    const rows = runs.map((run) =>
      [
        run.id,
        (run as any).scenarioName ?? "",
        run.status,
        run.startedAt?.toISOString() ?? "",
        run.finishedAt?.toISOString() ?? "",
        run.duration ?? "",
        run.summary?.totalSteps ?? "",
        run.summary?.passedSteps ?? "",
        run.summary?.failedSteps ?? "",
        run.summary?.healedSteps ?? "",
        run.summary?.skippedSteps ?? "",
        run.createdAt.toISOString(),
      ]
        .map(escapeCSV)
        .join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="testforge-runs-${dateStr}.csv"`,
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

  // DELETE /api/runs/cleanup - 오래된 실행 삭제 (유지보수)
  .delete("/cleanup", async (c) => {
    const db = await getDB();
    const olderThanParam = c.req.query("olderThan");
    const olderThanDays = olderThanParam ? parseInt(olderThanParam, 10) : 30;

    if (isNaN(olderThanDays) || olderThanDays < 1 || olderThanDays > 365) {
      throw badRequest("olderThan must be between 1 and 365 days", { code: "INVALID_PARAM" });
    }

    const deleted = await db.cleanupRuns(olderThanDays);
    return c.json({ success: true, data: { deleted, olderThanDays } });
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
