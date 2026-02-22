import { TestExecutor } from "@testforge/core";
import type { Scenario, Service, RunEvent } from "@testforge/core";
import { v4 as uuid } from "uuid";
import { ExecutionManager } from "./manager";
import type { DuckDBDatabase } from "../db/database";
import { logger } from "../utils/logger";

/**
 * Shared helper to execute a single scenario and return the runId.
 * Used by scenario, feature, and service-level run endpoints.
 */
export async function executeScenarioRun(
  scenario: Scenario,
  service: Service,
  db: DuckDBDatabase
): Promise<string> {
  const executor = new TestExecutor();
  const executionManager = ExecutionManager.getInstance();

  // Capture runId from run:started event
  const runIdPromise = new Promise<string>((resolve) => {
    executor.once("event", (event: RunEvent) => {
      if (event.type === "run:started") {
        resolve(event.data.runId);
      }
    });
  });

  // Start execution in background
  let capturedRunId: string | null = null;

  const _executionPromise = (async () => {
    try {
      const result = await executor.execute(scenario, service, {
        headless: true,
        componentLoader: async (componentId: string) => {
          return db.getComponent(componentId);
        },
      });

      // Save results
      await db.createTestRun(result.run);
      for (const stepResult of result.stepResults) {
        await db.createStepResult(stepResult);
      }

      // Save healing events
      for (const event of result.healingEvents) {
        await db.createHealingRecord({
          id: uuid(),
          scenarioId: event.scenarioId,
          stepId: event.stepId,
          runId: event.runId,
          locatorDisplayName: event.locatorDisplayName,
          originalStrategy: event.originalStrategy,
          healedStrategy: event.healedStrategy,
          trigger: event.originalStrategy.type === "api-path" ? "api_path_changed" : "element_not_found",
          confidence: event.confidence,
          status: event.confidence >= 0.9 ? "auto_approved" : "pending",
          createdAt: new Date(),
        });
      }

      return result;
    } catch (error) {
      logger.error("Execution error", { error, runId: capturedRunId });
      if (capturedRunId) {
        await db.updateTestRun(capturedRunId, {
          status: "failed",
          finishedAt: new Date(),
        });
      }
    }
  })();

  // Wait for runId
  capturedRunId = await runIdPromise;

  // Register for SSE streaming
  executionManager.registerExecution(capturedRunId, executor);

  return capturedRunId;
}
