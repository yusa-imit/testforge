/**
 * TestForge Error Handling System
 *
 * Based on PRD Section 8.5
 */

/**
 * Base TestForge Error Class
 *
 * All custom errors extend this class.
 */
export class TestForgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "TestForgeError";
    Object.setPrototypeOf(this, TestForgeError.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }

  getStatusCode(): number {
    return 500;
  }
}

/**
 * Element Not Found Error
 *
 * Thrown when an element cannot be located using any strategy.
 */
export class ElementNotFoundError extends TestForgeError {
  constructor(locator: { displayName: string; strategies?: any[] }) {
    super(
      `Element not found: ${locator.displayName}`,
      "ELEMENT_NOT_FOUND",
      { locator }
    );
    this.name = "ElementNotFoundError";
    Object.setPrototypeOf(this, ElementNotFoundError.prototype);
  }

  getStatusCode(): number {
    return 404;
  }
}

/**
 * Healing Failed Error
 *
 * Thrown when all healing strategies fail.
 */
export class HealingFailedError extends TestForgeError {
  constructor(
    locator: { displayName: string },
    attemptedStrategies: any[]
  ) {
    super(
      `All healing strategies failed for: ${locator.displayName}`,
      "HEALING_FAILED",
      { locator, attemptedStrategies }
    );
    this.name = "HealingFailedError";
    Object.setPrototypeOf(this, HealingFailedError.prototype);
  }

  getStatusCode(): number {
    return 422;
  }
}

/**
 * Resource Not Found Error
 *
 * Generic error for missing resources (Service, Feature, Scenario, etc.)
 */
export class NotFoundError extends TestForgeError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    super(message, "NOT_FOUND", { resource, id });
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  getStatusCode(): number {
    return 404;
  }
}

/**
 * Validation Error
 *
 * Thrown when input validation fails.
 */
export class ValidationError extends TestForgeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  getStatusCode(): number {
    return 400;
  }
}

/**
 * Bad Request Error
 *
 * Generic error for malformed requests.
 */
export class BadRequestError extends TestForgeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "BAD_REQUEST", details);
    this.name = "BadRequestError";
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  getStatusCode(): number {
    return 400;
  }
}

/**
 * Conflict Error
 *
 * Thrown when a resource already exists or there's a state conflict.
 */
export class ConflictError extends TestForgeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "CONFLICT", details);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }

  getStatusCode(): number {
    return 409;
  }
}

/**
 * Execution Error
 *
 * Thrown when test execution fails.
 */
export class ExecutionError extends TestForgeError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "EXECUTION_ERROR", details);
    this.name = "ExecutionError";
    Object.setPrototypeOf(this, ExecutionError.prototype);
  }

  getStatusCode(): number {
    return 500;
  }
}

/**
 * Internal Server Error
 *
 * Generic error for unexpected server errors.
 */
export class InternalServerError extends TestForgeError {
  constructor(message: string = "Internal server error", details?: Record<string, any>) {
    super(message, "INTERNAL_ERROR", details);
    this.name = "InternalServerError";
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }

  getStatusCode(): number {
    return 500;
  }
}

/**
 * Error Factory Functions
 *
 * Convenience functions for creating common errors.
 */

export const notFound = (resource: string, id?: string) =>
  new NotFoundError(resource, id);

export const badRequest = (message: string, details?: Record<string, any>) =>
  new BadRequestError(message, details);

export const conflict = (message: string, details?: Record<string, any>) =>
  new ConflictError(message, details);

export const validationError = (message: string, details?: Record<string, any>) =>
  new ValidationError(message, details);

export const executionError = (message: string, details?: Record<string, any>) =>
  new ExecutionError(message, details);

export const internalError = (message?: string, details?: Record<string, any>) =>
  new InternalServerError(message, details);
