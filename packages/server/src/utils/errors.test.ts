import { describe, it, expect } from "bun:test";
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
  notFound,
  badRequest,
  conflict,
  validationError,
  executionError,
  internalError,
} from "./errors";

describe("Error Classes", () => {
  describe("TestForgeError (Base Class)", () => {
    it("should create error with code and message", () => {
      const error = new TestForgeError("Test error", "TEST_CODE");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.name).toBe("TestForgeError");
      expect(error.details).toBeUndefined();
    });

    it("should include optional details", () => {
      const details = { field: "username", reason: "too short" };
      const error = new TestForgeError("Validation failed", "VALIDATION", details);

      expect(error.details).toEqual(details);
    });

    it("should serialize to JSON correctly", () => {
      const error = new TestForgeError("Test error", "TEST_CODE", { info: "extra" });
      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: "TEST_CODE",
          message: "Test error",
          details: { info: "extra" },
        },
      });
    });

    it("should return default status code 500", () => {
      const error = new TestForgeError("Test error", "TEST_CODE");
      expect(error.getStatusCode()).toBe(500);
    });

    it("should be instanceof Error", () => {
      const error = new TestForgeError("Test error", "TEST_CODE");
      expect(error instanceof Error).toBe(true);
      expect(error instanceof TestForgeError).toBe(true);
    });
  });

  describe("ElementNotFoundError", () => {
    it("should create error with locator info", () => {
      const locator = {
        displayName: "LoginButton",
        strategies: [{ type: "testId", value: "login-btn" }],
      };
      const error = new ElementNotFoundError(locator);

      expect(error.message).toBe("Element not found: LoginButton");
      expect(error.code).toBe("ELEMENT_NOT_FOUND");
      expect(error.name).toBe("ElementNotFoundError");
      expect(error.details).toEqual({ locator });
    });

    it("should return 404 status code", () => {
      const error = new ElementNotFoundError({ displayName: "Button" });
      expect(error.getStatusCode()).toBe(404);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new ElementNotFoundError({ displayName: "Button" });
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof ElementNotFoundError).toBe(true);
    });
  });

  describe("HealingFailedError", () => {
    it("should create error with locator and strategies", () => {
      const locator = { displayName: "SubmitButton" };
      const strategies = [
        { type: "testId", value: "submit" },
        { type: "role", value: "button" },
      ];
      const error = new HealingFailedError(locator, strategies);

      expect(error.message).toBe("All healing strategies failed for: SubmitButton");
      expect(error.code).toBe("HEALING_FAILED");
      expect(error.name).toBe("HealingFailedError");
      expect(error.details).toEqual({ locator, attemptedStrategies: strategies });
    });

    it("should return 422 status code", () => {
      const error = new HealingFailedError({ displayName: "Button" }, []);
      expect(error.getStatusCode()).toBe(422);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new HealingFailedError({ displayName: "Button" }, []);
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof HealingFailedError).toBe(true);
    });
  });

  describe("NotFoundError", () => {
    it("should create error with resource and id", () => {
      const error = new NotFoundError("Service", "svc-123");

      expect(error.message).toBe("Service not found: svc-123");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.name).toBe("NotFoundError");
      expect(error.details).toEqual({ resource: "Service", id: "svc-123" });
    });

    it("should create error without id", () => {
      const error = new NotFoundError("Component");

      expect(error.message).toBe("Component not found");
      expect(error.details).toEqual({ resource: "Component", id: undefined });
    });

    it("should return 404 status code", () => {
      const error = new NotFoundError("Scenario", "scn-456");
      expect(error.getStatusCode()).toBe(404);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new NotFoundError("Feature");
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof NotFoundError).toBe(true);
    });
  });

  describe("ValidationError", () => {
    it("should create error with message and details", () => {
      const details = { field: "email", constraint: "invalid format" };
      const error = new ValidationError("Invalid email format", details);

      expect(error.message).toBe("Invalid email format");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.name).toBe("ValidationError");
      expect(error.details).toEqual(details);
    });

    it("should create error without details", () => {
      const error = new ValidationError("Validation failed");

      expect(error.message).toBe("Validation failed");
      expect(error.details).toBeUndefined();
    });

    it("should return 400 status code", () => {
      const error = new ValidationError("Invalid input");
      expect(error.getStatusCode()).toBe(400);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new ValidationError("Invalid");
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });
  });

  describe("BadRequestError", () => {
    it("should create error with message and details", () => {
      const details = { malformed: "json" };
      const error = new BadRequestError("Malformed request body", details);

      expect(error.message).toBe("Malformed request body");
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.name).toBe("BadRequestError");
      expect(error.details).toEqual(details);
    });

    it("should return 400 status code", () => {
      const error = new BadRequestError("Bad request");
      expect(error.getStatusCode()).toBe(400);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new BadRequestError("Bad request");
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof BadRequestError).toBe(true);
    });
  });

  describe("ConflictError", () => {
    it("should create error with message and details", () => {
      const details = { existing: "svc-123", duplicate: "name" };
      const error = new ConflictError("Service already exists", details);

      expect(error.message).toBe("Service already exists");
      expect(error.code).toBe("CONFLICT");
      expect(error.name).toBe("ConflictError");
      expect(error.details).toEqual(details);
    });

    it("should return 409 status code", () => {
      const error = new ConflictError("Conflict");
      expect(error.getStatusCode()).toBe(409);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new ConflictError("Conflict");
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof ConflictError).toBe(true);
    });
  });

  describe("ExecutionError", () => {
    it("should create error with message and details", () => {
      const details = { step: "navigate", url: "https://example.com" };
      const error = new ExecutionError("Navigation failed", details);

      expect(error.message).toBe("Navigation failed");
      expect(error.code).toBe("EXECUTION_ERROR");
      expect(error.name).toBe("ExecutionError");
      expect(error.details).toEqual(details);
    });

    it("should return 500 status code", () => {
      const error = new ExecutionError("Execution failed");
      expect(error.getStatusCode()).toBe(500);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new ExecutionError("Failed");
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof ExecutionError).toBe(true);
    });
  });

  describe("InternalServerError", () => {
    it("should create error with custom message", () => {
      const error = new InternalServerError("Database connection failed");

      expect(error.message).toBe("Database connection failed");
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.name).toBe("InternalServerError");
    });

    it("should use default message if not provided", () => {
      const error = new InternalServerError();

      expect(error.message).toBe("Internal server error");
      expect(error.code).toBe("INTERNAL_ERROR");
    });

    it("should include details when provided", () => {
      const details = { stack: "some stack trace" };
      const error = new InternalServerError("Unexpected error", details);

      expect(error.details).toEqual(details);
    });

    it("should return 500 status code", () => {
      const error = new InternalServerError();
      expect(error.getStatusCode()).toBe(500);
    });

    it("should be instanceof TestForgeError", () => {
      const error = new InternalServerError();
      expect(error instanceof TestForgeError).toBe(true);
      expect(error instanceof InternalServerError).toBe(true);
    });
  });
});

describe("Error Factory Functions", () => {
  describe("notFound()", () => {
    it("should create NotFoundError with resource and id", () => {
      const error = notFound("Scenario", "scn-789");

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("Scenario not found: scn-789");
      expect(error.code).toBe("NOT_FOUND");
    });

    it("should create NotFoundError without id", () => {
      const error = notFound("Component");

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("Component not found");
    });
  });

  describe("badRequest()", () => {
    it("should create BadRequestError", () => {
      const error = badRequest("Invalid JSON", { position: 42 });

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe("Invalid JSON");
      expect(error.details).toEqual({ position: 42 });
    });
  });

  describe("conflict()", () => {
    it("should create ConflictError", () => {
      const error = conflict("Name already taken", { name: "Test Service" });

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe("Name already taken");
      expect(error.details).toEqual({ name: "Test Service" });
    });
  });

  describe("validationError()", () => {
    it("should create ValidationError", () => {
      const error = validationError("Invalid input", { field: "url" });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Invalid input");
      expect(error.details).toEqual({ field: "url" });
    });
  });

  describe("executionError()", () => {
    it("should create ExecutionError", () => {
      const error = executionError("Step failed", { stepId: "step-1" });

      expect(error).toBeInstanceOf(ExecutionError);
      expect(error.message).toBe("Step failed");
      expect(error.details).toEqual({ stepId: "step-1" });
    });
  });

  describe("internalError()", () => {
    it("should create InternalServerError with custom message", () => {
      const error = internalError("Unexpected error", { trace: "..." });

      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.message).toBe("Unexpected error");
      expect(error.details).toEqual({ trace: "..." });
    });

    it("should create InternalServerError with default message", () => {
      const error = internalError();

      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.message).toBe("Internal server error");
    });
  });
});

describe("Error Inheritance Chain", () => {
  it("should maintain proper prototype chain for all error types", () => {
    const errors = [
      new ElementNotFoundError({ displayName: "Button" }),
      new HealingFailedError({ displayName: "Input" }, []),
      new NotFoundError("Service"),
      new ValidationError("Invalid"),
      new BadRequestError("Bad"),
      new ConflictError("Conflict"),
      new ExecutionError("Failed"),
      new InternalServerError(),
    ];

    errors.forEach((error) => {
      expect(error instanceof Error).toBe(true);
      expect(error instanceof TestForgeError).toBe(true);
      expect(error.name).toBeTruthy();
      expect(error.code).toBeTruthy();
      expect(error.message).toBeTruthy();
    });
  });
});

describe("JSON Serialization", () => {
  it("should serialize all error types correctly", () => {
    const errors = [
      new NotFoundError("Service", "svc-123"),
      new ValidationError("Invalid", { field: "name" }),
      new ConflictError("Duplicate", { existing: "test" }),
    ];

    errors.forEach((error) => {
      const json = error.toJSON();
      expect(json).toHaveProperty("error");
      expect(json.error).toHaveProperty("code");
      expect(json.error).toHaveProperty("message");
      expect(json.error.code).toBe(error.code);
      expect(json.error.message).toBe(error.message);
    });
  });
});

describe("Status Codes", () => {
  it("should return correct HTTP status codes", () => {
    const statusCodeTests = [
      { error: new ElementNotFoundError({ displayName: "x" }), expected: 404 },
      { error: new HealingFailedError({ displayName: "x" }, []), expected: 422 },
      { error: new NotFoundError("Resource"), expected: 404 },
      { error: new ValidationError("Invalid"), expected: 400 },
      { error: new BadRequestError("Bad"), expected: 400 },
      { error: new ConflictError("Conflict"), expected: 409 },
      { error: new ExecutionError("Failed"), expected: 500 },
      { error: new InternalServerError(), expected: 500 },
      { error: new TestForgeError("Base", "CODE"), expected: 500 },
    ];

    statusCodeTests.forEach(({ error, expected }) => {
      expect(error.getStatusCode()).toBe(expected);
    });
  });
});
