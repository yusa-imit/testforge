/**
 * Screenshots API Integration Tests
 *
 * Tests the /api/screenshots routes including security validation
 * (path traversal prevention) and file serving behavior.
 *
 * Note: These tests verify route behavior without actual files on disk,
 * focusing on input validation and 404 handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import app from "../index";
import { setupTestDB } from "../test-helpers/setup";

let teardown: () => void;

beforeEach(async () => {
  ({ teardown } = await setupTestDB());
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  teardown();
});

async function req(filename: string): Promise<Response> {
  return app.request(`http://localhost/api/screenshots/${filename}`, {
    method: "GET",
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Security: Path traversal prevention
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/screenshots/:filename — security", () => {
  it("rejects filename with .. via URL normalization (path traversal)", async () => {
    // URL normalization converts /api/screenshots/../etc/passwd → /api/etc/passwd
    // which Hono returns as 404 (not matching any route). Either way, access is blocked.
    const res = await req("../etc/passwd");
    expect(res.status).toBe(404);
    // Note: Hono's default 404 does not return JSON; the file is still not served
  });

  it("rejects multi-segment filename (forward slash) — not served", async () => {
    const res = await req("subdir/secret.png");
    // The /:filename route only captures a single path segment
    // A multi-segment path is routed to a different non-existent endpoint
    expect(res.status).toBe(404);
  });

  it("rejects filename with encoded backslash (path traversal attempt)", async () => {
    // %5C is backslash — the route checks filename.includes("\\") after decoding
    const res = await app.request(
      "http://localhost/api/screenshots/..%5Cetc%5Cpasswd",
      { method: "GET" }
    );
    expect(res.status).toBe(404);
  });

  it("rejects filename with double-dot encoded as %2E%2E", async () => {
    // %2E%2E decodes to .. — path traversal via encoded dots
    const res = await app.request(
      "http://localhost/api/screenshots/%2E%2Eetc%2Fpasswd",
      { method: "GET" }
    );
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 404 for non-existent files
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/screenshots/:filename — missing files", () => {
  it("returns 404 for non-existent png file", async () => {
    const res = await req("nonexistent-screenshot-12345.png");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for non-existent jpg file", async () => {
    const res = await req("missing-image.jpg");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for non-existent webp file", async () => {
    const res = await req("missing-image.webp");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for file with unknown extension", async () => {
    const res = await req("unknown-file.xyz");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for filename with only extension", async () => {
    const res = await req(".png");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Serve actual screenshot (integration: create a temp file and serve it)
// ──────────────────────────────────────────────────────────────────────────────

describe("GET /api/screenshots/:filename — file serving", () => {
  it("serves a png file with correct content-type when it exists", async () => {
    const { writeFileSync, mkdirSync, existsSync, unlinkSync } = await import("fs");
    const { resolve } = await import("path");

    const screenshotsDir = resolve(process.cwd(), "screenshots");
    const testFilename = "test-screenshot-fixture-99999.png";
    const testFilePath = resolve(screenshotsDir, testFilename);

    // Create screenshots dir if it doesn't exist
    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }

    // Write a minimal PNG-like file (1x1 pixel PNG header bytes)
    const minimalPng = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
      "hex"
    );
    writeFileSync(testFilePath, minimalPng);

    try {
      const res = await req(testFilename);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("cache-control")).toContain("max-age=31536000");
    } finally {
      // Cleanup temp file
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
      }
    }
  });

  it("serves a jpg file with correct content-type when it exists", async () => {
    const { writeFileSync, mkdirSync, existsSync, unlinkSync } = await import("fs");
    const { resolve } = await import("path");

    const screenshotsDir = resolve(process.cwd(), "screenshots");
    const testFilename = "test-screenshot-fixture-99998.jpg";
    const testFilePath = resolve(screenshotsDir, testFilename);

    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }

    // Minimal JPEG header
    writeFileSync(testFilePath, Buffer.from("ffd8ffe000104a464946", "hex"));

    try {
      const res = await req(testFilename);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/jpeg");
    } finally {
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
      }
    }
  });

  it("serves a webp file with correct content-type when it exists", async () => {
    const { writeFileSync, mkdirSync, existsSync, unlinkSync } = await import("fs");
    const { resolve } = await import("path");

    const screenshotsDir = resolve(process.cwd(), "screenshots");
    const testFilename = "test-screenshot-fixture-99997.webp";
    const testFilePath = resolve(screenshotsDir, testFilename);

    if (!existsSync(screenshotsDir)) {
      mkdirSync(screenshotsDir, { recursive: true });
    }

    // Minimal RIFF/WEBP header
    writeFileSync(testFilePath, Buffer.from("52494646000000005745425056503800", "hex"));

    try {
      const res = await req(testFilename);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/webp");
    } finally {
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
      }
    }
  });
});
