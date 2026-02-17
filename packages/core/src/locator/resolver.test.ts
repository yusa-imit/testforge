import { describe, it, expect } from "bun:test";
import {
  calculateHealingConfidence,
  ElementNotFoundError,
} from "./resolver";
import type { LocatorStrategy, ElementLocator } from "../types";

const testIdStrategy = (priority = 1): LocatorStrategy => ({
  type: "testId",
  value: "btn-submit",
  priority,
});

const roleStrategy = (priority = 2): LocatorStrategy => ({
  type: "role",
  role: "button",
  name: "Submit",
  priority,
});

const textStrategy = (priority = 3): LocatorStrategy => ({
  type: "text",
  value: "Submit",
  exact: true,
  priority,
});

const cssStrategy = (priority = 4): LocatorStrategy => ({
  type: "css",
  selector: ".submit-btn",
  priority,
});

const xpathStrategy = (priority = 5): LocatorStrategy => ({
  type: "xpath",
  expression: "//button[text()='Submit']",
  priority,
});

describe("calculateHealingConfidence", () => {
  describe("type-change penalties", () => {
    it("testId → role: penalty 0.1", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy());
      expect(confidence).toBeCloseTo(0.9, 5);
    });

    it("testId → text: penalty 0.15", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), textStrategy());
      expect(confidence).toBeCloseTo(0.85, 5);
    });

    it("testId → css: penalty 0.3", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), cssStrategy());
      expect(confidence).toBeCloseTo(0.7, 5);
    });

    it("role → text: penalty 0.1", () => {
      const confidence = calculateHealingConfidence(roleStrategy(), textStrategy());
      expect(confidence).toBeCloseTo(0.9, 5);
    });

    it("role → css: penalty 0.25", () => {
      const confidence = calculateHealingConfidence(roleStrategy(), cssStrategy());
      expect(confidence).toBeCloseTo(0.75, 5);
    });

    it("text → css: penalty 0.2", () => {
      const confidence = calculateHealingConfidence(textStrategy(), cssStrategy());
      expect(confidence).toBeCloseTo(0.8, 5);
    });

    it("unknown transition: default penalty 0.2", () => {
      const confidence = calculateHealingConfidence(xpathStrategy(), cssStrategy());
      // xpath→css is not in the map, so default penalty 0.2
      expect(confidence).toBeCloseTo(0.8, 5);
    });
  });

  describe("context adjustments", () => {
    it("position changed: additional -0.1 penalty", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), {
        positionChanged: true,
        parentChanged: false,
        textSimilarity: 0,
      });
      expect(confidence).toBeCloseTo(0.8, 5); // 1.0 - 0.1 - 0.1
    });

    it("parent changed: additional -0.15 penalty", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), {
        positionChanged: false,
        parentChanged: true,
        textSimilarity: 0,
      });
      expect(confidence).toBeCloseTo(0.75, 5); // 1.0 - 0.1 - 0.15
    });

    it("text similarity > 0.9: +0.1 bonus", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), {
        positionChanged: false,
        parentChanged: false,
        textSimilarity: 0.95,
      });
      expect(confidence).toBeCloseTo(1.0, 5); // 1.0 - 0.1 + 0.1
    });

    it("combined: position + parent changed, high text similarity", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), {
        positionChanged: true,
        parentChanged: true,
        textSimilarity: 0.95,
      });
      // 1.0 - 0.1(type) - 0.1(position) - 0.15(parent) + 0.1(text) = 0.75
      expect(confidence).toBeCloseTo(0.75, 5);
    });

    it("low text similarity (< 0.9): no bonus", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), {
        positionChanged: false,
        parentChanged: false,
        textSimilarity: 0.5,
      });
      expect(confidence).toBeCloseTo(0.9, 5);
    });

    it("no context: no adjustment", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), undefined);
      expect(confidence).toBeCloseTo(0.9, 5);
    });
  });

  describe("clamping", () => {
    it("clamps result to minimum 0", () => {
      // Stack many penalties: testId→css (-0.3), position (-0.1), parent (-0.15), textSimilarity=0
      // Then extra unknown penalties won't go below 0
      const confidence = calculateHealingConfidence(testIdStrategy(), cssStrategy(), {
        positionChanged: true,
        parentChanged: true,
        textSimilarity: 0,
      });
      // 1.0 - 0.3 - 0.1 - 0.15 = 0.45
      expect(confidence).toBeGreaterThanOrEqual(0);
    });

    it("clamps result to maximum 1", () => {
      const confidence = calculateHealingConfidence(testIdStrategy(), roleStrategy(), {
        positionChanged: false,
        parentChanged: false,
        textSimilarity: 1.0,
      });
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe("ElementNotFoundError", () => {
  it("has correct name and message", () => {
    const locator: ElementLocator = {
      displayName: "Login Button",
      strategies: [testIdStrategy()],
      healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.9 },
    };
    const error = new ElementNotFoundError(locator, [testIdStrategy()]);
    expect(error.name).toBe("ElementNotFoundError");
    expect(error.message).toBe("Element not found: Login Button");
  });

  it("stores locator and attempted strategies", () => {
    const locator: ElementLocator = {
      displayName: "Search Input",
      strategies: [testIdStrategy(), roleStrategy()],
      healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.9 },
    };
    const strategies = [testIdStrategy(), roleStrategy()];
    const error = new ElementNotFoundError(locator, strategies);
    expect(error.locator).toBe(locator);
    expect(error.attemptedStrategies).toBe(strategies);
  });

  it("is an instance of Error", () => {
    const locator: ElementLocator = {
      displayName: "Test",
      strategies: [],
      healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.9 },
    };
    const error = new ElementNotFoundError(locator, []);
    expect(error).toBeInstanceOf(Error);
  });
});
