import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import {
  timing,
  getPerformanceMetrics,
  clearPerformanceMetrics,
} from "./timing";

describe("timing middleware", () => {
  let app: Hono;

  beforeEach(() => {
    clearPerformanceMetrics();
    app = new Hono();
    app.use("*", timing);
  });

  describe("X-Response-Time header", () => {
    it("should add X-Response-Time header to response", async () => {
      app.get("/test", (c) => c.json({ message: "ok" }));

      const res = await app.request("/test");

      expect(res.headers.has("X-Response-Time")).toBe(true);
      const responseTime = res.headers.get("X-Response-Time");
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    it("should measure response time accurately", async () => {
      app.get("/slow", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return c.json({ message: "ok" });
      });

      const res = await app.request("/slow");
      const responseTime = res.headers.get("X-Response-Time");

      expect(responseTime).toBeDefined();
      const duration = parseInt(responseTime!.replace("ms", ""), 10);
      expect(duration).toBeGreaterThanOrEqual(50);
    });

    it("should add header to error responses", async () => {
      app.get("/error", () => {
        throw new Error("Test error");
      });

      const res = await app.request("/error");

      expect(res.headers.has("X-Response-Time")).toBe(true);
      const responseTime = res.headers.get("X-Response-Time");
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    it("should add header to different status codes", async () => {
      app.get("/created", (c) => c.json({ id: "123" }, 201));
      app.get("/nocontent", (c) => c.body(null, 204));
      app.get("/notfound", (c) => c.json({ error: "Not found" }, 404));

      const res201 = await app.request("/created");
      const res204 = await app.request("/nocontent");
      const res404 = await app.request("/notfound");

      expect(res201.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
      expect(res204.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
      expect(res404.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
    });
  });

  describe("performance metrics collection", () => {
    it("should collect metrics for each request", async () => {
      app.get("/test", (c) => c.json({ message: "ok" }));

      await app.request("/test");

      const metrics = getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.recentMetrics).toHaveLength(1);
      expect(metrics.recentMetrics[0]).toMatchObject({
        path: "/test",
        method: "GET",
        statusCode: 200,
      });
      expect(metrics.recentMetrics[0].duration).toBeGreaterThanOrEqual(0);
      expect(metrics.recentMetrics[0].timestamp).toBeInstanceOf(Date);
    });

    it("should collect metrics for multiple requests", async () => {
      app.get("/endpoint1", (c) => c.json({ data: "1" }));
      app.post("/endpoint2", (c) => c.json({ data: "2" }));
      app.put("/endpoint3", (c) => c.json({ data: "3" }));

      await app.request("/endpoint1");
      await app.request("/endpoint2", { method: "POST" });
      await app.request("/endpoint3", { method: "PUT" });

      const metrics = getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.recentMetrics).toHaveLength(3);

      const paths = metrics.recentMetrics.map((m) => m.path);
      expect(paths).toContain("/endpoint1");
      expect(paths).toContain("/endpoint2");
      expect(paths).toContain("/endpoint3");
    });

    it("should limit stored metrics to last 100 requests", async () => {
      app.get("/test", (c) => c.json({ message: "ok" }));

      // Make 150 requests
      for (let i = 0; i < 150; i++) {
        await app.request("/test");
      }

      const metrics = getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(100); // Should cap at MAX_METRICS
    });

    it("should track slow request count", async () => {
      app.get("/fast", (c) => c.json({ message: "ok" }));
      app.get("/slow", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 1100));
        return c.json({ message: "slow" });
      });

      await app.request("/fast");
      await app.request("/slow");

      const metrics = getPerformanceMetrics();
      expect(metrics.slowRequests).toBe(1);
      expect(metrics.slowRequestThreshold).toBe(1000);
    });

    it("should clear metrics when clearPerformanceMetrics is called", async () => {
      app.get("/test", (c) => c.json({ message: "ok" }));

      await app.request("/test");
      expect(getPerformanceMetrics().totalRequests).toBe(1);

      clearPerformanceMetrics();
      const metrics = getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.recentMetrics).toHaveLength(0);
    });
  });

  describe("performance summary", () => {
    it("should return empty summary when no metrics", () => {
      const metrics = getPerformanceMetrics();

      expect(metrics).toEqual({
        totalRequests: 0,
        averageDuration: 0,
        slowRequests: 0,
        slowRequestThreshold: 1000,
        summary: [],
        recentMetrics: [],
      });
    });

    it("should calculate average duration correctly", async () => {
      app.get("/test1", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return c.json({ message: "ok" });
      });
      app.get("/test2", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return c.json({ message: "ok" });
      });

      await app.request("/test1");
      await app.request("/test2");

      const metrics = getPerformanceMetrics();
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(100); // Average of ~50ms and ~150ms
    });

    it("should group metrics by endpoint", async () => {
      app.get("/api/users", (c) => c.json({ users: [] }));
      app.post("/api/users", (c) => c.json({ id: "123" }));

      await app.request("/api/users");
      await app.request("/api/users");
      await app.request("/api/users", { method: "POST" });

      const metrics = getPerformanceMetrics();
      expect(metrics.summary).toHaveLength(2);

      const getSummary = metrics.summary.find((s) => s.endpoint === "GET /api/users");
      const postSummary = metrics.summary.find((s) => s.endpoint === "POST /api/users");

      expect(getSummary).toBeDefined();
      expect(getSummary!.count).toBe(2);
      expect(postSummary).toBeDefined();
      expect(postSummary!.count).toBe(1);
    });

    it("should calculate min/max/avg duration per endpoint", async () => {
      app.get("/test", async (c) => {
        const delay = Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return c.json({ message: "ok" });
      });

      // Make 5 requests to same endpoint
      for (let i = 0; i < 5; i++) {
        await app.request("/test");
      }

      const metrics = getPerformanceMetrics();
      expect(metrics.summary).toHaveLength(1);

      const summary = metrics.summary[0];
      expect(summary.endpoint).toBe("GET /test");
      expect(summary.count).toBe(5);
      expect(summary.minDuration).toBeGreaterThanOrEqual(0);
      expect(summary.maxDuration).toBeGreaterThanOrEqual(summary.minDuration);
      expect(summary.avgDuration).toBeGreaterThanOrEqual(summary.minDuration);
      expect(summary.avgDuration).toBeLessThanOrEqual(summary.maxDuration);
    });

    it("should sort summary by slowest average duration first", async () => {
      app.get("/fast", (c) => c.json({ message: "ok" }));
      app.get("/slow", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return c.json({ message: "ok" });
      });

      await app.request("/fast");
      await app.request("/slow");

      const metrics = getPerformanceMetrics();
      expect(metrics.summary).toHaveLength(2);
      expect(metrics.summary[0].endpoint).toBe("GET /slow"); // Slowest first
      expect(metrics.summary[1].endpoint).toBe("GET /fast");
      expect(metrics.summary[0].avgDuration).toBeGreaterThan(
        metrics.summary[1].avgDuration
      );
    });

    it("should return last 20 requests in reverse chronological order", async () => {
      app.get("/test", (c) => c.json({ message: "ok" }));

      // Make 25 requests
      for (let i = 0; i < 25; i++) {
        await app.request("/test");
      }

      const metrics = getPerformanceMetrics();
      expect(metrics.recentMetrics).toHaveLength(20);

      // Verify newest first
      const timestamps = metrics.recentMetrics.map((m) => m.timestamp.getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  describe("error handling", () => {
    it("should still record metrics when route throws error", async () => {
      app.get("/error", () => {
        throw new Error("Test error");
      });

      await app.request("/error");

      const metrics = getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.recentMetrics[0].path).toBe("/error");
      expect(metrics.recentMetrics[0].statusCode).toBe(500);
    });

    it("should measure time correctly even with errors", async () => {
      app.get("/slow-error", async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        throw new Error("Delayed error");
      });

      const res = await app.request("/slow-error");
      const responseTime = res.headers.get("X-Response-Time");

      expect(responseTime).toBeDefined();
      const duration = parseInt(responseTime!.replace("ms", ""), 10);
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe("edge cases", () => {
    it("should handle requests with query parameters", async () => {
      app.get("/search", (c) => c.json({ results: [] }));

      await app.request("/search?q=test&limit=10");

      const metrics = getPerformanceMetrics();
      expect(metrics.recentMetrics[0].path).toBe("/search");
    });

    it("should handle different HTTP methods", async () => {
      app.get("/resource", (c) => c.json({ id: "1" }));
      app.post("/resource", (c) => c.json({ id: "2" }));
      app.put("/resource", (c) => c.json({ id: "3" }));
      app.delete("/resource", (c) => c.json({ success: true }));
      app.patch("/resource", (c) => c.json({ id: "4" }));

      await app.request("/resource", { method: "GET" });
      await app.request("/resource", { method: "POST" });
      await app.request("/resource", { method: "PUT" });
      await app.request("/resource", { method: "DELETE" });
      await app.request("/resource", { method: "PATCH" });

      const metrics = getPerformanceMetrics();
      expect(metrics.summary).toHaveLength(5);

      const methods = metrics.summary.map((s) => s.endpoint.split(" ")[0]);
      expect(methods).toContain("GET");
      expect(methods).toContain("POST");
      expect(methods).toContain("PUT");
      expect(methods).toContain("DELETE");
      expect(methods).toContain("PATCH");
    });

    it("should handle routes with path parameters", async () => {
      app.get("/users/:id", (c) => c.json({ id: c.req.param("id") }));

      await app.request("/users/123");
      await app.request("/users/456");

      const metrics = getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(2);
      // Path params are preserved in the actual path
      expect(metrics.recentMetrics[0].path).toBe("/users/456");
      expect(metrics.recentMetrics[1].path).toBe("/users/123");
    });

    it("should handle very fast requests", async () => {
      app.get("/instant", (c) => c.json({ fast: true }));

      await app.request("/instant");

      const metrics = getPerformanceMetrics();
      expect(metrics.recentMetrics[0].duration).toBeGreaterThanOrEqual(0);
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it("should preserve response body and status", async () => {
      app.get("/test", (c) => c.json({ message: "hello world" }, 201));

      const res = await app.request("/test");
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual({ message: "hello world" });
      expect(res.headers.get("X-Response-Time")).toBeDefined();
    });
  });
});
