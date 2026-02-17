import { describe, it, expect, beforeEach } from "bun:test";
import { HealingTracker } from "./tracker";
import type { HealingEvent } from "./tracker";

const makeEvent = (overrides: Partial<HealingEvent> = {}): HealingEvent => ({
  scenarioId: "scenario-1",
  stepId: "step-1",
  runId: "run-1",
  locatorDisplayName: "Submit Button",
  originalStrategy: { type: "testId", value: "submit-btn", priority: 1 },
  healedStrategy: { type: "css", selector: ".submit-btn", priority: 2 },
  confidence: 0.8,
  ...overrides,
});

describe("HealingTracker", () => {
  let tracker: HealingTracker;

  beforeEach(() => {
    tracker = new HealingTracker();
  });

  describe("recordEvent", () => {
    it("records a healing event and returns an event ID", () => {
      const event = makeEvent();
      const eventId = tracker.recordEvent(event);
      expect(eventId).toBe("run-1-step-1");
    });

    it("auto-approves events with confidence >= 0.9 (default threshold)", () => {
      const highConfidenceEvent = makeEvent({ confidence: 0.9 });
      const eventId = tracker.recordEvent(highConfidenceEvent);
      const decision = tracker.getDecision(eventId);
      expect(decision?.status).toBe("auto_approved");
    });

    it("auto-approves events with confidence > 0.9", () => {
      const event = makeEvent({ confidence: 0.95 });
      const eventId = tracker.recordEvent(event);
      const decision = tracker.getDecision(eventId);
      expect(decision?.status).toBe("auto_approved");
    });

    it("does not auto-approve events with confidence < 0.9", () => {
      const event = makeEvent({ confidence: 0.8 });
      const eventId = tracker.recordEvent(event);
      const decision = tracker.getDecision(eventId);
      expect(decision).toBeUndefined();
    });

    it("does not auto-approve events with confidence = 0.89", () => {
      const event = makeEvent({ confidence: 0.89 });
      const eventId = tracker.recordEvent(event);
      const decision = tracker.getDecision(eventId);
      expect(decision).toBeUndefined();
    });
  });

  describe("approve", () => {
    it("approves a recorded event", () => {
      const event = makeEvent();
      const eventId = tracker.recordEvent(event);
      const decision = tracker.approve(eventId, "reviewer@example.com", "LGTM");
      expect(decision?.status).toBe("approved");
      expect(decision?.reviewedBy).toBe("reviewer@example.com");
      expect(decision?.reviewNote).toBe("LGTM");
    });

    it("returns null when approving non-existent event", () => {
      const result = tracker.approve("non-existent-id");
      expect(result).toBeNull();
    });

    it("approves without optional fields", () => {
      const event = makeEvent();
      const eventId = tracker.recordEvent(event);
      const decision = tracker.approve(eventId);
      expect(decision?.status).toBe("approved");
      expect(decision?.reviewedBy).toBeUndefined();
      expect(decision?.reviewNote).toBeUndefined();
    });
  });

  describe("reject", () => {
    it("rejects a recorded event", () => {
      const event = makeEvent();
      const eventId = tracker.recordEvent(event);
      const decision = tracker.reject(eventId, "reviewer@example.com", "Wrong element");
      expect(decision?.status).toBe("rejected");
      expect(decision?.reviewedBy).toBe("reviewer@example.com");
      expect(decision?.reviewNote).toBe("Wrong element");
    });

    it("returns null when rejecting non-existent event", () => {
      const result = tracker.reject("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("getPendingEvents", () => {
    it("returns all events without decisions", () => {
      tracker.recordEvent(makeEvent({ runId: "run-1", stepId: "step-1" }));
      tracker.recordEvent(makeEvent({ runId: "run-2", stepId: "step-2" }));
      const pending = tracker.getPendingEvents();
      expect(pending).toHaveLength(2);
    });

    it("excludes auto-approved events from pending", () => {
      tracker.recordEvent(makeEvent({ confidence: 0.95, runId: "run-1", stepId: "step-1" }));
      tracker.recordEvent(makeEvent({ confidence: 0.5, runId: "run-2", stepId: "step-2" }));
      const pending = tracker.getPendingEvents();
      expect(pending).toHaveLength(1);
      expect(pending[0].runId).toBe("run-2");
    });

    it("excludes approved events", () => {
      const eventId = tracker.recordEvent(makeEvent());
      tracker.approve(eventId);
      const pending = tracker.getPendingEvents();
      expect(pending).toHaveLength(0);
    });

    it("excludes rejected events", () => {
      const eventId = tracker.recordEvent(makeEvent());
      tracker.reject(eventId);
      const pending = tracker.getPendingEvents();
      expect(pending).toHaveLength(0);
    });

    it("returns empty array when no events", () => {
      expect(tracker.getPendingEvents()).toHaveLength(0);
    });
  });

  describe("shouldUseHealedStrategy", () => {
    it("returns healed strategy for auto-approved events", () => {
      const event = makeEvent({ confidence: 0.95 });
      tracker.recordEvent(event);
      const strategy = tracker.shouldUseHealedStrategy("scenario-1", "step-1");
      expect(strategy).toEqual({ type: "css", selector: ".submit-btn", priority: 2 });
    });

    it("returns healed strategy for approved events", () => {
      const eventId = tracker.recordEvent(makeEvent());
      tracker.approve(eventId);
      const strategy = tracker.shouldUseHealedStrategy("scenario-1", "step-1");
      expect(strategy).toEqual({ type: "css", selector: ".submit-btn", priority: 2 });
    });

    it("returns null for pending events", () => {
      tracker.recordEvent(makeEvent());
      const strategy = tracker.shouldUseHealedStrategy("scenario-1", "step-1");
      expect(strategy).toBeNull();
    });

    it("returns null for rejected events", () => {
      const eventId = tracker.recordEvent(makeEvent());
      tracker.reject(eventId);
      const strategy = tracker.shouldUseHealedStrategy("scenario-1", "step-1");
      expect(strategy).toBeNull();
    });

    it("returns null when no events match the scenarioId/stepId", () => {
      tracker.recordEvent(makeEvent());
      const strategy = tracker.shouldUseHealedStrategy("other-scenario", "other-step");
      expect(strategy).toBeNull();
    });
  });

  describe("clear", () => {
    it("removes all events and decisions", () => {
      tracker.recordEvent(makeEvent({ confidence: 0.95 }));
      tracker.clear();
      expect(tracker.getPendingEvents()).toHaveLength(0);
      expect(tracker.getDecision("run-1-step-1")).toBeUndefined();
    });
  });

  describe("setAutoApproveThreshold", () => {
    it("changes the auto-approve threshold", () => {
      tracker.setAutoApproveThreshold(0.7);
      const event = makeEvent({ confidence: 0.75 });
      const eventId = tracker.recordEvent(event);
      const decision = tracker.getDecision(eventId);
      expect(decision?.status).toBe("auto_approved");
    });

    it("clamps threshold to [0, 1]", () => {
      tracker.setAutoApproveThreshold(2.0);
      // Confidence 0.99 should NOT auto-approve (clamped to 1.0, and 0.99 < 1.0)
      const event = makeEvent({ confidence: 0.99 });
      const eventId = tracker.recordEvent(event);
      const decision = tracker.getDecision(eventId);
      expect(decision).toBeUndefined();
    });

    it("clamps threshold to 0 minimum", () => {
      tracker.setAutoApproveThreshold(-1.0);
      // All events should auto-approve when threshold = 0
      const event = makeEvent({ confidence: 0.0 });
      const eventId = tracker.recordEvent(event);
      const decision = tracker.getDecision(eventId);
      expect(decision?.status).toBe("auto_approved");
    });
  });
});
