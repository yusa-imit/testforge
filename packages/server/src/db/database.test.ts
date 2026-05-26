/**
 * DuckDBDatabase Unit Tests
 *
 * Comprehensive tests for all database CRUD operations.
 * Tests the database layer directly without HTTP layer involvement.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { DuckDBDatabase } from "./database";
import { createTestDB } from "../test-helpers/setup";
import type {
  CreateService,
  CreateFeature,
  CreateScenario,
  CreateComponent,
  TestRun,
  StepResult,
  HealingRecord,
} from "@testforge/core";
import { v4 as uuid } from "uuid";

let db: DuckDBDatabase;

beforeEach(async () => {
  db = await createTestDB();
});

// ============================================
// Services
// ============================================

describe("DuckDBDatabase - Services", () => {
  it("should create a service with all fields", async () => {
    const data: CreateService = {
      name: "Test Service",
      description: "A test service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
    };

    const service = await db.createService(data);

    expect(service.id).toBeDefined();
    expect(service.name).toBe(data.name);
    expect(service.description).toBe(data.description);
    expect(service.baseUrl).toBe(data.baseUrl);
    expect(service.defaultTimeout).toBe(data.defaultTimeout);
    expect(service.createdAt).toBeInstanceOf(Date);
    expect(service.updatedAt).toBeInstanceOf(Date);
  });

  it("should create a service with minimal fields", async () => {
    const data: CreateService = {
      name: "Minimal Service",
      baseUrl: "https://minimal.com",
      defaultTimeout: 30000,
    };

    const service = await db.createService(data);

    expect(service.id).toBeDefined();
    expect(service.name).toBe(data.name);
    expect(service.description).toBeNull(); // DuckDB returns null, not undefined
    expect(service.defaultTimeout).toBe(30000); // default value
  });

  it("should get a service by id", async () => {
    const created = await db.createService({
      name: "Get Test",
      baseUrl: "https://get.com",
      defaultTimeout: 30000,
    });

    const retrieved = await db.getService(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.name).toBe(created.name);
  });

  it("should return undefined for non-existent service", async () => {
    const result = await db.getService("non-existent-id");
    expect(result).toBeUndefined();
  });

  it("should get all services ordered by creation date", async () => {
    await db.createService({ name: "First", baseUrl: "https://first.com", defaultTimeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.createService({ name: "Second", baseUrl: "https://second.com", defaultTimeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.createService({ name: "Third", baseUrl: "https://third.com", defaultTimeout: 30000 });

    const services = await db.getAllServices();

    expect(services).toHaveLength(3);
    // Should be in reverse chronological order
    expect(services[0].name).toBe("Third");
    expect(services[1].name).toBe("Second");
    expect(services[2].name).toBe("First");
  });

  it("should update service fields", async () => {
    const created = await db.createService({
      name: "Original",
      baseUrl: "https://original.com",
      defaultTimeout: 30000,
    });

    const updated = await db.updateService(created.id, {
      name: "Updated",
      description: "New description",
      defaultTimeout: 60000,
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated");
    expect(updated!.description).toBe("New description");
    expect(updated!.defaultTimeout).toBe(60000);
    expect(updated!.baseUrl).toBe("https://original.com"); // unchanged
  });

  it("should return undefined when updating non-existent service", async () => {
    const result = await db.updateService("non-existent-id", {
      name: "Test",
    });
    expect(result).toBeUndefined();
  });

  it("should delete a service", async () => {
    const created = await db.createService({
      name: "To Delete",
      baseUrl: "https://delete.com",
      defaultTimeout: 30000,
    });

    const deleted = await db.deleteService(created.id);
    expect(deleted).toBe(true);

    const retrieved = await db.getService(created.id);
    expect(retrieved).toBeUndefined();
  });

  it("should return false when deleting non-existent service", async () => {
    const result = await db.deleteService("non-existent-id");
    expect(result).toBe(false);
  });
});

// ============================================
// Features
// ============================================

describe("DuckDBDatabase - Features", () => {
  let serviceId: string;

  beforeEach(async () => {
    const service = await db.createService({
      name: "Test Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    serviceId = service.id;
  });

  it("should create a feature with all fields", async () => {
    const data: CreateFeature = {
      serviceId,
      name: "Login Feature",
      description: "User authentication",
      owners: ["alice@test.com", "bob@test.com"],
    };

    const feature = await db.createFeature(data);

    expect(feature.id).toBeDefined();
    expect(feature.serviceId).toBe(serviceId);
    expect(feature.name).toBe(data.name);
    expect(feature.description).toBe(data.description);
    expect(Array.isArray(feature.owners)).toBe(true);
    expect(feature.owners).toHaveLength(2);
    expect(feature.owners).toContain("alice@test.com");
    expect(feature.owners).toContain("bob@test.com");
    expect(feature.createdAt).toBeInstanceOf(Date);
  });

  it("should create a feature with empty owners array", async () => {
    const data: CreateFeature = {
      serviceId,
      name: "No Owners",
      owners: [],
    };

    const feature = await db.createFeature(data);

    expect(feature.owners).toEqual([]);
  });

  it("should get a feature by id", async () => {
    const created = await db.createFeature({
      serviceId,
      name: "Get Feature",
      owners: [],
    });

    const retrieved = await db.getFeature(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
  });

  it("should get features by service", async () => {
    // Add small delay to ensure different timestamps
    await db.createFeature({ serviceId, name: "Feature 1", owners: [] });
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.createFeature({ serviceId, name: "Feature 2", owners: [] });

    const features = await db.getFeaturesByService(serviceId);

    expect(features).toHaveLength(2);
    expect(features[0].name).toBe("Feature 2"); // reverse chronological
    expect(features[1].name).toBe("Feature 1");
  });

  it("should update feature fields", async () => {
    const created = await db.createFeature({
      serviceId,
      name: "Original",
      owners: [], // Empty array works fine
    });

    const updated = await db.updateFeature(created.id, {
      name: "Updated",
      description: "New description",
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated");
    expect(updated!.description).toBe("New description");
  });

  it("should delete a feature", async () => {
    const created = await db.createFeature({
      serviceId,
      name: "To Delete",
      owners: [],
    });

    const deleted = await db.deleteFeature(created.id);
    expect(deleted).toBe(true);

    const retrieved = await db.getFeature(created.id);
    expect(retrieved).toBeUndefined();
  });
});

// ============================================
// Scenarios
// ============================================

describe("DuckDBDatabase - Scenarios", () => {
  let featureId: string;
  let serviceId: string;

  beforeEach(async () => {
    const service = await db.createService({
      name: "Test Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    serviceId = service.id;
    const feature = await db.createFeature({
      serviceId: service.id,
      name: "Test Feature",
      owners: [],
    });
    featureId = feature.id;
  });

  it("should create a scenario with all fields", async () => {
    const data: CreateScenario = {
      featureId,
      name: "Login Test",
      description: "Test user login flow",
      tags: ["smoke", "auth"],
      priority: "high",
      variables: [
        { name: "username", defaultValue: "test@example.com", type: "string" },
      ],
      steps: [
        {
          id: uuid(),
          type: "navigate",
          description: "Navigate to login page",
          continueOnError: false,
          config: { url: "https://example.com/login" },
        },
      ],
    };

    const scenario = await db.createScenario(data);

    expect(scenario.id).toBeDefined();
    expect(scenario.featureId).toBe(featureId);
    expect(scenario.name).toBe(data.name);
    expect(scenario.description).toBe(data.description);
    expect(Array.isArray(scenario.tags)).toBe(true);
    expect(scenario.tags).toHaveLength(2);
    expect(scenario.tags).toContain("smoke");
    expect(scenario.tags).toContain("auth");
    expect(scenario.priority).toBe(data.priority);
    expect(scenario.variables).toEqual(data.variables);
    expect(scenario.steps).toHaveLength(1);
    expect(scenario.version).toBe(1);
  });

  it("should create a scenario with minimal fields", async () => {
    const data: CreateScenario = {
      featureId,
      name: "Minimal Scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    };

    const scenario = await db.createScenario(data);

    expect(scenario.id).toBeDefined();
    expect(scenario.tags).toEqual([]);
    expect(scenario.variables).toEqual([]);
    expect(scenario.steps).toEqual([]);
    expect(scenario.priority).toBe("medium");
  });

  it("should get a scenario by id", async () => {
    const created = await db.createScenario({
      featureId,
      name: "Get Test",
      tags: [],
      priority: "low",
      variables: [],
      steps: [],
    });

    const retrieved = await db.getScenario(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
  });

  it("should get scenarios by feature", async () => {
    await db.createScenario({
      featureId,
      name: "Scenario 1",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    });
    await db.createScenario({
      featureId,
      name: "Scenario 2",
      tags: [],
      priority: "high",
      variables: [],
      steps: [],
    });

    const scenarios = await db.getScenariosByFeature(featureId);

    expect(scenarios).toHaveLength(2);
    const names = scenarios.map(s => s.name).sort();
    expect(names).toEqual(["Scenario 1", "Scenario 2"]);
  });

  it("should get all scenarios", async () => {
    await db.createScenario({
      featureId,
      name: "Scenario 1",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    });

    const scenarios = await db.getAllScenarios();

    expect(scenarios.length).toBeGreaterThanOrEqual(1);
  });

  it("should get scenarios by service via JOIN", async () => {
    await db.createScenario({ featureId, name: "S1", tags: [], priority: "medium", variables: [], steps: [] });
    await db.createScenario({ featureId, name: "S2", tags: [], priority: "high", variables: [], steps: [] });

    const scenarios = await db.getScenariosByService(serviceId);
    const names = scenarios.map(s => s.name).sort();
    expect(names).toEqual(["S1", "S2"]);
  });

  it("getScenariosByService returns empty array for unknown service", async () => {
    const scenarios = await db.getScenariosByService("no-such-service-id");
    expect(scenarios).toEqual([]);
  });

  it("getScenariosByService isolates between services", async () => {
    const otherService = await db.createService({ name: "Other Service", baseUrl: "https://other.example.com", defaultTimeout: 30000 });
    const otherFeature = await db.createFeature({ serviceId: otherService.id, name: "Other Feature", owners: [] });
    await db.createScenario({ featureId: otherFeature.id, name: "Other Scenario", tags: [], priority: "low", variables: [], steps: [] });

    await db.createScenario({ featureId, name: "My Scenario", tags: [], priority: "medium", variables: [], steps: [] });

    const mine = await db.getScenariosByService(serviceId);
    const theirs = await db.getScenariosByService(otherService.id);
    expect(mine.map(s => s.name)).toEqual(["My Scenario"]);
    expect(theirs.map(s => s.name)).toEqual(["Other Scenario"]);
  });

  it("should update scenario and increment version", async () => {
    const created = await db.createScenario({
      featureId,
      name: "Original",
      tags: [],
      priority: "low",
      variables: [],
      steps: [],
    });

    expect(created.version).toBe(1);

    const updated = await db.updateScenario(created.id, {
      name: "Updated",
      steps: [{ id: uuid(), type: "navigate", description: "Navigate", continueOnError: false, config: { url: "https://test.com" } }],
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated");
    expect(updated!.steps).toHaveLength(1);
    expect(updated!.version).toBe(2); // version incremented
  });

  it("should delete a scenario", async () => {
    const created = await db.createScenario({
      featureId,
      name: "To Delete",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    });

    const deleted = await db.deleteScenario(created.id);
    expect(deleted).toBe(true);

    const retrieved = await db.getScenario(created.id);
    expect(retrieved).toBeUndefined();
  });

  it("should duplicate a scenario with (복사본) suffix", async () => {
    const original = await db.createScenario({
      featureId,
      name: "Original Scenario",
      description: "Original description",
      tags: [],
      priority: "high",
      variables: [{ name: "var1", defaultValue: "val1", type: "string" }],
      steps: [{ id: uuid(), type: "navigate", description: "Navigate", continueOnError: false, config: { url: "https://test.com" } }],
    });

    const duplicate = await db.duplicateScenario(original.id);

    expect(duplicate).toBeDefined();
    expect(duplicate!.id).not.toBe(original.id);
    expect(duplicate!.name).toBe("Original Scenario (복사본)");
    expect(duplicate!.description).toBe(original.description);
    expect(duplicate!.priority).toBe(original.priority);
    expect(duplicate!.variables).toEqual(original.variables);
    expect(duplicate!.steps).toEqual(original.steps);
    expect(duplicate!.version).toBe(1); // new scenario starts at version 1
  });

  it("should return undefined when duplicating non-existent scenario", async () => {
    const result = await db.duplicateScenario("non-existent-id");
    expect(result).toBeUndefined();
  });
});

// ============================================
// Components
// ============================================

describe("DuckDBDatabase - Components", () => {
  it("should create a component with all fields", async () => {
    const data: CreateComponent = {
      name: "Login Form",
      description: "Reusable login component",
      type: "flow",
      parameters: [
        { name: "username", type: "string", required: true },
        { name: "password", type: "string", required: true },
      ],
      steps: [
        {
          id: uuid(),
          type: "fill",
          description: "Fill username",
          continueOnError: false,
          config: {
            locator: {
              displayName: "Username Input",
              strategies: [{ type: "testId", value: "username-input", priority: 1 }],
              healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.9 }
            },
            value: "${username}"
          }
        },
        {
          id: uuid(),
          type: "fill",
          description: "Fill password",
          continueOnError: false,
          config: {
            locator: {
              displayName: "Password Input",
              strategies: [{ type: "testId", value: "password-input", priority: 1 }],
              healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.9 }
            },
            value: "${password}"
          }
        },
        {
          id: uuid(),
          type: "click",
          description: "Click login",
          continueOnError: false,
          config: {
            locator: {
              displayName: "Login Button",
              strategies: [{ type: "testId", value: "login-button", priority: 1 }],
              healing: { enabled: true, autoApprove: false, confidenceThreshold: 0.9 }
            }
          }
        },
      ],
    };

    const component = await db.createComponent(data);

    expect(component.id).toBeDefined();
    expect(component.name).toBe(data.name);
    expect(component.description).toBe(data.description);
    expect(component.type).toBe(data.type);
    expect(component.parameters).toEqual(data.parameters);
    expect(component.steps).toHaveLength(3);
  });

  it("should get a component by id", async () => {
    const created = await db.createComponent({
      name: "Test Component",
      type: "flow",
      parameters: [],
      steps: [],
    });

    const retrieved = await db.getComponent(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(created.id);
  });

  it("should get all components", async () => {
    await db.createComponent({ name: "Comp 1", type: "flow", parameters: [], steps: [] });
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.createComponent({ name: "Comp 2", type: "assertion", parameters: [], steps: [] });

    const components = await db.getAllComponents();

    expect(components).toHaveLength(2);
    expect(components[0].name).toBe("Comp 2");
    expect(components[1].name).toBe("Comp 1");
  });

  it("should update component fields", async () => {
    const created = await db.createComponent({
      name: "Original",
      type: "flow",
      parameters: [],
      steps: [],
    });

    const updated = await db.updateComponent(created.id, {
      name: "Updated Component",
      description: "New description",
      parameters: [{ name: "param1", type: "string", required: false }],
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated Component");
    expect(updated!.description).toBe("New description");
    expect(updated!.parameters).toHaveLength(1);
  });

  it("should delete a component", async () => {
    const created = await db.createComponent({
      name: "To Delete",
      type: "flow",
      parameters: [],
      steps: [],
    });

    const deleted = await db.deleteComponent(created.id);
    expect(deleted).toBe(true);

    const retrieved = await db.getComponent(created.id);
    expect(retrieved).toBeUndefined();
  });

  it("should track component usage in scenarios", async () => {
    const component = await db.createComponent({
      name: "Shared Component",
      type: "flow",
      parameters: [],
      steps: [],
    });

    const service = await db.createService({
      name: "Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    const feature = await db.createFeature({
      serviceId: service.id,
      name: "Feature",
      owners: [],
    });

    // Create scenarios using this component
    const scenario1 = await db.createScenario({
      featureId: feature.id,
      name: "Scenario 1",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [
        { id: uuid(), type: "component", description: "Use component", continueOnError: false, config: { componentId: component.id, parameters: {} } },
        { id: uuid(), type: "navigate", description: "Navigate", continueOnError: false, config: { url: "https://test.com" } },
      ],
    });

    const scenario2 = await db.createScenario({
      featureId: feature.id,
      name: "Scenario 2",
      tags: [],
      priority: "low",
      variables: [],
      steps: [
        { id: uuid(), type: "navigate", description: "Navigate", continueOnError: false, config: { url: "https://test.com" } },
        { id: uuid(), type: "component", description: "Use component", continueOnError: false, config: { componentId: component.id, parameters: {} } },
        { id: uuid(), type: "component", description: "Use component", continueOnError: false, config: { componentId: component.id, parameters: {} } },
      ],
    });

    const usages = await db.getComponentUsages(component.id);

    expect(usages).toHaveLength(2);

    const usage1 = usages.find((u) => u.scenarioId === scenario1.id);
    expect(usage1).toBeDefined();
    expect(usage1!.stepIndices).toEqual([0]); // first step

    const usage2 = usages.find((u) => u.scenarioId === scenario2.id);
    expect(usage2).toBeDefined();
    expect(usage2!.stepIndices).toEqual([1, 2]); // second and third steps
  });

  it("should return empty array for component with no usages", async () => {
    const component = await db.createComponent({
      name: "Unused Component",
      type: "flow",
      parameters: [],
      steps: [],
    });

    const usages = await db.getComponentUsages(component.id);

    expect(usages).toEqual([]);
  });

  it("should skip component steps referencing non-existent component IDs", async () => {
    const service = await db.createService({ name: "S", baseUrl: "https://t.com", defaultTimeout: 30000 });
    const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });

    const nonExistentId = uuid();
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Scenario with ghost component",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [
        { id: uuid(), type: "component", description: "Missing", continueOnError: false, config: { componentId: nonExistentId, parameters: {} } },
      ],
    });

    // component_usages should not have been inserted (FK would fail)
    const usages = await db.getComponentUsages(nonExistentId);
    expect(usages).toEqual([]);
  });

  it("should handle mixed valid and invalid component IDs in one scenario", async () => {
    const service = await db.createService({ name: "S", baseUrl: "https://t.com", defaultTimeout: 30000 });
    const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });

    const validComponent = await db.createComponent({ name: "Valid", type: "flow", parameters: [], steps: [] });
    const ghostId = uuid();

    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Mixed scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [
        { id: uuid(), type: "component", description: "Valid", continueOnError: false, config: { componentId: validComponent.id, parameters: {} } },
        { id: uuid(), type: "component", description: "Ghost", continueOnError: false, config: { componentId: ghostId, parameters: {} } },
        { id: uuid(), type: "component", description: "Valid again", continueOnError: false, config: { componentId: validComponent.id, parameters: {} } },
      ],
    });

    const usages = await db.getComponentUsages(validComponent.id);
    expect(usages).toHaveLength(1);
    expect(usages[0].scenarioId).toBe(scenario.id);
    expect(usages[0].stepIndices).toEqual([0, 2]);

    const ghostUsages = await db.getComponentUsages(ghostId);
    expect(ghostUsages).toEqual([]);
  });

  it("should update component usages when scenario steps are updated", async () => {
    const service = await db.createService({ name: "S", baseUrl: "https://t.com", defaultTimeout: 30000 });
    const feature = await db.createFeature({ serviceId: service.id, name: "F", owners: [] });

    const comp1 = await db.createComponent({ name: "Comp1", type: "flow", parameters: [], steps: [] });
    const comp2 = await db.createComponent({ name: "Comp2", type: "flow", parameters: [], steps: [] });

    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Updateable Scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [
        { id: uuid(), type: "component", description: "C1", continueOnError: false, config: { componentId: comp1.id, parameters: {} } },
      ],
    });

    let usages1 = await db.getComponentUsages(comp1.id);
    expect(usages1[0].stepIndices).toEqual([0]);

    // Update scenario steps to use comp2 instead
    await db.updateScenario(scenario.id, {
      steps: [
        { id: uuid(), type: "component", description: "C2", continueOnError: false, config: { componentId: comp2.id, parameters: {} } },
      ],
    });

    usages1 = await db.getComponentUsages(comp1.id);
    expect(usages1).toEqual([]);

    const usages2 = await db.getComponentUsages(comp2.id);
    expect(usages2).toHaveLength(1);
    expect(usages2[0].stepIndices).toEqual([0]);
  });
});

// ============================================
// Test Runs
// ============================================

describe("DuckDBDatabase - Test Runs", () => {
  let scenarioId: string;

  beforeEach(async () => {
    const service = await db.createService({
      name: "Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    const feature = await db.createFeature({
      serviceId: service.id,
      name: "Feature",
      owners: [],
    });
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Test Scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    });
    scenarioId = scenario.id;
  });

  it("should create a test run", async () => {
    const run: TestRun = {
      id: uuid(),
      scenarioId,
      status: "running",
      startedAt: new Date(),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    const created = await db.createTestRun(run);

    expect(created.id).toBe(run.id);
    expect(created.scenarioId).toBe(scenarioId);
    expect(created.status).toBe("running");
  });

  it("should get a test run by id", async () => {
    const run: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      startedAt: new Date(),
      finishedAt: new Date(),
      duration: 1500,
      environment: { baseUrl: "https://example.com", variables: {} },
      summary: { totalSteps: 5, passedSteps: 5, failedSteps: 0, skippedSteps: 0, healedSteps: 0 },
      createdAt: new Date(),
    };

    await db.createTestRun(run);
    const retrieved = await db.getTestRun(run.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(run.id);
    expect(retrieved!.duration).toBe(1500);
    expect(retrieved!.summary).toEqual({ totalSteps: 5, passedSteps: 5, failedSteps: 0, skippedSteps: 0, healedSteps: 0 });
  });

  it("should get test runs by scenario", async () => {
    const run1: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run1);
    // Add delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const run2: TestRun = {
      id: uuid(),
      scenarioId,
      status: "failed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run2);

    const runs = await db.getTestRunsByScenario(scenarioId);

    expect(runs).toHaveLength(2);
    expect(runs[0].status).toBe("failed"); // reverse chronological
    expect(runs[1].status).toBe("passed");
  });

  it("should get all test runs with scenario names", async () => {
    const run: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run);

    const runs = await db.getAllTestRuns(50);

    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs[0].scenarioName).toBe("Test Scenario");
  });

  it("should filter getAllTestRuns by scenarioId", async () => {
    const run1: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    // Get featureId from existing scenario to create a sibling scenario
    const existingScenario = await db.getScenario(scenarioId);
    const otherScenario = await db.createScenario({
      featureId: existingScenario!.featureId,
      name: "Other Scenario",
      steps: [],
      variables: [],
      tags: [],
      priority: "medium",
    });
    const run2: TestRun = {
      id: uuid(),
      scenarioId: otherScenario.id,
      status: "failed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run1);
    await db.createTestRun(run2);

    const filtered = await db.getAllTestRuns(50, { scenarioId });

    expect(filtered.length).toBe(1);
    expect(filtered[0].scenarioId).toBe(scenarioId);
  });

  it("should filter getAllTestRuns by status", async () => {
    const passedRun: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };
    const failedRun: TestRun = {
      id: uuid(),
      scenarioId,
      status: "failed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(passedRun);
    await db.createTestRun(failedRun);

    const passed = await db.getAllTestRuns(50, { status: "passed" });
    const failed = await db.getAllTestRuns(50, { status: "failed" });

    expect(passed.every((r) => r.status === "passed")).toBe(true);
    expect(failed.every((r) => r.status === "failed")).toBe(true);
    expect(passed.length).toBeGreaterThanOrEqual(1);
    expect(failed.length).toBeGreaterThanOrEqual(1);
  });

  it("should combine scenarioId and status filters in getAllTestRuns", async () => {
    const run1: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };
    const run2: TestRun = {
      id: uuid(),
      scenarioId,
      status: "failed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run1);
    await db.createTestRun(run2);

    const filtered = await db.getAllTestRuns(50, { scenarioId, status: "passed" });

    expect(filtered.every((r) => r.scenarioId === scenarioId && r.status === "passed")).toBe(true);
    expect(filtered.length).toBe(1);
  });

  it("getAllTestRuns returns all runs when no filters given", async () => {
    const r1: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };
    const r2: TestRun = {
      id: uuid(),
      scenarioId,
      status: "failed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(r1);
    await db.createTestRun(r2);

    const all = await db.getAllTestRuns(50);
    expect(all.length).toBe(2);
  });

  it("should filter getAllTestRuns by featureId", async () => {
    // Create a second feature with its own scenario and run
    const svc = await db.createService({ name: "Svc2", baseUrl: "https://svc2.com", defaultTimeout: 30000 });
    const featureA = await db.createFeature({ serviceId: svc.id, name: "Feature A", owners: [] });
    const featureB = await db.createFeature({ serviceId: svc.id, name: "Feature B", owners: [] });

    const scenarioA = await db.createScenario({ featureId: featureA.id, name: "Scenario A", tags: [], priority: "medium", variables: [], steps: [] });
    const scenarioB = await db.createScenario({ featureId: featureB.id, name: "Scenario B", tags: [], priority: "medium", variables: [], steps: [] });

    const runA: TestRun = { id: uuid(), scenarioId: scenarioA.id, status: "passed", environment: { baseUrl: "https://svc2.com", variables: {} }, createdAt: new Date() };
    const runB: TestRun = { id: uuid(), scenarioId: scenarioB.id, status: "failed", environment: { baseUrl: "https://svc2.com", variables: {} }, createdAt: new Date() };
    await db.createTestRun(runA);
    await db.createTestRun(runB);

    const filtered = await db.getAllTestRuns(50, { featureId: featureA.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(runA.id);
    expect(filtered[0].scenarioId).toBe(scenarioA.id);
  });

  it("should filter getAllTestRuns by serviceId", async () => {
    const svc1 = await db.createService({ name: "ServiceX", baseUrl: "https://svcx.com", defaultTimeout: 30000 });
    const svc2 = await db.createService({ name: "ServiceY", baseUrl: "https://svcy.com", defaultTimeout: 30000 });

    const feat1 = await db.createFeature({ serviceId: svc1.id, name: "Feat1", owners: [] });
    const feat2 = await db.createFeature({ serviceId: svc2.id, name: "Feat2", owners: [] });

    const s1 = await db.createScenario({ featureId: feat1.id, name: "S1", tags: [], priority: "medium", variables: [], steps: [] });
    const s2 = await db.createScenario({ featureId: feat2.id, name: "S2", tags: [], priority: "medium", variables: [], steps: [] });

    const run1: TestRun = { id: uuid(), scenarioId: s1.id, status: "passed", environment: { baseUrl: "https://svcx.com", variables: {} }, createdAt: new Date() };
    const run2: TestRun = { id: uuid(), scenarioId: s2.id, status: "passed", environment: { baseUrl: "https://svcy.com", variables: {} }, createdAt: new Date() };
    await db.createTestRun(run1);
    await db.createTestRun(run2);

    const filtered = await db.getAllTestRuns(50, { serviceId: svc1.id });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(run1.id);
  });

  it("should return empty when featureId has no matching runs", async () => {
    const svc = await db.createService({ name: "SvcEmpty", baseUrl: "https://empty.com", defaultTimeout: 30000 });
    const feat = await db.createFeature({ serviceId: svc.id, name: "Empty Feature", owners: [] });

    const result = await db.getAllTestRuns(50, { featureId: feat.id });
    expect(result).toEqual([]);
  });

  it("getAllTestRuns offset skips the first N results", async () => {
    const run1: TestRun = {
      id: uuid(), scenarioId, status: "passed",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date("2024-01-01T10:00:00Z"),
    };
    const run2: TestRun = {
      id: uuid(), scenarioId, status: "passed",
      startedAt: new Date("2024-01-01T11:00:00Z"),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date("2024-01-01T11:00:00Z"),
    };
    const run3: TestRun = {
      id: uuid(), scenarioId, status: "passed",
      startedAt: new Date("2024-01-01T12:00:00Z"),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date("2024-01-01T12:00:00Z"),
    };
    await db.createTestRun(run1);
    await db.createTestRun(run2);
    await db.createTestRun(run3);

    // Without offset: newest first (run3, run2, run1)
    const all = await db.getAllTestRuns(10, {}, 0);
    const allIds = all.map((r) => r.id);
    expect(allIds).toContain(run3.id);

    // Offset 1: skip newest, next two (run2, run1 order)
    const paged = await db.getAllTestRuns(2, {}, 1);
    expect(paged).toHaveLength(2);
    expect(paged[0].id).toBe(run2.id);
    expect(paged[1].id).toBe(run1.id);
  });

  it("getAllTestRuns offset beyond result count returns empty", async () => {
    const run: TestRun = {
      id: uuid(), scenarioId, status: "passed",
      startedAt: new Date(),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };
    await db.createTestRun(run);

    const result = await db.getAllTestRuns(10, {}, 999);
    expect(result).toEqual([]);
  });

  it("getAllTestRuns invalid offset falls back to 0", async () => {
    const run: TestRun = {
      id: uuid(), scenarioId, status: "passed",
      startedAt: new Date(),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };
    await db.createTestRun(run);

    const result = await db.getAllTestRuns(10, {}, -5);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should update test run status and summary", async () => {
    const run: TestRun = {
      id: uuid(),
      scenarioId,
      status: "running",
      startedAt: new Date(),
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run);

    const finishedAt = new Date();
    const updated = await db.updateTestRun(run.id, {
      status: "passed",
      finishedAt,
      duration: 2000,
      summary: { totalSteps: 11, passedSteps: 10, failedSteps: 0, skippedSteps: 1, healedSteps: 0 },
    });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("passed");
    expect(updated!.duration).toBe(2000);
    expect(updated!.summary).toEqual({ totalSteps: 11, passedSteps: 10, failedSteps: 0, skippedSteps: 1, healedSteps: 0 });
  });

  it("should return undefined when updating non-existent run", async () => {
    const result = await db.updateTestRun("non-existent-id", {
      status: "passed",
    });
    expect(result).toBeUndefined();
  });

  it("should get dashboard runs within time window", async () => {
    const run: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run);

    const dashboardRuns = await db.getDashboardRuns(24);

    expect(dashboardRuns.length).toBeGreaterThanOrEqual(1);
    expect(dashboardRuns[0].scenarioName).toBeDefined();
  });

  it("should exclude runs older than the time window", async () => {
    const recentRun: TestRun = {
      id: uuid(),
      scenarioId,
      status: "passed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    const oldRun: TestRun = {
      id: uuid(),
      scenarioId,
      status: "failed",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h ago
    };

    await db.createTestRun(recentRun);
    await db.createTestRun(oldRun);

    const dashboardRuns = await db.getDashboardRuns(24);

    const ids = dashboardRuns.map((r) => r.id);
    expect(ids).toContain(recentRun.id);
    expect(ids).not.toContain(oldRun.id);
  });
});

// ============================================
// Step Results
// ============================================

describe("DuckDBDatabase - Step Results", () => {
  let runId: string;

  beforeEach(async () => {
    const service = await db.createService({
      name: "Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    const feature = await db.createFeature({
      serviceId: service.id,
      name: "Feature",
      owners: [],
    });
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    });

    const run: TestRun = {
      id: uuid(),
      scenarioId: scenario.id,
      status: "running",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run);
    runId = run.id;
  });

  it("should create a step result", async () => {
    const result: StepResult = {
      id: uuid(),
      runId,
      stepId: uuid(),
      stepIndex: 0,
      status: "passed",
      duration: 150,
      createdAt: new Date(),
    };

    const created = await db.createStepResult(result);

    expect(created.id).toBe(result.id);
    expect(created.runId).toBe(runId);
    expect(created.stepIndex).toBe(0);
    expect(created.status).toBe("passed");
  });

  it("should create a step result with error", async () => {
    const result: StepResult = {
      id: uuid(),
      runId,
      stepId: uuid(),
      stepIndex: 1,
      status: "failed",
      duration: 200,
      error: {
        message: "Element not found",
        stack: "Error: Element not found\n  at ...",
      },
      createdAt: new Date(),
    };

    const created = await db.createStepResult(result);

    expect(created.error).toBeDefined();
    expect(created.error!.message).toBe("Element not found");
  });

  it("should create a step result with healing info", async () => {
    const result: StepResult = {
      id: uuid(),
      runId,
      stepId: uuid(),
      stepIndex: 2,
      status: "passed",
      duration: 180,
      healing: {
        originalStrategy: { type: "testId", value: "old-id", priority: 1 },
        usedStrategy: { type: "role", role: "button", name: "Submit", priority: 2 },
        confidence: 0.95,
      },
      createdAt: new Date(),
    };

    const created = await db.createStepResult(result);

    expect(created.healing).toBeDefined();
    expect(created.healing!.confidence).toBe(0.95);
  });

  it("should get step results by run ordered by step index", async () => {
    const step1: StepResult = {
      id: uuid(),
      runId,
      stepId: uuid(),
      stepIndex: 2,
      status: "passed",
      duration: 100,
      createdAt: new Date(),
    };

    const step2: StepResult = {
      id: uuid(),
      runId,
      stepId: uuid(),
      stepIndex: 0,
      status: "passed",
      duration: 150,
      createdAt: new Date(),
    };

    const step3: StepResult = {
      id: uuid(),
      runId,
      stepId: uuid(),
      stepIndex: 1,
      status: "failed",
      duration: 200,
      createdAt: new Date(),
    };

    await db.createStepResult(step1);
    await db.createStepResult(step2);
    await db.createStepResult(step3);

    const results = await db.getStepResultsByRun(runId);

    expect(results).toHaveLength(3);
    // Should be ordered by step_index
    expect(results[0].stepIndex).toBe(0);
    expect(results[1].stepIndex).toBe(1);
    expect(results[2].stepIndex).toBe(2);
  });
});

// ============================================
// Healing Records
// ============================================

describe("DuckDBDatabase - Healing Records", () => {
  let scenarioId: string;
  let runId: string;

  beforeEach(async () => {
    const service = await db.createService({
      name: "Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    const feature = await db.createFeature({
      serviceId: service.id,
      name: "Feature",
      owners: [],
    });
    const scenario = await db.createScenario({
      featureId: feature.id,
      name: "Scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
    });
    scenarioId = scenario.id;

    const run: TestRun = {
      id: uuid(),
      scenarioId: scenario.id,
      status: "running",
      environment: { baseUrl: "https://example.com", variables: {} },
      createdAt: new Date(),
    };

    await db.createTestRun(run);
    runId = run.id;
  });

  it("should create a healing record", async () => {
    const record: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Submit Button",
      originalStrategy: { type: "testId", value: "submit-btn", priority: 1 },
      healedStrategy: { type: "role", role: "button", name: "Submit", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.92,
      status: "pending",
      createdAt: new Date(),
    };

    const created = await db.createHealingRecord(record);

    expect(created.id).toBe(record.id);
    expect(created.locatorDisplayName).toBe("Submit Button");
    expect(created.confidence).toBe(0.92);
    expect(created.status).toBe("pending");
  });

  it("should get a healing record by id", async () => {
    const record: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Login Button",
      originalStrategy: { type: "testId", value: "login", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.88,
      status: "pending",
      createdAt: new Date(),
    };

    await db.createHealingRecord(record);
    const retrieved = await db.getHealingRecord(record.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(record.id);
    expect(retrieved!.locatorDisplayName).toBe("Login Button");
  });

  it("should get all healing records ordered by creation date", async () => {
    const record1: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Button 1",
      originalStrategy: { type: "testId", value: "btn1", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.9,
      status: "pending",
      createdAt: new Date(),
    };

    await db.createHealingRecord(record1);
    // Add delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const record2: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Button 2",
      originalStrategy: { type: "testId", value: "btn2", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.85,
      status: "approved",
      createdAt: new Date(),
    };

    await db.createHealingRecord(record2);

    const records = await db.getAllHealingRecords();

    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(records[0].locatorDisplayName).toBe("Button 2"); // reverse chronological
  });

  it("should get only pending healing records", async () => {
    const pending: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Pending",
      originalStrategy: { type: "testId", value: "p", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.9,
      status: "pending",
      createdAt: new Date(),
    };

    const approved: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Approved",
      originalStrategy: { type: "testId", value: "a", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.95,
      status: "approved",
      reviewedBy: "admin@test.com",
      reviewedAt: new Date(),
      createdAt: new Date(),
    };

    await db.createHealingRecord(pending);
    await db.createHealingRecord(approved);

    const pendingRecords = await db.getPendingHealingRecords();

    expect(pendingRecords.length).toBeGreaterThanOrEqual(1);
    expect(pendingRecords.every((r) => r.status === "pending")).toBe(true);
  });

  it("should update healing record status", async () => {
    const record: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Test Button",
      originalStrategy: { type: "testId", value: "test", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.9,
      status: "pending",
      createdAt: new Date(),
    };

    await db.createHealingRecord(record);

    const reviewedAt = new Date();
    const updated = await db.updateHealingRecord(record.id, {
      status: "approved",
      reviewedBy: "admin@test.com",
      reviewedAt,
      reviewNote: "Looks good",
    });

    expect(updated).toBeDefined();
    expect(updated!.status).toBe("approved");
    expect(updated!.reviewedBy).toBe("admin@test.com");
    expect(updated!.reviewNote).toBe("Looks good");
  });

  it("should update healing record with propagation info", async () => {
    const record: HealingRecord = {
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: "Propagated Button",
      originalStrategy: { type: "testId", value: "prop", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.95,
      status: "approved",
      createdAt: new Date(),
    };

    await db.createHealingRecord(record);

    const updated = await db.updateHealingRecord(record.id, {
      propagatedTo: ["scenario-1", "scenario-2", "scenario-3"],
    });

    expect(updated).toBeDefined();
    expect(Array.isArray(updated!.propagatedTo)).toBe(true);
    expect(updated!.propagatedTo).toHaveLength(3);
    expect(updated!.propagatedTo).toContain("scenario-1");
    expect(updated!.propagatedTo).toContain("scenario-2");
    expect(updated!.propagatedTo).toContain("scenario-3");
  });

  it("should get healing statistics", async () => {
    const records: HealingRecord[] = [
      {
        id: uuid(),
        scenarioId,
        stepId: uuid(),
        runId,
        locatorDisplayName: "Pending",
        originalStrategy: { type: "testId", value: "p1", priority: 1 },
        healedStrategy: { type: "role", role: "button", priority: 2 },
        trigger: "element_not_found",
        confidence: 0.9,
        status: "pending",
        createdAt: new Date(),
      },
      {
        id: uuid(),
        scenarioId,
        stepId: uuid(),
        runId,
        locatorDisplayName: "Approved",
        originalStrategy: { type: "testId", value: "a1", priority: 1 },
        healedStrategy: { type: "role", role: "button", priority: 2 },
        trigger: "element_not_found",
        confidence: 0.95,
        status: "approved",
        createdAt: new Date(),
      },
      {
        id: uuid(),
        scenarioId,
        stepId: uuid(),
        runId,
        locatorDisplayName: "Rejected",
        originalStrategy: { type: "testId", value: "r1", priority: 1 },
        healedStrategy: { type: "role", role: "button", priority: 2 },
        trigger: "element_not_found",
        confidence: 0.6,
        status: "rejected",
        createdAt: new Date(),
      },
      {
        id: uuid(),
        scenarioId,
        stepId: uuid(),
        runId,
        locatorDisplayName: "Auto Approved",
        originalStrategy: { type: "testId", value: "aa1", priority: 1 },
        healedStrategy: { type: "role", role: "button", priority: 2 },
        trigger: "element_not_found",
        confidence: 0.98,
        status: "auto_approved",
        createdAt: new Date(),
      },
    ];

    for (const record of records) {
      await db.createHealingRecord(record);
    }

    const stats = await db.getHealingStats();

    expect(stats.total).toBeGreaterThanOrEqual(4);
    expect(stats.pending).toBeGreaterThanOrEqual(1);
    expect(stats.approved).toBeGreaterThanOrEqual(1);
    expect(stats.rejected).toBeGreaterThanOrEqual(1);
    expect(stats.autoApproved).toBeGreaterThanOrEqual(1);
  });

  it("should filter healing records by status using getHealingRecordsByStatus", async () => {
    const makeRecord = (status: string): HealingRecord => ({
      id: uuid(),
      scenarioId,
      stepId: uuid(),
      runId,
      locatorDisplayName: `Button ${status}`,
      originalStrategy: { type: "testId", value: "old", priority: 1 },
      healedStrategy: { type: "role", role: "button", priority: 2 },
      trigger: "element_not_found",
      confidence: 0.9,
      status: status as any,
      createdAt: new Date(),
    });

    await db.createHealingRecord(makeRecord("pending"));
    await db.createHealingRecord(makeRecord("pending"));
    await db.createHealingRecord(makeRecord("approved"));
    await db.createHealingRecord(makeRecord("rejected"));

    const pending = await db.getHealingRecordsByStatus("pending");
    expect(pending).toHaveLength(2);
    expect(pending.every((r) => r.status === "pending")).toBe(true);

    const approved = await db.getHealingRecordsByStatus("approved");
    expect(approved).toHaveLength(1);
    expect(approved[0].status).toBe("approved");

    const rejected = await db.getHealingRecordsByStatus("rejected");
    expect(rejected).toHaveLength(1);
  });

  it("should return empty array for status with no matching records", async () => {
    const records = await db.getHealingRecordsByStatus("auto_approved");
    expect(records).toEqual([]);
  });
});

// ============================================
// Element Registry
// ============================================

describe("DuckDBDatabase - Element Registry", () => {
  let serviceId: string;

  beforeEach(async () => {
    const service = await db.createService({
      name: "Test Service",
      baseUrl: "https://test.com",
      defaultTimeout: 30000,
    });
    serviceId = service.id;
  });

  it("should create a registry element", async () => {
    const element = await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Login Button",
      pagePattern: "/login",
      currentLocator: { type: "testId", value: "login-btn", priority: 1 },
    });

    expect(element.id).toBeDefined();
    expect(element.display_name).toBe("Login Button");
    expect(element.service_id).toBe(serviceId);
    expect(element.currentLocator).toEqual({ type: "testId", value: "login-btn", priority: 1 });
    expect(element.history).toEqual([]);
    expect(element.usedIn).toEqual([]);
  });

  it("should get a registry element by id", async () => {
    const created = await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Submit Button",
      currentLocator: { role: "button", text: "Submit" },
    });

    const retrieved = await db.getRegistryElement(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.display_name).toBe("Submit Button");
    expect(retrieved!.currentLocator).toEqual({ role: "button", text: "Submit" });
  });

  it("should get all registry elements for a service", async () => {
    await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Element 1",
      currentLocator: { type: "testId", value: "el1", priority: 1 },
    });

    await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Element 2",
      currentLocator: { type: "testId", value: "el2", priority: 1 },
    });

    const elements = await db.getAllRegistryElements(serviceId);

    expect(elements.length).toBeGreaterThanOrEqual(2);
  });

  it("should update registry element and add to history", async () => {
    const element = await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Changing Button",
      currentLocator: { type: "testId", value: "original", priority: 1 },
    });

    const updated = await db.updateRegistryElement(element.id, {
      currentLocator: { role: "button", text: "New" },
      reason: "UI redesign",
    });

    expect(updated).toBeDefined();
    expect(updated!.currentLocator).toEqual({ role: "button", text: "New" });
    expect(updated!.history).toHaveLength(1);
    expect(updated!.history[0].locator).toEqual({ type: "testId", value: "original", priority: 1 });
    expect(updated!.history[0].reason).toBe("UI redesign");
  });

  it("should add usage tracking to registry element", async () => {
    const element = await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Used Button",
      currentLocator: { type: "testId", value: "used", priority: 1 },
    });

    const usage = await db.addRegistryUsage(element.id, {
      scenarioId: "scenario-1",
      stepId: "step-1",
    });

    expect(usage.usedIn).toHaveLength(1);
    expect(usage.usedIn[0].scenarioId).toBe("scenario-1");
    expect(usage.usedIn[0].stepId).toBe("step-1");

    // Adding same usage should not duplicate
    await db.addRegistryUsage(element.id, {
      scenarioId: "scenario-1",
      stepId: "step-1",
    });

    const retrieved = await db.getRegistryElement(element.id);
    expect(retrieved!.usedIn).toHaveLength(1);

    // Adding different usage should add new entry
    await db.addRegistryUsage(element.id, {
      scenarioId: "scenario-2",
      stepId: "step-2",
    });

    const retrievedAgain = await db.getRegistryElement(element.id);
    expect(retrievedAgain!.usedIn).toHaveLength(2);
  });

  it("should delete a registry element", async () => {
    const element = await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "To Delete",
      currentLocator: { type: "testId", value: "delete-me", priority: 1 },
    });

    const deleted = await db.deleteRegistryElement(element.id);
    expect(deleted).toBe(true);

    const retrieved = await db.getRegistryElement(element.id);
    expect(retrieved).toBeUndefined();
  });

  it("should find registry element by display name", async () => {
    await db.createRegistryElement({
      id: uuid(),
      serviceId,
      displayName: "Unique Button",
      currentLocator: { type: "testId", value: "unique", priority: 1 },
    });

    const found = await db.findRegistryByName("Unique Button", serviceId);

    expect(found).toBeDefined();
    expect(found!.display_name).toBe("Unique Button");
    expect(found!.service_id).toBe(serviceId);
  });

  it("should return null when finding non-existent element by name", async () => {
    const result = await db.findRegistryByName("Non-existent", serviceId);
    expect(result).toBeNull();
  });
});

// ============================================
// Import Methods (ID-preserving)
// ============================================

describe("DuckDBDatabase - Import Methods", () => {
  it("should import service with original ID preserved", async () => {
    const originalId = uuid();
    const originalCreatedAt = new Date("2024-01-01T00:00:00Z");
    const originalUpdatedAt = new Date("2024-06-01T00:00:00Z");

    const imported = await db.importService({
      id: originalId,
      name: "Imported Service",
      description: "From backup",
      baseUrl: "https://example.com",
      defaultTimeout: 5000,
      createdAt: originalCreatedAt,
      updatedAt: originalUpdatedAt,
    });

    expect(imported.id).toBe(originalId);
    expect(imported.name).toBe("Imported Service");
    expect(imported.description).toBe("From backup");
    expect(imported.baseUrl).toBe("https://example.com");
    expect(imported.defaultTimeout).toBe(5000);

    const retrieved = await db.getService(originalId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(originalId);
  });

  it("should import feature with original ID and FK integrity preserved", async () => {
    const serviceId = uuid();
    await db.importService({
      id: serviceId,
      name: "Parent Service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const featureId = uuid();
    const imported = await db.importFeature({
      id: featureId,
      serviceId,
      name: "Imported Feature",
      description: "Feature from backup",
      owners: ["alice@example.com", "bob@example.com"],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date(),
    });

    expect(imported.id).toBe(featureId);
    expect(imported.serviceId).toBe(serviceId);
    expect(imported.name).toBe("Imported Feature");
    expect(imported.owners).toEqual(["alice@example.com", "bob@example.com"]);

    const retrieved = await db.getFeature(featureId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(featureId);
    expect(retrieved!.serviceId).toBe(serviceId);
  });

  it("should import feature with empty owners", async () => {
    const serviceId = uuid();
    await db.importService({
      id: serviceId,
      name: "Service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const featureId = uuid();
    const imported = await db.importFeature({
      id: featureId,
      serviceId,
      name: "Feature No Owners",
      owners: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(imported.id).toBe(featureId);
    expect(imported.owners).toEqual([]);
  });

  it("should import scenario with original ID and FK integrity preserved", async () => {
    const serviceId = uuid();
    await db.importService({
      id: serviceId,
      name: "Service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const featureId = uuid();
    await db.importFeature({
      id: featureId,
      serviceId,
      name: "Feature",
      owners: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const scenarioId = uuid();
    const imported = await db.importScenario({
      id: scenarioId,
      featureId,
      name: "Imported Scenario",
      description: "Scenario from backup",
      tags: ["smoke", "regression"],
      priority: "high",
      variables: [{ name: "apiUrl", type: "string", defaultValue: "https://api.example.com" }],
      steps: [],
      version: 3,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date(),
    });

    expect(imported.id).toBe(scenarioId);
    expect(imported.featureId).toBe(featureId);
    expect(imported.name).toBe("Imported Scenario");
    expect(imported.tags).toEqual(["smoke", "regression"]);
    expect(imported.priority).toBe("high");
    expect(imported.version).toBe(3);

    const retrieved = await db.getScenario(scenarioId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(scenarioId);
  });

  it("should import component with original ID preserved", async () => {
    const componentId = uuid();
    const imported = await db.importComponent({
      id: componentId,
      name: "Imported Component",
      description: "Component from backup",
      type: "flow",
      parameters: [{ name: "url", type: "string", required: true }],
      steps: [],
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date(),
    });

    expect(imported.id).toBe(componentId);
    expect(imported.name).toBe("Imported Component");
    expect(imported.type).toBe("flow");
    expect(imported.parameters).toHaveLength(1);

    const retrieved = await db.getComponent(componentId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(componentId);
  });

  it("should import a complete hierarchy and maintain FK integrity", async () => {
    const serviceId = uuid();
    const featureId = uuid();
    const scenarioId = uuid();

    await db.importService({
      id: serviceId,
      name: "Root Service",
      baseUrl: "https://example.com",
      defaultTimeout: 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.importFeature({
      id: featureId,
      serviceId,
      name: "Root Feature",
      owners: ["owner@example.com"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.importScenario({
      id: scenarioId,
      featureId,
      name: "Root Scenario",
      tags: [],
      priority: "medium",
      variables: [],
      steps: [],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const scenarios = await db.getScenariosByFeature(featureId);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].id).toBe(scenarioId);

    const features = await db.getFeaturesByService(serviceId);
    expect(features).toHaveLength(1);
    expect(features[0].id).toBe(featureId);
  });
});
