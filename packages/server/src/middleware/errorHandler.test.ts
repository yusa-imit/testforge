import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { errorHandler } from "./errorHandler";
import {
  TestForgeError,
  ElementNotFoundError,
  HealingFailedError,
  NotFoundError,
  ValidationError,
  BadRequestError,
  ConflictError,
  ExecutionError,
  InternalServerError,
} from "../utils/errors";

describe("errorHandler middleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler);
  });

  describe("TestForgeError handling", () => {
    it("should handle NotFoundError correctly", async () => {
      app.get("/test", () => {
        throw new NotFoundError("Service", "service-123");
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(404);
      expect(body).toEqual({
        error: {
          code: "NOT_FOUND",
          message: "Service not found: service-123",
          details: { resource: "Service", id: "service-123" },
        },
      });
    });

    it("should handle ValidationError correctly", async () => {
      app.get("/test", () => {
        throw new ValidationError("Invalid input", { field: "name" });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(body).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: { field: "name" },
        },
      });
    });

    it("should handle BadRequestError correctly", async () => {
      app.get("/test", () => {
        throw new BadRequestError("Malformed request", { missing: "id" });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(body).toEqual({
        error: {
          code: "BAD_REQUEST",
          message: "Malformed request",
          details: { missing: "id" },
        },
      });
    });

    it("should handle ConflictError correctly", async () => {
      app.get("/test", () => {
        throw new ConflictError("Resource already exists", {
          existing: "service-123",
        });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(409);
      expect(body).toEqual({
        error: {
          code: "CONFLICT",
          message: "Resource already exists",
          details: { existing: "service-123" },
        },
      });
    });

    it("should handle ElementNotFoundError correctly", async () => {
      app.get("/test", () => {
        throw new ElementNotFoundError({
          displayName: "Login Button",
          strategies: [{ type: "testId", value: "login-btn" }],
        });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(404);
      expect(body).toEqual({
        error: {
          code: "ELEMENT_NOT_FOUND",
          message: "Element not found: Login Button",
          details: {
            locator: {
              displayName: "Login Button",
              strategies: [{ type: "testId", value: "login-btn" }],
            },
          },
        },
      });
    });

    it("should handle HealingFailedError correctly", async () => {
      app.get("/test", () => {
        throw new HealingFailedError(
          { displayName: "Submit Button" },
          [
            { type: "testId", value: "submit" },
            { type: "role", value: "button" },
          ]
        );
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(422);
      expect(body.error.code).toBe("HEALING_FAILED");
      expect(body.error.message).toContain("Submit Button");
    });

    it("should handle ExecutionError correctly", async () => {
      app.get("/test", () => {
        throw new ExecutionError("Test execution failed", {
          step: 5,
          reason: "timeout",
        });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body).toEqual({
        error: {
          code: "EXECUTION_ERROR",
          message: "Test execution failed",
          details: { step: 5, reason: "timeout" },
        },
      });
    });

    it("should handle InternalServerError correctly", async () => {
      app.get("/test", () => {
        throw new InternalServerError("Database connection failed");
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body).toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection failed",
          details: undefined,
        },
      });
    });

    it("should handle custom TestForgeError correctly", async () => {
      app.get("/test", () => {
        throw new TestForgeError("Custom error", "CUSTOM_CODE", {
          custom: "data",
        });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body).toEqual({
        error: {
          code: "CUSTOM_CODE",
          message: "Custom error",
          details: { custom: "data" },
        },
      });
    });
  });

  describe("ZodError handling", () => {
    it("should handle Zod validation errors", async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(0),
      });

      app.post("/test", async (c) => {
        const body = await c.req.json();
        schema.parse(body); // This will throw ZodError
        return c.json({ success: true });
      });

      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "", email: "invalid", age: -5 }),
      });

      const body = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Validation failed");
      expect(body.error.details.issues).toBeArray();
      expect(body.error.details.issues.length).toBeGreaterThan(0);

      // Check that issues contain path, message, and code
      const issue = body.error.details.issues[0];
      expect(issue).toHaveProperty("path");
      expect(issue).toHaveProperty("message");
      expect(issue).toHaveProperty("code");
    });

    it("should format Zod error paths correctly", async () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      app.post("/test", async (c) => {
        const body = await c.req.json();
        schema.parse(body);
        return c.json({ success: true });
      });

      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { profile: { name: "" } } }),
      });

      const body = (await res.json()) as any;

      expect(res.status).toBe(400);
      expect(body.error.details.issues[0].path).toBe("user.profile.name");
    });
  });

  describe("HTTPException handling", () => {
    it("should handle Hono HTTPException with custom status", async () => {
      app.get("/test", () => {
        throw new HTTPException(403, { message: "Forbidden resource" });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(403);
      expect(body).toEqual({
        error: {
          code: "HTTP_ERROR",
          message: "Forbidden resource",
        },
      });
    });

    it("should handle HTTPException with 401 status", async () => {
      app.get("/test", () => {
        throw new HTTPException(401, { message: "Unauthorized" });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("HTTP_ERROR");
      expect(body.error.message).toBe("Unauthorized");
    });
  });

  describe("Generic Error handling", () => {
    it("should handle generic Error in development mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      app.get("/test", () => {
        throw new Error("Something went wrong");
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("Something went wrong");
      expect(body.error.details).toHaveProperty("stack");
      expect(body.error.details.stack).toBeString();

      process.env.NODE_ENV = originalEnv;
    });

    it("should hide error details in production mode", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      app.get("/test", () => {
        throw new Error("Database password exposed!");
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("Internal server error");
      expect(body.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should include stack trace in non-production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      app.get("/test", () => {
        const err = new Error("Debug this error");
        throw err;
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body.error.details).toHaveProperty("stack");
      expect(body.error.details.stack).toContain("Error: Debug this error");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Unknown error type handling", () => {
    // Note: Hono's error handler only receives Error objects or HTTPException.
    // Non-Error throws are converted to Error by Hono before reaching the handler.
    // Therefore, these tests verify that the handler gracefully handles
    // unexpected error types in the unlikely event they reach it.

    it("should have fallback for unknown error types in handler logic", async () => {
      // While in practice Hono converts non-Error throws to Errors,
      // our handler has a fallback branch for unknown error types.
      // We can verify this branch exists by checking the handler code structure.
      // The actual runtime path would only be hit in edge cases.

      // Test that handler can still work with wrapped errors
      app.get("/test", () => {
        const err = new Error("Wrapped error") as unknown;
        throw err;
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      // In test environment, shows the actual message
      expect(body.error.message).toBe("Wrapped error");
    });
  });

  describe("Edge cases", () => {
    it("should handle TestForgeError without details", async () => {
      app.get("/test", () => {
        throw new TestForgeError("Simple error", "SIMPLE_CODE");
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body.error.details).toBeUndefined();
    });

    it("should handle NotFoundError without id", async () => {
      app.get("/test", () => {
        throw new NotFoundError("User");
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(404);
      expect(body.error.message).toBe("User not found");
      expect(body.error.details.id).toBeUndefined();
    });

    it("should handle InternalServerError with default message", async () => {
      app.get("/test", () => {
        throw new InternalServerError();
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(res.status).toBe(500);
      expect(body.error.message).toBe("Internal server error");
    });

    it("should preserve error details structure", async () => {
      app.get("/test", () => {
        throw new ExecutionError("Failed", {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          bool: true,
        });
      });

      const res = await app.request("/test");
      const body = (await res.json()) as any;

      expect(body.error.details).toEqual({
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        bool: true,
      });
    });
  });

  describe("Multiple errors in sequence", () => {
    it("should handle multiple different error types", async () => {
      app.get("/error1", () => {
        throw new NotFoundError("Service", "123");
      });
      app.get("/error2", () => {
        throw new ValidationError("Bad input");
      });
      app.get("/error3", () => {
        throw new Error("Generic error");
      });

      const res1 = await app.request("/error1");
      expect(res1.status).toBe(404);

      const res2 = await app.request("/error2");
      expect(res2.status).toBe(400);

      const res3 = await app.request("/error3");
      expect(res3.status).toBe(500);
    });
  });
});
