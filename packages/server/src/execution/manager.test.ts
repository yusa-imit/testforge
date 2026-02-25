import { describe, it, expect, beforeEach } from "bun:test";
import { ExecutionManager } from "./manager";
import { TestExecutor } from "@testforge/core";
import type { RunEvent } from "@testforge/core";

describe("ExecutionManager", () => {
  let manager: ExecutionManager;

  beforeEach(() => {
    // Get singleton instance and clear any previous state
    manager = ExecutionManager.getInstance();
    // Clear all active executions
    const activeIds = manager.getActiveRunIds();
    activeIds.forEach((id) => manager.unregisterExecution(id));
  });

  describe("Singleton Pattern", () => {
    it("should return same instance across calls", () => {
      const instance1 = ExecutionManager.getInstance();
      const instance2 = ExecutionManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should maintain state across getInstance calls", () => {
      const instance1 = ExecutionManager.getInstance();
      const executor = new TestExecutor();
      instance1.registerExecution("test-run-1", executor);

      const instance2 = ExecutionManager.getInstance();
      expect(instance2.isActive("test-run-1")).toBe(true);
    });
  });

  describe("registerExecution", () => {
    it("should register an execution", () => {
      const executor = new TestExecutor();
      const runId = "test-run-1";

      manager.registerExecution(runId, executor);

      expect(manager.isActive(runId)).toBe(true);
      expect(manager.getExecutor(runId)).toBe(executor);
    });

    it("should add runId to active list", () => {
      const executor = new TestExecutor();
      const runId = "test-run-2";

      manager.registerExecution(runId, executor);

      const activeIds = manager.getActiveRunIds();
      expect(activeIds).toContain(runId);
    });

    it("should handle multiple concurrent executions", () => {
      const executor1 = new TestExecutor();
      const executor2 = new TestExecutor();
      const executor3 = new TestExecutor();

      manager.registerExecution("run-1", executor1);
      manager.registerExecution("run-2", executor2);
      manager.registerExecution("run-3", executor3);

      expect(manager.getActiveRunIds()).toHaveLength(3);
      expect(manager.isActive("run-1")).toBe(true);
      expect(manager.isActive("run-2")).toBe(true);
      expect(manager.isActive("run-3")).toBe(true);
    });

    it(
      "should auto-cleanup on run:finished event after delay",
      async () => {
      const executor = new TestExecutor();
      const runId = "test-run-auto-cleanup";

      manager.registerExecution(runId, executor);
      expect(manager.isActive(runId)).toBe(true);

      // Emit run:finished event
      const finishedEvent: RunEvent = {
        type: "run:finished",
        data: {
          status: "success",
          summary: {
            totalSteps: 5,
            passedSteps: 5,
            failedSteps: 0,
            skippedSteps: 0,
            healedSteps: 0,
          },
        },
      };
      executor.emit("event", finishedEvent);

      // Should still be active immediately after event
      expect(manager.isActive(runId)).toBe(true);

      // Wait for cleanup delay (5000ms + buffer)
      await new Promise((resolve) => setTimeout(resolve, 5100));

      // Should be cleaned up now
      expect(manager.isActive(runId)).toBe(false);
      expect(manager.getExecutor(runId)).toBeUndefined();
      },
      { timeout: 10000 }
    );
  });

  describe("unregisterExecution", () => {
    it("should remove execution", () => {
      const executor = new TestExecutor();
      const runId = "test-run-3";

      manager.registerExecution(runId, executor);
      expect(manager.isActive(runId)).toBe(true);

      manager.unregisterExecution(runId);

      expect(manager.isActive(runId)).toBe(false);
      expect(manager.getExecutor(runId)).toBeUndefined();
    });

    it("should remove runId from active list", () => {
      const executor = new TestExecutor();
      const runId = "test-run-4";

      manager.registerExecution(runId, executor);
      expect(manager.getActiveRunIds()).toContain(runId);

      manager.unregisterExecution(runId);

      expect(manager.getActiveRunIds()).not.toContain(runId);
    });

    it("should remove all event listeners", () => {
      const executor = new TestExecutor();
      const runId = "test-run-5";
      let eventCount = 0;

      executor.on("event", () => {
        eventCount++;
      });

      manager.registerExecution(runId, executor);
      manager.unregisterExecution(runId);

      // Emit event after unregister - should not be handled
      const testEvent: RunEvent = {
        type: "run:started",
        data: { runId },
      };
      executor.emit("event", testEvent);

      expect(eventCount).toBe(0);
    });

    it("should handle unregister of non-existent execution gracefully", () => {
      expect(() => {
        manager.unregisterExecution("non-existent-run");
      }).not.toThrow();

      expect(manager.isActive("non-existent-run")).toBe(false);
    });
  });

  describe("getExecutor", () => {
    it("should return executor for active execution", () => {
      const executor = new TestExecutor();
      const runId = "test-run-6";

      manager.registerExecution(runId, executor);

      expect(manager.getExecutor(runId)).toBe(executor);
    });

    it("should return undefined for inactive execution", () => {
      expect(manager.getExecutor("non-existent-run")).toBeUndefined();
    });

    it("should return undefined after unregister", () => {
      const executor = new TestExecutor();
      const runId = "test-run-7";

      manager.registerExecution(runId, executor);
      manager.unregisterExecution(runId);

      expect(manager.getExecutor(runId)).toBeUndefined();
    });
  });

  describe("isActive", () => {
    it("should return true for active execution", () => {
      const executor = new TestExecutor();
      const runId = "test-run-8";

      manager.registerExecution(runId, executor);

      expect(manager.isActive(runId)).toBe(true);
    });

    it("should return false for inactive execution", () => {
      expect(manager.isActive("non-existent-run")).toBe(false);
    });

    it("should return false after unregister", () => {
      const executor = new TestExecutor();
      const runId = "test-run-9";

      manager.registerExecution(runId, executor);
      manager.unregisterExecution(runId);

      expect(manager.isActive(runId)).toBe(false);
    });
  });

  describe("getActiveRunIds", () => {
    it("should return empty array when no active executions", () => {
      const activeIds = manager.getActiveRunIds();
      expect(activeIds).toEqual([]);
    });

    it("should return all active execution IDs", () => {
      const executor1 = new TestExecutor();
      const executor2 = new TestExecutor();
      const executor3 = new TestExecutor();

      manager.registerExecution("run-a", executor1);
      manager.registerExecution("run-b", executor2);
      manager.registerExecution("run-c", executor3);

      const activeIds = manager.getActiveRunIds();
      expect(activeIds).toHaveLength(3);
      expect(activeIds).toContain("run-a");
      expect(activeIds).toContain("run-b");
      expect(activeIds).toContain("run-c");
    });

    it("should reflect changes after unregister", () => {
      const executor1 = new TestExecutor();
      const executor2 = new TestExecutor();

      manager.registerExecution("run-x", executor1);
      manager.registerExecution("run-y", executor2);

      expect(manager.getActiveRunIds()).toHaveLength(2);

      manager.unregisterExecution("run-x");

      const activeIds = manager.getActiveRunIds();
      expect(activeIds).toHaveLength(1);
      expect(activeIds).toContain("run-y");
      expect(activeIds).not.toContain("run-x");
    });

    it("should return new array each time (not reference)", () => {
      const executor = new TestExecutor();
      manager.registerExecution("run-test", executor);

      const ids1 = manager.getActiveRunIds();
      const ids2 = manager.getActiveRunIds();

      expect(ids1).toEqual(ids2);
      expect(ids1).not.toBe(ids2); // Different array instances
    });
  });

  describe("Edge Cases", () => {
    it("should handle registering same runId twice (overwrites)", () => {
      const executor1 = new TestExecutor();
      const executor2 = new TestExecutor();
      const runId = "duplicate-run";

      manager.registerExecution(runId, executor1);
      manager.registerExecution(runId, executor2);

      expect(manager.getActiveRunIds()).toHaveLength(1);
      expect(manager.getExecutor(runId)).toBe(executor2);
    });

    it("should handle rapid register/unregister cycles", () => {
      const runId = "rapid-cycle";

      for (let i = 0; i < 10; i++) {
        const executor = new TestExecutor();
        manager.registerExecution(runId, executor);
        expect(manager.isActive(runId)).toBe(true);
        manager.unregisterExecution(runId);
        expect(manager.isActive(runId)).toBe(false);
      }

      expect(manager.getActiveRunIds()).toHaveLength(0);
    });

    it("should handle many concurrent executions", () => {
      const executors: TestExecutor[] = [];
      const count = 100;

      for (let i = 0; i < count; i++) {
        const executor = new TestExecutor();
        executors.push(executor);
        manager.registerExecution(`run-${i}`, executor);
      }

      expect(manager.getActiveRunIds()).toHaveLength(count);

      for (let i = 0; i < count; i++) {
        expect(manager.isActive(`run-${i}`)).toBe(true);
        expect(manager.getExecutor(`run-${i}`)).toBe(executors[i]);
      }

      // Cleanup
      for (let i = 0; i < count; i++) {
        manager.unregisterExecution(`run-${i}`);
      }

      expect(manager.getActiveRunIds()).toHaveLength(0);
    });
  });
});
