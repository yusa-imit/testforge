import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { existsSync } from "fs";
import { resolve, basename } from "path";
import { notFound } from "../utils/errors";

const app = new Hono();

// Get the screenshots directory path (relative to project root)
const SCREENSHOTS_DIR = resolve(process.cwd(), "screenshots");

/**
 * GET /api/screenshots/:filename - Serve screenshot files
 *
 * Security:
 * - Only serves files from the screenshots directory
 * - Validates filename to prevent path traversal
 * - Returns 404 for non-existent files
 */
app.get("/:filename", async (c) => {
  const filename = c.req.param("filename");

  // Security: Validate filename (no path traversal)
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw notFound("Screenshot", filename);
  }

  // Construct full path
  const filePath = resolve(SCREENSHOTS_DIR, filename);

  // Security: Ensure the resolved path is still within screenshots directory
  if (!filePath.startsWith(SCREENSHOTS_DIR)) {
    throw notFound("Screenshot", filename);
  }

  // Check if file exists
  if (!existsSync(filePath)) {
    throw notFound("Screenshot", filename);
  }

  // Serve the file
  const file = Bun.file(filePath);

  // Set appropriate content type
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType = ext === "png" ? "image/png"
    : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp"
    : "application/octet-stream";

  return new Response(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year (immutable files)
    },
  });
});

export type ScreenshotsRoute = typeof app;
export default app;
