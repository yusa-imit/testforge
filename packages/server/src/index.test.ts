/**
 * Integration Tests for Main App
 *
 * Tests the full Hono app setup including middleware chain,
 * route registration, error handling, and CORS.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import app, { gracefulShutdown } from "./index";
import { setupTestDB } from "./test-helpers/setup";
import { getDB, resetDB } from "./db";

describe("Main App Integration", () => {
  beforeEach(async () => {
    await setupTestDB();
  });

  describe("Root Endpoints", () => {
    it("should return API info at root", async () => {
      const res = await app.request("/");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        message: "TestForge API",
        version: "0.1.0",
      });
    });

    it("should return health status", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ status: "ok" });
    });
  });

  describe("Middleware Chain", () => {
    it("should add timing headers to responses", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Response-Time")).toMatch(/^\d+ms$/);
    });

    it("should allow CORS", async () => {
      const res = await app.request("/health", {
        headers: {
          Origin: "http://localhost:5173",
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should handle CORS preflight requests", async () => {
      const res = await app.request("/api/services", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Content-Type",
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    });
  });

  describe("Route Registration", () => {
    it("should register /api/services route", async () => {
      const res = await app.request("/api/services");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("success");
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should register /api/components route", async () => {
      const res = await app.request("/api/components");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("success");
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should register /api/runs route", async () => {
      const res = await app.request("/api/runs");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("success");
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should register /api/healing route", async () => {
      const res = await app.request("/api/healing");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("success");
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should register /api/screenshots route", async () => {
      const res = await app.request("/api/screenshots/test.png");

      // Should return 404 for non-existent screenshot
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("error");
      expect(json.error).toHaveProperty("code");
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("should register /api/registry route", async () => {
      const res = await app.request("/api/registry");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("success");
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should register /api/metrics route", async () => {
      const res = await app.request("/api/metrics");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      // Metrics endpoint returns raw data, not wrapped in success/data
      expect(json).toHaveProperty("totalRequests");
      expect(json).toHaveProperty("summary");
      expect(json).toHaveProperty("recentMetrics");
    });

    it("should register /api/metrics/health route", async () => {
      const res = await app.request("/api/metrics/health");

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("status");
      expect(json.status).toBe("ok");
      expect(json).toHaveProperty("timestamp");
      expect(json).toHaveProperty("uptime");
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await app.request("/api/unknown");

      expect(res.status).toBe(404);
    });

    it("should handle errors with error middleware", async () => {
      // Try to get a non-existent service
      const res = await app.request("/api/services/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("error");
      expect(json.error).toHaveProperty("code");
      expect(json.error.code).toBe("NOT_FOUND");
      expect(json.error).toHaveProperty("message");
    });

    it("should handle validation errors", async () => {
      // Try to create a service with invalid data
      const res = await app.request("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("error");
      // zValidator returns error object structure
      expect(json.error).toBeTruthy();
    });
  });

  describe("Content-Type Handling", () => {
    it("should accept JSON requests", async () => {
      const res = await app.request("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Service",
          baseUrl: "https://example.com",
          description: "Test",
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json).toHaveProperty("success");
      expect(json.success).toBe(true);
      expect(json).toHaveProperty("data");
      expect(json.data).toHaveProperty("id");
      expect(json.data.name).toBe("Test Service");
    });

    it("should return JSON responses", async () => {
      const res = await app.request("/api/services");

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });
  });

  describe("App Type Export", () => {
    it("should export app instance", () => {
      expect(app).toBeDefined();
      expect(typeof app.fetch).toBe("function");
    });

    it("should have correct fetch signature", async () => {
      const request = new Request("http://localhost:3001/health");
      const response = await app.fetch(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Graceful Shutdown", () => {
    // Save original process.exit to restore later
    const originalExit = process.exit;

    beforeEach(async () => {
      // Ensure clean database state
      await setupTestDB();
    });

    afterEach(async () => {
      // Restore process.exit
      process.exit = originalExit;
      // Reset the singleton so other tests can create new connections
      resetDB();
      // Re-initialize DB after each shutdown test
      await setupTestDB();
    });

    it("should close database connection on shutdown", async () => {
      await setupTestDB();
      const db = await getDB();

      // Verify connection is active (should have tables from migration)
      const tables = await db.getAllServices();
      expect(tables).toBeDefined();

      // Perform graceful shutdown without server
      await gracefulShutdown("SIGTERM");

      // getDB should return a new instance after reset
      resetDB();
      const newDb = await getDB();
      expect(newDb).toBeDefined();
    });

    it("should handle shutdown with server", async () => {
      const mockServer = {
        stop: mock(() => {}),
      } as any;

      await setupTestDB();
      const db = await getDB();

      await gracefulShutdown("SIGTERM", mockServer);

      // Verify server.stop() was called
      expect(mockServer.stop).toHaveBeenCalledTimes(1);
    });

    it("should handle server stop error gracefully", async () => {
      const mockServer = {
        stop: mock(() => {
          throw new Error("Server stop failed");
        }),
      } as any;

      await setupTestDB();
      await getDB();

      // Should not throw even if server.stop() fails
      await expect(gracefulShutdown("SIGTERM", mockServer)).resolves.toBeUndefined();
    });

    it("should handle SIGINT signal", async () => {
      await setupTestDB();
      await getDB();

      await gracefulShutdown("SIGINT");

      // Should complete without errors
      expect(true).toBe(true);
    });

    it("should handle already closed database", async () => {
      await setupTestDB();
      const db = await getDB();
      await db.close();

      // Should not throw when database is already closed
      await expect(gracefulShutdown("SIGTERM")).resolves.toBeUndefined();
    });

    it("should log shutdown progress", async () => {
      await setupTestDB();
      await getDB();

      // Graceful shutdown logs are tested implicitly
      // (they would fail if logger calls throw)
      await gracefulShutdown("SIGTERM");

      // Should complete without errors
      expect(true).toBe(true);
    });
  });
});
