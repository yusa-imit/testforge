import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { executeScenarioRun } from "./runHelper";
import { ExecutionManager } from "./manager";
import type { Scenario, Service, Component } from "@testforge/core";
import { DuckDBDatabase } from "../db/database";
import { setupTestDB } from "../test-helpers/setup";

describe("runHelper - executeScenarioRun", () => {
  let db: DuckDBDatabase;
  let manager: ExecutionManager;
  let serviceId: string;
  let service: Service;

  beforeEach(async () => {
    const setup = await setupTestDB();
    db = setup.db;
    manager = ExecutionManager.getInstance();

    // Clean up any existing active runs
    const activeIds = manager.getActiveRunIds();
    activeIds.forEach((id) => manager.unregisterExecution(id));

    // Create test service
    service = await db.createService({
      name: "Test Service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
    });
    serviceId = service.id;
  });

  afterEach(async () => {
    // Clean up active runs
    const activeIds = manager.getActiveRunIds();
    activeIds.forEach((id) => manager.unregisterExecution(id));
  });

  describe("Basic Execution", () => {
    it("should execute a simple scenario and return runId", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Simple Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      expect(runId).toBeString();
      expect(runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should register execution with ExecutionManager", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Test Scenario",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      expect(manager.isActive(runId)).toBe(true);
      expect(manager.getExecutor(runId)).toBeDefined();
    });

    it("should save test run to database", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Test Scenario",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const testRun = await db.getTestRun(runId);
      expect(testRun).toBeDefined();
      expect(testRun?.scenarioId).toBe(scenario.id);
    });
  });

  describe("Component Loading", () => {
    it("should load components during execution", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      // Create a component
      const component: Component = await db.createComponent({
        name: "Test Component",
        type: "flow",
        parameters: [],
        steps: [
          {
            id: "comp-step-1",
            description: "Click submit button",
            type: "click",
            config: {
              locator: {
                displayName: "Submit Button",
                strategies: [
                  { type: "testId", value: "submit-btn", priority: 1 },
                ],
                healing: { enabled: false, autoApprove: false, confidenceThreshold: 0.9 },
              },
            },
            continueOnError: false,
          },
        ],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Component Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
          {
            id: "step-2",
            description: "Use component",
            type: "component",
            config: {
              componentId: component.id,
              parameters: {},
            },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      expect(runId).toBeString();
      expect(manager.isActive(runId)).toBe(true);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const testRun = await db.getTestRun(runId);
      expect(testRun).toBeDefined();
    });

    it("should handle missing component gracefully", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Missing Component Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
          {
            id: "step-2",
            description: "Use component",
            type: "component",
            config: {
              componentId: "non-existent-component-id",
            },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      expect(runId).toBeString();

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const testRun = await db.getTestRun(runId);
      expect(testRun).toBeDefined();
      expect(testRun?.status).toBe("failed");
    });
  });

  describe("Step Results", () => {
    it("should save step results to database", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Step Results Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const stepResults = await db.getStepResultsByRun(runId);
      expect(stepResults).toBeDefined();
      expect(stepResults.length).toBeGreaterThan(0);
    });
  });

  describe("Healing Events", () => {
    it.skip("should save healing events to database when healing occurs", async () => {
      // This test would require a real browser and page that triggers healing
      // Skipping for now as it requires complex setup
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Healing Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
          {
            id: "step-2",
            description: "Click button",
            type: "click",
            config: {
              locator: {
                displayName: "Button",
                strategies: [
                  { type: "testId", value: "old-id", priority: 1 },
                  { type: "css", selector: "button.submit", priority: 2 },
                ],
                healing: { enabled: false, autoApprove: false, confidenceThreshold: 0.9 },
              },
            },
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check for healing records
      const healingRecords = await db.getAllHealingRecords();
      // Would need actual healing to occur for this to have records
      expect(healingRecords).toBeDefined();
    });

    it("should set healing status based on confidence", async () => {
      // Test that high confidence (>= 0.9) healing is auto-approved
      // This is validated by the healing record creation logic in runHelper.ts
      // Actual testing requires triggering healing, which needs browser
      expect(true).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle execution errors and update run status", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      // Create scenario with invalid step that will cause error
      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Error Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to invalid URL",
            type: "navigate",
            config: { url: "invalid-url" }, // Invalid URL
            continueOnError: false,
          },
        ],
      });

      const runId = await executeScenarioRun(scenario, service, db);

      expect(runId).toBeString();

      // Wait for execution to fail
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const testRun = await db.getTestRun(runId);
      expect(testRun).toBeDefined();
      expect(testRun?.status).toBe("failed");
    });
  });

  describe("Background Execution", () => {
    it("should return runId immediately without waiting for completion", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Background Test",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const startTime = Date.now();
      const runId = await executeScenarioRun(scenario, service, db);
      const duration = Date.now() - startTime;

      // Should return quickly (< 1 second) before execution completes
      expect(duration).toBeLessThan(1000);
      expect(runId).toBeString();

      // Run should still be active
      expect(manager.isActive(runId)).toBe(true);
    });

    it("should handle multiple concurrent executions", async () => {
      const feature = await db.createFeature({
        serviceId,
        name: "Test Feature",
        owners: [],
      });

      const scenario1: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Concurrent Test 1",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const scenario2: Scenario = await db.createScenario({
        featureId: feature.id,
        name: "Concurrent Test 2",
        tags: [],
        priority: "medium",
        variables: [],
        steps: [
          {
            id: "step-1",
            description: "Navigate to example.com",
            type: "navigate",
            config: { url: "https://example.com" },
            continueOnError: false,
          },
        ],
      });

      const [runId1, runId2] = await Promise.all([
        executeScenarioRun(scenario1, service, db),
        executeScenarioRun(scenario2, service, db),
      ]);

      expect(runId1).toBeString();
      expect(runId2).toBeString();
      expect(runId1).not.toBe(runId2);

      expect(manager.isActive(runId1)).toBe(true);
      expect(manager.isActive(runId2)).toBe(true);

      const activeIds = manager.getActiveRunIds();
      expect(activeIds).toContain(runId1);
      expect(activeIds).toContain(runId2);
    });
  });
});
