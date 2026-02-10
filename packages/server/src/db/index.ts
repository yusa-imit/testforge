import { v4 as uuid } from "uuid";
import type {
  Service,
  Feature,
  Scenario,
  Component,
  TestRun,
  StepResult,
  HealingRecord,
  CreateService,
  CreateFeature,
  CreateScenario,
  CreateComponent,
} from "@testforge/core";

/**
 * In-Memory Database
 * 
 * MVP용 간단한 인메모리 저장소.
 * Phase 2에서 DuckDB로 마이그레이션 예정.
 */
class InMemoryDB {
  private services: Map<string, Service> = new Map();
  private features: Map<string, Feature> = new Map();
  private scenarios: Map<string, Scenario> = new Map();
  private components: Map<string, Component> = new Map();
  private testRuns: Map<string, TestRun> = new Map();
  private stepResults: Map<string, StepResult> = new Map();
  private healingRecords: Map<string, HealingRecord> = new Map();

  // ============================================
  // Services
  // ============================================

  createService(data: CreateService): Service {
    const now = new Date();
    const service: Service = {
      id: uuid(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.services.set(service.id, service);
    return service;
  }

  getService(id: string): Service | undefined {
    return this.services.get(id);
  }

  getAllServices(): Service[] {
    return Array.from(this.services.values());
  }

  updateService(id: string, data: Partial<CreateService>): Service | undefined {
    const service = this.services.get(id);
    if (!service) return undefined;

    const updated: Service = {
      ...service,
      ...data,
      updatedAt: new Date(),
    };
    this.services.set(id, updated);
    return updated;
  }

  deleteService(id: string): boolean {
    return this.services.delete(id);
  }

  // ============================================
  // Features
  // ============================================

  createFeature(data: CreateFeature): Feature {
    const now = new Date();
    const feature: Feature = {
      id: uuid(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.features.set(feature.id, feature);
    return feature;
  }

  getFeature(id: string): Feature | undefined {
    return this.features.get(id);
  }

  getFeaturesByService(serviceId: string): Feature[] {
    return Array.from(this.features.values()).filter(
      (f) => f.serviceId === serviceId
    );
  }

  updateFeature(id: string, data: Partial<CreateFeature>): Feature | undefined {
    const feature = this.features.get(id);
    if (!feature) return undefined;

    const updated: Feature = {
      ...feature,
      ...data,
      updatedAt: new Date(),
    };
    this.features.set(id, updated);
    return updated;
  }

  deleteFeature(id: string): boolean {
    return this.features.delete(id);
  }

  // ============================================
  // Scenarios
  // ============================================

  createScenario(data: CreateScenario): Scenario {
    const now = new Date();
    const scenario: Scenario = {
      id: uuid(),
      ...data,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  getScenario(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  getScenariosByFeature(featureId: string): Scenario[] {
    return Array.from(this.scenarios.values()).filter(
      (s) => s.featureId === featureId
    );
  }

  getAllScenarios(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  updateScenario(
    id: string,
    data: Partial<CreateScenario>
  ): Scenario | undefined {
    const scenario = this.scenarios.get(id);
    if (!scenario) return undefined;

    const updated: Scenario = {
      ...scenario,
      ...data,
      version: scenario.version + 1,
      updatedAt: new Date(),
    };
    this.scenarios.set(id, updated);
    return updated;
  }

  deleteScenario(id: string): boolean {
    return this.scenarios.delete(id);
  }

  duplicateScenario(id: string): Scenario | undefined {
    const original = this.scenarios.get(id);
    if (!original) return undefined;

    const duplicated: Scenario = {
      ...original,
      id: uuid(),
      name: `${original.name} (복사본)`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.scenarios.set(duplicated.id, duplicated);
    return duplicated;
  }

  // ============================================
  // Components
  // ============================================

  createComponent(data: CreateComponent): Component {
    const now = new Date();
    const component: Component = {
      id: uuid(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.components.set(component.id, component);
    return component;
  }

  getComponent(id: string): Component | undefined {
    return this.components.get(id);
  }

  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  updateComponent(
    id: string,
    data: Partial<CreateComponent>
  ): Component | undefined {
    const component = this.components.get(id);
    if (!component) return undefined;

    const updated: Component = {
      ...component,
      ...data,
      updatedAt: new Date(),
    };
    this.components.set(id, updated);
    return updated;
  }

  deleteComponent(id: string): boolean {
    return this.components.delete(id);
  }

  getComponentUsages(componentId: string): { scenarioId: string; stepIndices: number[] }[] {
    const usages: { scenarioId: string; stepIndices: number[] }[] = [];

    for (const scenario of this.scenarios.values()) {
      const indices: number[] = [];
      scenario.steps.forEach((step, index) => {
        if (
          step.type === "component" &&
          (step.config as { componentId: string }).componentId === componentId
        ) {
          indices.push(index);
        }
      });
      if (indices.length > 0) {
        usages.push({ scenarioId: scenario.id, stepIndices: indices });
      }
    }

    return usages;
  }

  // ============================================
  // Test Runs
  // ============================================

  createTestRun(run: TestRun): TestRun {
    this.testRuns.set(run.id, run);
    return run;
  }

  getTestRun(id: string): TestRun | undefined {
    return this.testRuns.get(id);
  }

  getTestRunsByScenario(scenarioId: string): TestRun[] {
    return Array.from(this.testRuns.values())
      .filter((r) => r.scenarioId === scenarioId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAllTestRuns(limit = 50): TestRun[] {
    return Array.from(this.testRuns.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  updateTestRun(id: string, data: Partial<TestRun>): TestRun | undefined {
    const run = this.testRuns.get(id);
    if (!run) return undefined;

    const updated: TestRun = { ...run, ...data };
    this.testRuns.set(id, updated);
    return updated;
  }

  // ============================================
  // Step Results
  // ============================================

  createStepResult(result: StepResult): StepResult {
    this.stepResults.set(result.id, result);
    return result;
  }

  getStepResultsByRun(runId: string): StepResult[] {
    return Array.from(this.stepResults.values())
      .filter((r) => r.runId === runId)
      .sort((a, b) => a.stepIndex - b.stepIndex);
  }

  // ============================================
  // Healing Records
  // ============================================

  createHealingRecord(record: HealingRecord): HealingRecord {
    this.healingRecords.set(record.id, record);
    return record;
  }

  getHealingRecord(id: string): HealingRecord | undefined {
    return this.healingRecords.get(id);
  }

  getAllHealingRecords(): HealingRecord[] {
    return Array.from(this.healingRecords.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getPendingHealingRecords(): HealingRecord[] {
    return this.getAllHealingRecords().filter((r) => r.status === "pending");
  }

  updateHealingRecord(
    id: string,
    data: Partial<HealingRecord>
  ): HealingRecord | undefined {
    const record = this.healingRecords.get(id);
    if (!record) return undefined;

    const updated: HealingRecord = { ...record, ...data };
    this.healingRecords.set(id, updated);
    return updated;
  }

  getHealingStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    autoApproved: number;
  } {
    const records = this.getAllHealingRecords();
    return {
      total: records.length,
      pending: records.filter((r) => r.status === "pending").length,
      approved: records.filter((r) => r.status === "approved").length,
      rejected: records.filter((r) => r.status === "rejected").length,
      autoApproved: records.filter((r) => r.status === "auto_approved").length,
    };
  }
}

export const db = new InMemoryDB();
