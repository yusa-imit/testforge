import { Hono } from "hono";
import { getPerformanceMetrics } from "../middleware/timing";

/**
 * Performance Metrics API
 *
 * Provides insights into request performance for monitoring and debugging.
 */
const app = new Hono();

/**
 * GET /api/metrics
 *
 * Returns performance metrics summary including:
 * - Total requests tracked
 * - Average response time
 * - Slow requests count
 * - Per-endpoint statistics (avg, min, max duration)
 * - Recent 20 requests
 */
app.get("/", (c) => {
  const metrics = getPerformanceMetrics();
  return c.json(metrics);
});

/**
 * GET /api/metrics/health
 *
 * Simple health check endpoint (always returns 200 OK)
 */
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default app;
