import { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger";

/**
 * Request Timing Middleware
 *
 * Adds X-Response-Time header and logs slow requests for performance monitoring.
 * Helps identify bottlenecks during QA and production.
 */

interface PerformanceMetrics {
  path: string;
  method: string;
  duration: number;
  timestamp: Date;
  statusCode?: number;
}

// In-memory storage for recent metrics (last 100 requests)
const recentMetrics: PerformanceMetrics[] = [];
const MAX_METRICS = 100;
const SLOW_REQUEST_THRESHOLD_MS = 1000; // Log requests slower than 1s

/**
 * Timing middleware that measures request duration
 */
export const timing: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const path = c.req.path;
  const method = c.req.method;

  // Execute the request
  await next();

  const duration = Date.now() - start;
  const statusCode = c.res.status;

  // Add response time header (need to create new headers object to modify)
  const headers = new Headers(c.res.headers);
  headers.set("X-Response-Time", `${duration}ms`);

  // Create new response with updated headers
  const newResponse = new Response(c.res.body, {
    status: c.res.status,
    statusText: c.res.statusText,
    headers,
  });

  // Replace the response
  c.res = newResponse;

  // Store metrics
  const metric: PerformanceMetrics = {
    path,
    method,
    duration,
    timestamp: new Date(),
    statusCode,
  };

  recentMetrics.push(metric);
  if (recentMetrics.length > MAX_METRICS) {
    recentMetrics.shift(); // Remove oldest
  }

  // Log slow requests
  if (duration > SLOW_REQUEST_THRESHOLD_MS) {
    logger.warn("Slow request detected", {
      method,
      path,
      duration,
      statusCode,
    });
  }
};

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  if (recentMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageDuration: 0,
      slowRequests: 0,
      slowRequestThreshold: SLOW_REQUEST_THRESHOLD_MS,
      summary: [],
      recentMetrics: [],
    };
  }

  const durations = recentMetrics.map((m) => m.duration);
  const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const slowCount = recentMetrics.filter(
    (m) => m.duration > SLOW_REQUEST_THRESHOLD_MS
  ).length;

  // Group by path for summary
  const pathSummary = recentMetrics.reduce(
    (acc, metric) => {
      const key = `${metric.method} ${metric.path}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
        };
      }
      acc[key].count++;
      acc[key].totalDuration += metric.duration;
      acc[key].minDuration = Math.min(acc[key].minDuration, metric.duration);
      acc[key].maxDuration = Math.max(acc[key].maxDuration, metric.duration);
      return acc;
    },
    {} as Record<
      string,
      { count: number; totalDuration: number; minDuration: number; maxDuration: number }
    >
  );

  const summary = Object.entries(pathSummary).map(([endpoint, stats]) => ({
    endpoint,
    count: stats.count,
    avgDuration: Math.round(stats.totalDuration / stats.count),
    minDuration: stats.minDuration,
    maxDuration: stats.maxDuration,
  }));

  // Sort by average duration (slowest first)
  summary.sort((a, b) => b.avgDuration - a.avgDuration);

  return {
    totalRequests: recentMetrics.length,
    averageDuration: Math.round(average),
    slowRequests: slowCount,
    slowRequestThreshold: SLOW_REQUEST_THRESHOLD_MS,
    summary,
    recentMetrics: recentMetrics.slice(-20).reverse(), // Last 20 requests, newest first
  };
}

/**
 * Clear performance metrics (useful for testing)
 */
export function clearPerformanceMetrics() {
  recentMetrics.length = 0;
}
