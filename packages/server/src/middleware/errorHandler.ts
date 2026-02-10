import { Context, Next, ErrorHandler as HonoErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { TestForgeError } from "../utils/errors";
import { ZodError } from "zod";

/**
 * Global Error Handler
 *
 * Catches all errors and converts them to standardized JSON responses.
 * Based on PRD Section 8.5.
 */
export const errorHandler: HonoErrorHandler = (err, c) => {
    // Handle TestForge custom errors
    if (err instanceof TestForgeError) {
      const statusCode = err.getStatusCode() as any;
      return c.json(err.toJSON(), statusCode);
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: {
              issues: err.errors.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
                code: issue.code,
              })),
            },
          },
        },
        400
      );
    }

    // Handle Hono HTTP exceptions
    if (err instanceof HTTPException) {
      return c.json(
        {
          error: {
            code: "HTTP_ERROR",
            message: err.message,
          },
        },
        err.status
      );
    }

    // Handle generic errors
    if (err instanceof Error) {
      console.error("Unhandled error:", err);
      return c.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: process.env.NODE_ENV === "production"
              ? "Internal server error"
              : err.message,
            details:
              process.env.NODE_ENV === "production"
                ? undefined
                : { stack: err.stack },
          },
        },
        500
      );
    }

    // Fallback for unknown errors
    console.error("Unknown error type:", err);
    return c.json(
      {
        error: {
          code: "UNKNOWN_ERROR",
          message: "An unknown error occurred",
        },
      },
      500
    );
  }
