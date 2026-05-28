/**
 * DuckDB Database Implementation
 *
 * Replaces the in-memory Map storage with DuckDB persistence.
 * Uses DuckDB's JSON support for complex nested data structures.
 */

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
import { DuckDBConnection } from "./connection";

export interface ScenarioWithLastRun extends Scenario {
  lastRunId: string | null;
  lastRunStatus: string | null;
  lastRunAt: Date | null;
}

/**
 * Database row to entity converters
 */
class RowConverter {
  /**
   * Convert database row to Service entity
   */
  static toService(row: any): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      baseUrl: row.base_url,
      defaultTimeout: row.default_timeout,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Convert database row to Feature entity
   */
  static toFeature(row: any): Feature {
    return {
      id: row.id,
      serviceId: row.service_id,
      name: row.name,
      description: row.description,
      owners: row.owners || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Convert database row to Scenario entity
   */
  static toScenario(row: any): Scenario {
    return {
      id: row.id,
      featureId: row.feature_id,
      name: row.name,
      description: row.description,
      tags: row.tags || [],
      priority: row.priority,
      variables: typeof row.variables === "string" ? JSON.parse(row.variables) : row.variables,
      steps: typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps,
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toScenarioWithLastRun(row: any): ScenarioWithLastRun {
    return {
      ...RowConverter.toScenario(row),
      lastRunId: row.last_run_id ?? null,
      lastRunStatus: row.last_run_status ?? null,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
    };
  }

  /**
   * Convert database row to Component entity
   */
  static toComponent(row: any): Component {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      parameters: typeof row.parameters === "string" ? JSON.parse(row.parameters) : row.parameters,
      steps: typeof row.steps === "string" ? JSON.parse(row.steps) : row.steps,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Convert database row to TestRun entity
   */
  static toTestRun(row: any): TestRun {
    return {
      id: row.id,
      scenarioId: row.scenario_id,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
      duration: row.duration,
      environment: typeof row.environment === "string" ? JSON.parse(row.environment) : row.environment,
      summary: row.summary ? (typeof row.summary === "string" ? JSON.parse(row.summary) : row.summary) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Convert database row to StepResult entity
   */
  static toStepResult(row: any): StepResult {
    return {
      id: row.id,
      runId: row.run_id,
      stepId: row.step_id,
      stepIndex: row.step_index,
      status: row.status,
      duration: row.duration,
      error: row.error ? (typeof row.error === "string" ? JSON.parse(row.error) : row.error) : undefined,
      healing: row.healing ? (typeof row.healing === "string" ? JSON.parse(row.healing) : row.healing) : undefined,
      context: row.context ? (typeof row.context === "string" ? JSON.parse(row.context) : row.context) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Convert database row to HealingRecord entity
   */
  static toHealingRecord(row: any): HealingRecord {
    return {
      id: row.id,
      scenarioId: row.scenario_id,
      stepId: row.step_id,
      runId: row.run_id,
      locatorDisplayName: row.locator_display_name,
      originalStrategy: typeof row.original_strategy === "string" ? JSON.parse(row.original_strategy) : row.original_strategy,
      healedStrategy: typeof row.healed_strategy === "string" ? JSON.parse(row.healed_strategy) : row.healed_strategy,
      trigger: row.trigger,
      confidence: row.confidence,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      reviewNote: row.review_note,
      propagatedTo: row.propagated_to || [],
      createdAt: new Date(row.created_at),
    };
  }
}

/**
 * DuckDB Database Class
 *
 * Provides CRUD operations for all entities with DuckDB persistence.
 */
export class DuckDBDatabase {
  constructor(private db: DuckDBConnection) {}

  /**
   * Close database connection
   * Used for graceful shutdown
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  // ============================================
  // Services
  // ============================================

  async createService(data: CreateService): Promise<Service> {
    const id = uuid();
    const now = new Date();

    await this.db.run(
      `INSERT INTO services (id, name, description, base_url, default_timeout, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.description ?? null, data.baseUrl, data.defaultTimeout ?? 30000, now, now]
    );

    const row = await this.db.get("SELECT * FROM services WHERE id = ?", [id]);
    return RowConverter.toService(row);
  }

  async getService(id: string): Promise<Service | undefined> {
    const row = await this.db.get("SELECT * FROM services WHERE id = ?", [id]);
    return row ? RowConverter.toService(row) : undefined;
  }

  async getAllServices(): Promise<Service[]> {
    const rows = await this.db.all("SELECT * FROM services ORDER BY created_at DESC");
    return rows.map(RowConverter.toService);
  }

  async updateService(id: string, data: Partial<CreateService>): Promise<Service | undefined> {
    const existing = await this.getService(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.baseUrl !== undefined) {
      updates.push("base_url = ?");
      params.push(data.baseUrl);
    }
    if (data.defaultTimeout !== undefined) {
      updates.push("default_timeout = ?");
      params.push(data.defaultTimeout);
    }

    updates.push("updated_at = ?");
    params.push(new Date());

    params.push(id);

    await this.db.run(
      `UPDATE services SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return this.getService(id);
  }

  async deleteService(id: string): Promise<boolean> {
    const existing = await this.getService(id);
    if (!existing) return false;
    await this.db.run("DELETE FROM services WHERE id = ?", [id]);
    return true;
  }

  async importService(data: Service): Promise<Service> {
    await this.db.run(
      `INSERT INTO services (id, name, description, base_url, default_timeout, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.name, data.description ?? null, data.baseUrl, data.defaultTimeout ?? 30000,
       new Date(data.createdAt), new Date(data.updatedAt)]
    );
    const row = await this.db.get("SELECT * FROM services WHERE id = ?", [data.id]);
    return RowConverter.toService(row);
  }

  // ============================================
  // Features
  // ============================================

  async createFeature(data: CreateFeature): Promise<Feature> {
    const id = uuid();
    const now = new Date();

    await this.db.run(
      `INSERT INTO features (id, service_id, name, description, owners, created_at, updated_at)
       VALUES (?, ?, ?, ?, CAST(? AS VARCHAR[]), ?, ?)`,
      [id, data.serviceId, data.name, data.description ?? null, data.owners?.length ? JSON.stringify(data.owners) : null, now, now]
    );

    const row = await this.db.get("SELECT * FROM features WHERE id = ?", [id]);
    return RowConverter.toFeature(row);
  }

  async getFeature(id: string): Promise<Feature | undefined> {
    const row = await this.db.get("SELECT * FROM features WHERE id = ?", [id]);
    return row ? RowConverter.toFeature(row) : undefined;
  }

  async getAllFeatures(): Promise<Feature[]> {
    const rows = await this.db.all("SELECT * FROM features ORDER BY created_at DESC");
    return rows.map(RowConverter.toFeature);
  }

  async getFeaturesByService(serviceId: string): Promise<Feature[]> {
    const rows = await this.db.all(
      "SELECT * FROM features WHERE service_id = ? ORDER BY created_at DESC",
      [serviceId]
    );
    return rows.map(RowConverter.toFeature);
  }

  async updateFeature(id: string, data: Partial<CreateFeature>): Promise<Feature | undefined> {
    const existing = await this.getFeature(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.owners !== undefined) {
      updates.push("owners = CAST(? AS VARCHAR[])");
      params.push(data.owners?.length ? JSON.stringify(data.owners) : null);
    }

    updates.push("updated_at = ?");
    params.push(new Date());

    params.push(id);

    await this.db.run(
      `UPDATE features SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return this.getFeature(id);
  }

  async deleteFeature(id: string): Promise<boolean> {
    const existing = await this.getFeature(id);
    if (!existing) return false;
    await this.db.run("DELETE FROM features WHERE id = ?", [id]);
    return true;
  }

  async importFeature(data: Feature): Promise<Feature> {
    await this.db.run(
      `INSERT INTO features (id, service_id, name, description, owners, created_at, updated_at)
       VALUES (?, ?, ?, ?, CAST(? AS VARCHAR[]), ?, ?)`,
      [data.id, data.serviceId, data.name, data.description ?? null,
       data.owners?.length ? JSON.stringify(data.owners) : null,
       new Date(data.createdAt), new Date(data.updatedAt)]
    );
    const row = await this.db.get("SELECT * FROM features WHERE id = ?", [data.id]);
    return RowConverter.toFeature(row);
  }

  // ============================================
  // Scenarios
  // ============================================

  async createScenario(data: CreateScenario): Promise<Scenario> {
    const id = uuid();
    const now = new Date();

    await this.db.run(
      `INSERT INTO scenarios (id, feature_id, name, description, tags, priority, variables, steps, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, CAST(? AS VARCHAR[]), ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.featureId,
        data.name,
        data.description ?? null,
        data.tags?.length ? JSON.stringify(data.tags) : null,
        data.priority || "medium",
        JSON.stringify(data.variables || []),
        JSON.stringify(data.steps || []),
        1,
        now,
        now,
      ]
    );

    // Update component usages index
    await this.updateComponentUsagesForScenario(id, data.steps || []);

    const row = await this.db.get("SELECT * FROM scenarios WHERE id = ?", [id]);
    return RowConverter.toScenario(row);
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    const row = await this.db.get("SELECT * FROM scenarios WHERE id = ?", [id]);
    return row ? RowConverter.toScenario(row) : undefined;
  }

  async getScenariosByFeature(featureId: string): Promise<Scenario[]> {
    const rows = await this.db.all(
      "SELECT * FROM scenarios WHERE feature_id = ? ORDER BY created_at DESC",
      [featureId]
    );
    return rows.map(RowConverter.toScenario);
  }

  async getScenariosByFeatureWithLastRun(featureId: string): Promise<ScenarioWithLastRun[]> {
    const rows = await this.db.all(
      `SELECT
         s.id, s.feature_id, s.name, s.description, s.tags, s.priority,
         s.variables, s.steps, s.version, s.created_at, s.updated_at,
         lr.last_run_id, lr.last_run_status, lr.last_run_at
       FROM scenarios s
       LEFT JOIN (
         SELECT
           scenario_id,
           id        AS last_run_id,
           status    AS last_run_status,
           created_at AS last_run_at,
           ROW_NUMBER() OVER (PARTITION BY scenario_id ORDER BY created_at DESC) AS rn
         FROM test_runs
       ) lr ON s.id = lr.scenario_id AND lr.rn = 1
       WHERE s.feature_id = ?
       ORDER BY s.created_at DESC`,
      [featureId]
    );
    return rows.map(RowConverter.toScenarioWithLastRun);
  }

  async getAllScenarios(): Promise<Scenario[]> {
    const rows = await this.db.all("SELECT * FROM scenarios ORDER BY created_at DESC");
    return rows.map(RowConverter.toScenario);
  }

  async getScenariosByService(serviceId: string): Promise<Scenario[]> {
    const rows = await this.db.all(
      `SELECT s.* FROM scenarios s
       JOIN features f ON s.feature_id = f.id
       WHERE f.service_id = ?
       ORDER BY s.created_at DESC`,
      [serviceId]
    );
    return rows.map(RowConverter.toScenario);
  }

  async updateScenario(id: string, data: Partial<CreateScenario>): Promise<Scenario | undefined> {
    const existing = await this.getScenario(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.tags !== undefined) {
      updates.push("tags = CAST(? AS VARCHAR[])");
      params.push(data.tags?.length ? JSON.stringify(data.tags) : null);
    }
    if (data.priority !== undefined) {
      updates.push("priority = ?");
      params.push(data.priority);
    }
    if (data.variables !== undefined) {
      updates.push("variables = ?");
      params.push(JSON.stringify(data.variables));
    }
    if (data.steps !== undefined) {
      updates.push("steps = ?");
      params.push(JSON.stringify(data.steps));
      // Update component usages index when steps change
      await this.updateComponentUsagesForScenario(id, data.steps);
    }

    updates.push("version = version + 1");
    updates.push("updated_at = ?");
    params.push(new Date());

    params.push(id);

    await this.db.run(
      `UPDATE scenarios SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return this.getScenario(id);
  }

  async deleteScenario(id: string): Promise<boolean> {
    const existing = await this.getScenario(id);
    if (!existing) return false;
    // Delete component usages first (CASCADE not supported in DuckDB)
    await this.db.run("DELETE FROM component_usages WHERE scenario_id = ?", [id]);
    await this.db.run("DELETE FROM scenarios WHERE id = ?", [id]);
    return true;
  }

  async importScenario(data: Scenario): Promise<Scenario> {
    await this.db.run(
      `INSERT INTO scenarios (id, feature_id, name, description, tags, priority, variables, steps, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, CAST(? AS VARCHAR[]), ?, ?, ?, ?, ?, ?)`,
      [
        data.id, data.featureId, data.name, data.description ?? null,
        data.tags?.length ? JSON.stringify(data.tags) : null,
        data.priority || "medium",
        JSON.stringify(data.variables ?? []),
        JSON.stringify(data.steps || []),
        data.version ?? 1,
        new Date(data.createdAt), new Date(data.updatedAt),
      ]
    );
    await this.updateComponentUsagesForScenario(data.id, data.steps || []);
    const row = await this.db.get("SELECT * FROM scenarios WHERE id = ?", [data.id]);
    return RowConverter.toScenario(row);
  }

  async duplicateScenario(id: string): Promise<Scenario | undefined> {
    const original = await this.getScenario(id);
    if (!original) return undefined;

    const newId = uuid();
    const now = new Date();

    await this.db.run(
      `INSERT INTO scenarios (id, feature_id, name, description, tags, priority, variables, steps, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, CAST(? AS VARCHAR[]), ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        original.featureId,
        `${original.name} (복사본)`,
        original.description ?? null,
        original.tags?.length ? JSON.stringify(original.tags) : null,
        original.priority,
        JSON.stringify(original.variables),
        JSON.stringify(original.steps),
        1,
        now,
        now,
      ]
    );

    // Update component usages index for duplicated scenario
    await this.updateComponentUsagesForScenario(newId, original.steps);

    return this.getScenario(newId);
  }

  // ============================================
  // Components
  // ============================================

  async createComponent(data: CreateComponent): Promise<Component> {
    const id = uuid();
    const now = new Date();

    await this.db.run(
      `INSERT INTO components (id, name, description, type, parameters, steps, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.description ?? null,
        data.type,
        JSON.stringify(data.parameters || []),
        JSON.stringify(data.steps || []),
        now,
        now,
      ]
    );

    const row = await this.db.get("SELECT * FROM components WHERE id = ?", [id]);
    return RowConverter.toComponent(row);
  }

  async getComponent(id: string): Promise<Component | undefined> {
    const row = await this.db.get("SELECT * FROM components WHERE id = ?", [id]);
    return row ? RowConverter.toComponent(row) : undefined;
  }

  async getAllComponents(): Promise<Component[]> {
    const rows = await this.db.all("SELECT * FROM components ORDER BY created_at DESC");
    return rows.map(RowConverter.toComponent);
  }

  async updateComponent(id: string, data: Partial<CreateComponent>): Promise<Component | undefined> {
    const existing = await this.getComponent(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.type !== undefined) {
      updates.push("type = ?");
      params.push(data.type);
    }
    if (data.parameters !== undefined) {
      updates.push("parameters = ?");
      params.push(JSON.stringify(data.parameters));
    }
    if (data.steps !== undefined) {
      updates.push("steps = ?");
      params.push(JSON.stringify(data.steps));
    }

    updates.push("updated_at = ?");
    params.push(new Date());

    params.push(id);

    await this.db.run(
      `UPDATE components SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return this.getComponent(id);
  }

  async deleteComponent(id: string): Promise<boolean> {
    const existing = await this.getComponent(id);
    if (!existing) return false;
    // Delete component usages first (CASCADE not supported in DuckDB)
    await this.db.run("DELETE FROM component_usages WHERE component_id = ?", [id]);
    await this.db.run("DELETE FROM components WHERE id = ?", [id]);
    return true;
  }

  async importComponent(data: Component): Promise<Component> {
    await this.db.run(
      `INSERT INTO components (id, name, description, type, parameters, steps, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id, data.name, data.description ?? null, data.type,
        JSON.stringify(data.parameters || []),
        JSON.stringify(data.steps || []),
        new Date(data.createdAt), new Date(data.updatedAt),
      ]
    );
    const row = await this.db.get("SELECT * FROM components WHERE id = ?", [data.id]);
    return RowConverter.toComponent(row);
  }

  /**
   * Get component usages using indexed lookup instead of O(n) scan
   */
  async getComponentUsages(componentId: string): Promise<{ scenarioId: string; stepIndices: number[] }[]> {
    const rows = await this.db.all(
      `SELECT scenario_id, step_index
       FROM component_usages
       WHERE component_id = ?
       ORDER BY scenario_id, step_index`,
      [componentId]
    );

    // Group by scenario_id
    const usageMap = new Map<string, number[]>();
    for (const row of rows) {
      const scenarioId = row.scenario_id as string;
      const stepIndex = row.step_index as number;

      if (!usageMap.has(scenarioId)) {
        usageMap.set(scenarioId, []);
      }
      usageMap.get(scenarioId)!.push(stepIndex);
    }

    return Array.from(usageMap.entries()).map(([scenarioId, stepIndices]) => ({
      scenarioId,
      stepIndices,
    }));
  }

  /**
   * Update component_usages table for a scenario
   * This maintains the index used by getComponentUsages
   */
  private async updateComponentUsagesForScenario(scenarioId: string, steps: any[]): Promise<void> {
    await this.db.run("DELETE FROM component_usages WHERE scenario_id = ?", [scenarioId]);

    // Collect unique component IDs referenced by steps to validate in one batch query
    const componentSteps: Array<{ stepIndex: number; componentId: string }> = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.type === "component" && step.config?.componentId) {
        componentSteps.push({ stepIndex: i, componentId: step.config.componentId });
      }
    }
    if (componentSteps.length === 0) return;

    const uniqueIds = [...new Set(componentSteps.map((s) => s.componentId))];
    const placeholders = uniqueIds.map(() => "?").join(", ");
    const existing = await this.db.all(
      `SELECT id FROM components WHERE id IN (${placeholders})`,
      uniqueIds
    );
    const validIds = new Set(existing.map((r) => r.id as string));

    const now = new Date();
    for (const { stepIndex, componentId } of componentSteps) {
      if (validIds.has(componentId)) {
        await this.db.run(
          `INSERT INTO component_usages (id, component_id, scenario_id, step_index, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [uuid(), componentId, scenarioId, stepIndex, now]
        );
      }
    }
  }

  // ============================================
  // Test Runs
  // ============================================

  async createTestRun(run: TestRun): Promise<TestRun> {
    await this.db.run(
      `INSERT INTO test_runs (id, scenario_id, status, started_at, finished_at, duration, environment, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.scenarioId,
        run.status,
        run.startedAt ?? null,
        run.finishedAt ?? null,
        run.duration ?? null,
        JSON.stringify(run.environment),
        run.summary ? JSON.stringify(run.summary) : null,
        run.createdAt,
      ]
    );

    return run;
  }

  async getTestRun(id: string): Promise<TestRun | undefined> {
    const row = await this.db.get("SELECT * FROM test_runs WHERE id = ?", [id]);
    return row ? RowConverter.toTestRun(row) : undefined;
  }

  async getTestRunsByScenario(scenarioId: string): Promise<TestRun[]> {
    const rows = await this.db.all(
      "SELECT * FROM test_runs WHERE scenario_id = ? ORDER BY created_at DESC",
      [scenarioId]
    );
    return rows.map(RowConverter.toTestRun);
  }

  async getAllTestRuns(
    limit = 50,
    filters: { scenarioId?: string; status?: string; featureId?: string; serviceId?: string; from?: Date; to?: Date } = {},
    offset = 0
  ): Promise<(TestRun & { scenarioName: string })[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.scenarioId) {
      conditions.push("t.scenario_id = ?");
      params.push(filters.scenarioId);
    }
    if (filters.status) {
      conditions.push("t.status = ?");
      params.push(filters.status);
    }
    if (filters.featureId) {
      conditions.push("s.feature_id = ?");
      params.push(filters.featureId);
    }
    if (filters.serviceId) {
      conditions.push("f.service_id = ?");
      params.push(filters.serviceId);
    }
    if (filters.from) {
      conditions.push("t.created_at >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push("t.created_at <= ?");
      params.push(filters.to);
    }

    // Only JOIN features table when serviceId filter is needed
    const featureJoin = filters.serviceId
      ? "JOIN features f ON s.feature_id = f.id"
      : "";
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    params.push(safeLimit, safeOffset);

    const rows = await this.db.all(
      `SELECT t.*, s.name as scenario_name
       FROM test_runs t
       LEFT JOIN scenarios s ON t.scenario_id = s.id
       ${featureJoin}
       ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows.map((row: any) => ({
      ...RowConverter.toTestRun(row),
      scenarioName: row.scenario_name || `시나리오 ${row.scenario_id?.slice(0, 8)}...`,
    }));
  }

  async getDashboardRuns(hours = 24): Promise<(TestRun & { scenarioName: string })[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await this.db.all(
      `SELECT t.*, s.name as scenario_name
       FROM test_runs t
       LEFT JOIN scenarios s ON t.scenario_id = s.id
       WHERE t.created_at >= ?
       ORDER BY t.created_at DESC`,
      [cutoff]
    );
    return rows.map((row: any) => ({
      ...RowConverter.toTestRun(row),
      scenarioName: row.scenario_name || `시나리오 ${row.scenario_id?.slice(0, 8)}...`,
    }));
  }

  async updateTestRun(id: string, data: Partial<TestRun>): Promise<TestRun | undefined> {
    const existing = await this.getTestRun(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
    }
    if (data.startedAt !== undefined) {
      updates.push("started_at = ?");
      params.push(data.startedAt);
    }
    if (data.finishedAt !== undefined) {
      updates.push("finished_at = ?");
      params.push(data.finishedAt);
    }
    if (data.duration !== undefined) {
      updates.push("duration = ?");
      params.push(data.duration);
    }
    if (data.summary !== undefined) {
      updates.push("summary = ?");
      params.push(JSON.stringify(data.summary));
    }

    if (updates.length === 0) return existing;

    params.push(id);

    await this.db.run(
      `UPDATE test_runs SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return this.getTestRun(id);
  }

  // ============================================
  // Step Results
  // ============================================

  async createStepResult(result: StepResult): Promise<StepResult> {
    await this.db.run(
      `INSERT INTO step_results (id, run_id, step_id, step_index, status, duration, error, healing, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.id,
        result.runId,
        result.stepId,
        result.stepIndex,
        result.status,
        result.duration,
        result.error ? JSON.stringify(result.error) : null,
        result.healing ? JSON.stringify(result.healing) : null,
        result.context ? JSON.stringify(result.context) : null,
        result.createdAt,
      ]
    );

    return result;
  }

  async getStepResultsByRun(runId: string): Promise<StepResult[]> {
    const rows = await this.db.all(
      "SELECT * FROM step_results WHERE run_id = ? ORDER BY step_index ASC",
      [runId]
    );
    return rows.map(RowConverter.toStepResult);
  }

  // ============================================
  // Healing Records
  // ============================================

  async createHealingRecord(record: HealingRecord): Promise<HealingRecord> {
    await this.db.run(
      `INSERT INTO healing_records (
        id, scenario_id, step_id, run_id, locator_display_name,
        original_strategy, healed_strategy, trigger, confidence, status,
        reviewed_by, reviewed_at, review_note, propagated_to, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.scenarioId,
        record.stepId,
        record.runId,
        record.locatorDisplayName,
        JSON.stringify(record.originalStrategy),
        JSON.stringify(record.healedStrategy),
        record.trigger,
        record.confidence,
        record.status,
        record.reviewedBy ?? null,
        record.reviewedAt ?? null,
        record.reviewNote ?? null,
        record.propagatedTo ?? null,
        record.createdAt,
      ]
    );

    return record;
  }

  async getHealingRecord(id: string): Promise<HealingRecord | undefined> {
    const row = await this.db.get("SELECT * FROM healing_records WHERE id = ?", [id]);
    return row ? RowConverter.toHealingRecord(row) : undefined;
  }

  async getAllHealingRecords(): Promise<HealingRecord[]> {
    const rows = await this.db.all("SELECT * FROM healing_records ORDER BY created_at DESC");
    return rows.map(RowConverter.toHealingRecord);
  }

  async getPendingHealingRecords(): Promise<HealingRecord[]> {
    const rows = await this.db.all(
      "SELECT * FROM healing_records WHERE status = 'pending' ORDER BY created_at DESC"
    );
    return rows.map(RowConverter.toHealingRecord);
  }

  async getHealingRecordsByStatus(status: string): Promise<HealingRecord[]> {
    const rows = await this.db.all(
      "SELECT * FROM healing_records WHERE status = ? ORDER BY created_at DESC",
      [status]
    );
    return rows.map(RowConverter.toHealingRecord);
  }

  async updateHealingRecord(id: string, data: Partial<HealingRecord>): Promise<HealingRecord | undefined> {
    const existing = await this.getHealingRecord(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
    }
    if (data.reviewedBy !== undefined) {
      updates.push("reviewed_by = ?");
      params.push(data.reviewedBy);
    }
    if (data.reviewedAt !== undefined) {
      updates.push("reviewed_at = ?");
      params.push(data.reviewedAt);
    }
    if (data.reviewNote !== undefined) {
      updates.push("review_note = ?");
      params.push(data.reviewNote);
    }
    if (data.propagatedTo !== undefined) {
      updates.push("propagated_to = CAST(? AS VARCHAR[])");
      params.push(data.propagatedTo?.length ? JSON.stringify(data.propagatedTo) : null);
    }

    if (updates.length === 0) return existing;

    params.push(id);

    await this.db.run(
      `UPDATE healing_records SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return this.getHealingRecord(id);
  }

  async getHealingStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    autoApproved: number;
  }> {
    const rows = await this.db.all(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'auto_approved') as auto_approved
       FROM healing_records`
    );

    const row = rows[0] || {};
    return {
      total: Number(row.total) || 0,
      pending: Number(row.pending) || 0,
      approved: Number(row.approved) || 0,
      rejected: Number(row.rejected) || 0,
      autoApproved: Number(row.auto_approved) || 0,
    };
  }

  // ============================================
  // Element Registry
  // ============================================

  async getAllRegistryElements(serviceId?: string): Promise<any[]> {
    let query = "SELECT * FROM element_registry";
    const params: any[] = [];

    if (serviceId) {
      query += " WHERE service_id = ?";
      params.push(serviceId);
    }

    query += " ORDER BY updated_at DESC";

    try {
      const rows = await this.db.all(query, params);
      return rows.map((el: any) => ({
        ...el,
        currentLocator: JSON.parse(el.current_locator || "{}"),
        history: JSON.parse(el.history || "[]"),
        usedIn: JSON.parse(el.used_in || "[]"),
      }));
    } catch (_error) {
      // Table might not exist yet
      return [];
    }
  }

  async getRegistryElement(id: string): Promise<any | undefined> {
    try {
      const row = await this.db.get("SELECT * FROM element_registry WHERE id = ?", [id]);
      if (!row) return undefined;

      return {
        ...row,
        currentLocator: JSON.parse(row.current_locator || "{}"),
        history: JSON.parse(row.history || "[]"),
        usedIn: JSON.parse(row.used_in || "[]"),
      };
    } catch (_error) {
      return undefined;
    }
  }

  async createRegistryElement(data: {
    id: string;
    serviceId: string;
    displayName: string;
    pagePattern?: string;
    currentLocator: any;
  }): Promise<any> {
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO element_registry (id, service_id, display_name, page_pattern, current_locator, history, used_in, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', '[]', ?, ?)`,
      [
        data.id,
        data.serviceId,
        data.displayName,
        data.pagePattern || null,
        JSON.stringify(data.currentLocator),
        now,
        now,
      ]
    );

    return {
      id: data.id,
      service_id: data.serviceId,
      display_name: data.displayName,
      page_pattern: data.pagePattern,
      currentLocator: data.currentLocator,
      history: [],
      usedIn: [],
      created_at: now,
      updated_at: now,
    };
  }

  async updateRegistryElement(
    id: string,
    data: {
      displayName?: string;
      pagePattern?: string;
      currentLocator?: any;
      reason?: string;
    }
  ): Promise<any | undefined> {
    const now = new Date().toISOString();

    // Get current element
    const current = await this.getRegistryElement(id);
    if (!current) return undefined;

    const history = current.history || [];

    // If locator is changing, add current to history
    if (data.currentLocator) {
      history.push({
        locator: current.currentLocator,
        changedAt: now,
        reason: data.reason || "Manual update",
      });
    }

    // Update the element
    await this.db.run(
      `UPDATE element_registry
       SET display_name = COALESCE(?, display_name),
           page_pattern = COALESCE(?, page_pattern),
           current_locator = COALESCE(?, current_locator),
           history = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        data.displayName || null,
        data.pagePattern || null,
        data.currentLocator ? JSON.stringify(data.currentLocator) : null,
        JSON.stringify(history),
        now,
        id,
      ]
    );

    // Return updated element
    return this.getRegistryElement(id);
  }

  async addRegistryUsage(
    id: string,
    data: { scenarioId: string; stepId: string }
  ): Promise<any> {
    const now = new Date().toISOString();

    // Get current element
    const current = await this.getRegistryElement(id);
    if (!current) return undefined;

    const usedIn = current.usedIn || [];

    // Check if usage already exists
    const exists = usedIn.some(
      (u: any) => u.scenarioId === data.scenarioId && u.stepId === data.stepId
    );

    if (!exists) {
      usedIn.push({
        scenarioId: data.scenarioId,
        stepId: data.stepId,
        addedAt: now,
      });

      await this.db.run(
        `UPDATE element_registry SET used_in = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(usedIn), now, id]
      );
    }

    return { usedIn };
  }

  async deleteRegistryElement(id: string): Promise<boolean> {
    try {
      const existing = await this.getRegistryElement(id);
      if (!existing) return false;
      await this.db.run("DELETE FROM element_registry WHERE id = ?", [id]);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async findRegistryByName(
    displayName: string,
    serviceId?: string
  ): Promise<any | null> {
    try {
      let query = "SELECT * FROM element_registry WHERE display_name = ?";
      const params: any[] = [displayName];

      if (serviceId) {
        query += " AND service_id = ?";
        params.push(serviceId);
      }

      const row = await this.db.get(query, params);
      if (!row) return null;

      return {
        ...row,
        currentLocator: JSON.parse(row.current_locator || "{}"),
        history: JSON.parse(row.history || "[]"),
        usedIn: JSON.parse(row.used_in || "[]"),
      };
    } catch (_error) {
      return null;
    }
  }
}
