import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { errorHandler } from "./middleware/errorHandler";
import { timing } from "./middleware/timing";
import { logger } from "./utils/logger";
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
  .route("/api/backup", backup);

export type AppType = typeof app;
export default app;

export { app };

// Only start server if this is the main module (not imported in tests)
if (import.meta.main) {
  const port = process.env.PORT ?? 3001;
  logger.info(`TestForge API running at http://localhost:${port}`);

  Bun.serve({
    port: Number(port),
    fetch: app.fetch,
  });
}
