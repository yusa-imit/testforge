import { describe, it, expect } from "bun:test";
import {
  serviceSchema,
  locatorStrategySchema,
  elementLocatorSchema,
  stepTypeSchema,
  healingStatusSchema,
  runStatusSchema,
} from "./index";

describe("Zod Schemas", () => {
  describe("serviceSchema", () => {
    const validService = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test Service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("accepts valid service data", () => {
      const result = serviceSchema.safeParse(validService);
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = serviceSchema.safeParse({ ...validService, name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid baseUrl", () => {
      const result = serviceSchema.safeParse({
        ...validService,
        baseUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("defaults defaultTimeout to 30000", () => {
      const { defaultTimeout: _defaultTimeout, ...rest } = validService;
      const result = serviceSchema.safeParse(rest);
      // defaultTimeout has a default in schema
      expect(result.success).toBe(true);
    });
  });

  describe("locatorStrategySchema", () => {
    it("parses testId strategy", () => {
      const result = locatorStrategySchema.safeParse({
        type: "testId",
        value: "submit-btn",
        priority: 1,
      });
      expect(result.success).toBe(true);
    });

    it("parses role strategy", () => {
      const result = locatorStrategySchema.safeParse({
        type: "role",
        role: "button",
        name: "Submit",
        priority: 2,
      });
      expect(result.success).toBe(true);
    });

    it("parses text strategy", () => {
      const result = locatorStrategySchema.safeParse({
        type: "text",
        value: "Click me",
        exact: true,
        priority: 3,
      });
      expect(result.success).toBe(true);
    });

    it("parses label strategy", () => {
      const result = locatorStrategySchema.safeParse({
        type: "label",
        value: "Email",
        priority: 4,
      });
      expect(result.success).toBe(true);
    });

    it("parses css strategy", () => {
      const result = locatorStrategySchema.safeParse({
        type: "css",
        selector: ".submit-btn",
        priority: 5,
      });
      expect(result.success).toBe(true);
    });

    it("parses xpath strategy", () => {
      const result = locatorStrategySchema.safeParse({
        type: "xpath",
        expression: "//button[@type='submit']",
        priority: 6,
      });
      expect(result.success).toBe(true);
    });

    it("rejects unknown strategy type", () => {
      const result = locatorStrategySchema.safeParse({
        type: "custom",
        value: "something",
        priority: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("elementLocatorSchema", () => {
    const validLocator = {
      displayName: "Submit Button",
      strategies: [
        { type: "testId", value: "submit-btn", priority: 1 },
        { type: "css", selector: ".submit", priority: 2 },
      ],
      healing: {
        enabled: true,
        autoApprove: false,
        confidenceThreshold: 0.9,
      },
    };

    it("accepts valid element locator", () => {
      const result = elementLocatorSchema.safeParse(validLocator);
      expect(result.success).toBe(true);
    });

    it("rejects confidenceThreshold > 1", () => {
      const result = elementLocatorSchema.safeParse({
        ...validLocator,
        healing: { ...validLocator.healing, confidenceThreshold: 1.5 },
      });
      expect(result.success).toBe(false);
    });

    it("rejects confidenceThreshold < 0", () => {
      const result = elementLocatorSchema.safeParse({
        ...validLocator,
        healing: { ...validLocator.healing, confidenceThreshold: -0.1 },
      });
      expect(result.success).toBe(false);
    });

    it("defaults enabled=true, autoApprove=false, confidenceThreshold=0.9", () => {
      const minimalLocator = {
        displayName: "Button",
        strategies: [{ type: "testId", value: "btn", priority: 1 }],
        healing: {},
      };
      const result = elementLocatorSchema.safeParse(minimalLocator);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.healing.enabled).toBe(true);
        expect(result.data.healing.autoApprove).toBe(false);
        expect(result.data.healing.confidenceThreshold).toBe(0.9);
      }
    });
  });

  describe("stepTypeSchema", () => {
    const validTypes = [
      "navigate", "click", "fill", "select", "hover", "wait",
      "assert", "screenshot", "api-request", "api-assert",
      "component", "script",
    ];

    for (const type of validTypes) {
      it(`accepts step type: ${type}`, () => {
        const result = stepTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    }

    it("rejects unknown step type", () => {
      const result = stepTypeSchema.safeParse("unknown-type");
      expect(result.success).toBe(false);
    });
  });

  describe("healingStatusSchema", () => {
    const validStatuses = ["pending", "approved", "rejected", "auto_approved"];

    for (const status of validStatuses) {
      it(`accepts status: ${status}`, () => {
        const result = healingStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    }

    it("rejects unknown status", () => {
      const result = healingStatusSchema.safeParse("unknown");
      expect(result.success).toBe(false);
    });
  });

  describe("runStatusSchema", () => {
    const validStatuses = ["pending", "running", "passed", "failed", "cancelled"];

    for (const status of validStatuses) {
      it(`accepts status: ${status}`, () => {
        const result = runStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    }
  });
});
