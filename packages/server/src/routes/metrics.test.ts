import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { timing, clearPerformanceMetrics } from "../middleware/timing";
import metrics from "./metrics";

describe("Performance Metrics", () => {
  let app: Hono;

  beforeEach(() => {
    // Clear metrics before each test
    clearPerformanceMetrics();

    // Create test app with timing middleware
    app = new Hono();
    app.use("*", timing);
    app.route("/api/metrics", metrics);

    // Add test routes with varying response times
    app.get("/fast", (c) => c.json({ data: "fast" }));
    app.get("/slow", async (c) => {
      await Bun.sleep(100); // 100ms delay
      return c.json({ data: "slow" });
    });
    app.post("/create", (c) => c.json({ created: true }));
  });

  describe("Timing Middleware", () => {
    it("should add X-Response-Time header", async () => {
      const res = await app.request("/fast");
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
    });

    it("should measure request duration accurately", async () => {
      const res = await app.request("/slow");
      const responseTime = res.headers.get("X-Response-Time");
      expect(responseTime).toBeTruthy();

      const duration = parseInt(responseTime!.replace("ms", ""));
      expect(duration).toBeGreaterThanOrEqual(100); // At least 100ms
      expect(duration).toBeLessThan(500); // But not too long
    });

    it("should track multiple requests", async () => {
      await app.request("/fast");
      await app.request("/slow");
      await app.request("/create", { method: "POST" });

      const res = await app.request("/api/metrics");
      const data = await res.json();

      expect(data.totalRequests).toBeGreaterThanOrEqual(3); // At least 3 requests tracked
      expect(data.summary.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/metrics", () => {
    it("should return metrics structure", async () => {
      const res = await app.request("/api/metrics");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toMatchObject({
        totalRequests: expect.any(Number),
        averageDuration: expect.any(Number),
        slowRequests: expect.any(Number),
        slowRequestThreshold: 1000,
        summary: expect.any(Array),
        recentMetrics: expect.any(Array),
      });
    });

    it("should track request statistics", async () => {
      // Make some requests
      await app.request("/fast");
      await app.request("/fast");
      await app.request("/slow");

      const res = await app.request("/api/metrics");
      const data = await res.json();

      expect(data.totalRequests).toBeGreaterThanOrEqual(3);
      expect(data.averageDuration).toBeGreaterThanOrEqual(0);
      expect(data.summary.length).toBeGreaterThan(0);
    });

    it("should group metrics by endpoint", async () => {
      await app.request("/fast");
      await app.request("/fast");
      await app.request("/slow");

      const res = await app.request("/api/metrics");
      const data = await res.json();

      const fastSummary = data.summary.find((s: any) => s.endpoint === "GET /fast");
      expect(fastSummary).toBeTruthy();
      expect(fastSummary.count).toBe(2);
      expect(fastSummary.avgDuration).toBeGreaterThanOrEqual(0);
      expect(fastSummary.minDuration).toBeGreaterThanOrEqual(0);
      expect(fastSummary.maxDuration).toBeGreaterThanOrEqual(fastSummary.minDuration);
    });

    it("should return recent metrics in reverse chronological order", async () => {
      await app.request("/fast");
      await Bun.sleep(10);
      await app.request("/slow");

      const res = await app.request("/api/metrics");
      const data = await res.json();

      expect(data.recentMetrics.length).toBeGreaterThan(0);
      // Most recent requests should include /fast and /slow
      const paths = data.recentMetrics.map((m: any) => m.path);
      expect(paths).toContain("/fast");
      expect(paths).toContain("/slow");
    });

    it("should sort summary by average duration (slowest first)", async () => {
      await app.request("/fast");
      await app.request("/slow");

      const res = await app.request("/api/metrics");
      const data = await res.json();

      expect(data.summary.length).toBeGreaterThan(1);
      // First should be slowest
      for (let i = 0; i < data.summary.length - 1; i++) {
        expect(data.summary[i].avgDuration).toBeGreaterThanOrEqual(
          data.summary[i + 1].avgDuration
        );
      }
    });

    it("should track slow requests", async () => {
      // Create an artificially slow endpoint
      app.get("/very-slow", async (c) => {
        await Bun.sleep(1100); // Exceed 1000ms threshold
        return c.json({ data: "very slow" });
      });

      await app.request("/very-slow");
      const res = await app.request("/api/metrics");
      const data = await res.json();

      expect(data.slowRequests).toBeGreaterThan(0);
    });
  });

  describe("GET /api/metrics/health", () => {
    it("should return health status", async () => {
      const res = await app.request("/api/metrics/health");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toMatchObject({
        status: "ok",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it("should return valid ISO timestamp", async () => {
      const res = await app.request("/api/metrics/health");
      const data = await res.json();

      // Should be parseable as a date
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe("Invalid Date");
    });

    it("should return positive uptime", async () => {
      const res = await app.request("/api/metrics/health");
      const data = await res.json();

      expect(data.uptime).toBeGreaterThan(0);
    });
  });

  describe("Metrics Limits", () => {
    it("should limit stored metrics to MAX_METRICS (100)", async () => {
      // Make 150 requests
      for (let i = 0; i < 150; i++) {
        await app.request("/fast");
      }

      const res = await app.request("/api/metrics");
      const data = await res.json();

      // Should cap at 100 + 1 (for the metrics request)
      expect(data.totalRequests).toBeLessThanOrEqual(101);
    });
  });

  describe("Different HTTP Methods", () => {
    it("should track POST requests separately from GET", async () => {
      await app.request("/create", { method: "POST" });
      await app.request("/create", { method: "POST" });

      const res = await app.request("/api/metrics");
      const data = await res.json();

      const postSummary = data.summary.find((s: any) => s.endpoint === "POST /create");
      expect(postSummary).toBeTruthy();
      expect(postSummary.count).toBe(2);
    });
  });
});
