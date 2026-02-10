import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { errorHandler } from "./middleware/errorHandler";
import services from "./routes/services";
import features from "./routes/features";
import scenarios from "./routes/scenarios";
import components from "./routes/components";
import runs from "./routes/runs";
import healing from "./routes/healing";

const app = new Hono()
  .use("*", logger())
  .use("*", cors())
  .onError(errorHandler)
  .get("/", (c) => c.json({ message: "TestForge API", version: "0.1.0" }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/api/services", services)
  .route("/api/features", features)
  .route("/api/scenarios", scenarios)
  .route("/api/components", components)
  .route("/api/runs", runs)
  .route("/api/healing", healing);

export type AppType = typeof app;
export default app;

const port = process.env.PORT ?? 3001;

console.log(`🚀 TestForge API running at http://localhost:${port}`);

export { app };

// Bun serve
Bun.serve({
  port: Number(port),
  fetch: app.fetch,
});
