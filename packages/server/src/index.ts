import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { errorHandler } from "./middleware/errorHandler";
import { timing } from "./middleware/timing";
import { logger } from "./utils/logger";
import { getDB } from "./db";
import { startScheduler, stopScheduler } from "./execution/scheduler";
import services from "./routes/services";
import features from "./routes/features";
import scenarios from "./routes/scenarios";
import components from "./routes/components";
import runs from "./routes/runs";
import healing from "./routes/healing";
import screenshots from "./routes/screenshots";
import registry from "./routes/registry";
import metrics from "./routes/metrics";
import backup from "./routes/backup";
import search from "./routes/search";
import webhooks from "./routes/webhooks";
import schedules from "./routes/schedules";
import environments from "./routes/environments";
import tags from "./routes/tags";

const app = new Hono()
  .use("*", honoLogger())
  .use("*", timing)
  .use("*", cors())
  .onError(errorHandler)
  .get("/", (c) => c.json({ message: "TestForge API", version: "0.1.0" }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/api/services", services)
  .route("/api/features", features)
  .route("/api/scenarios", scenarios)
  .route("/api/components", components)
  .route("/api/runs", runs)
  .route("/api/healing", healing)
  .route("/api/screenshots", screenshots)
  .route("/api/registry", registry)
  .route("/api/metrics", metrics)
  .route("/api/backup", backup)
  .route("/api/search", search)
  .route("/api/webhooks", webhooks)
  .route("/api/schedules", schedules)
  .route("/api/environments", environments)
  .route("/api/tags", tags);

export type AppType = typeof app;
export default app;

export { app };

/**
 * Graceful shutdown handler
 *
 * Handles SIGTERM and SIGINT signals to:
 * 1. Stop accepting new connections
 * 2. Wait for in-flight requests to complete
 * 3. Close database connections
 * 4. Exit cleanly
 */
export async function gracefulShutdown(signal: string, server?: ReturnType<typeof Bun.serve>): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop background scheduler
  stopScheduler();

  // Stop accepting new connections
  if (server) {
    try {
      server.stop();
      logger.info("Server stopped accepting new connections");
    } catch (error) {
      logger.error("Error stopping server", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Close database connection
  try {
    const db = await getDB();
    await db.close();
    logger.info("Database connection closed successfully");
  } catch (error) {
    logger.error("Error closing database", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info("Graceful shutdown complete");

  // In test environment, don't actually exit
  if (process.env.NODE_ENV !== "test") {
    process.exit(0);
  }
}

// Only start server if this is the main module (not imported in tests)
if (import.meta.main) {
  const port = process.env.PORT ?? 3001;
  logger.info(`TestForge API running at http://localhost:${port}`);

  const server = Bun.serve({
    port: Number(port),
    fetch: app.fetch,
  });

  // Register shutdown handlers
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server));
  process.on("SIGINT", () => gracefulShutdown("SIGINT", server));

  // Start background scheduler for automated test runs
  startScheduler();

  // Log successful startup
  logger.info("Server started successfully", {
    port: Number(port),
    environment: process.env.NODE_ENV || "development",
  });
}
