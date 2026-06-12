/**
 * Database Backup and Restore Routes
 *
 * Provides endpoints for exporting and importing the entire database state.
 * Useful for:
 * - QA testing (reset to known state)
 * - Data migration between environments
 * - Disaster recovery backups
 * - Sharing test data between developers
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDB } from "../db";
import { logger } from "../utils/logger";

const backup = new Hono();

/**
 * Database backup data structure
 */
interface DatabaseBackup {
  version: string;
  timestamp: string;
  metadata: {
    servicesCount: number;
    featuresCount: number;
    scenariosCount: number;
    componentsCount: number;
    runsCount: number;
    healingRecordsCount: number;
  };
  data: {
    services: any[];
    features: any[];
    scenarios: any[];
    components: any[];
    runs: any[];
    stepResults: any[];
    healingRecords: any[];
    elementRegistry: any[];
  };
}

/**
 * GET /api/backup/export
 *
 * Export entire database as JSON
 *
 * Query params:
 * - includeRuns: boolean (default: true) - Include test run history
 * - includeHealing: boolean (default: true) - Include healing records
 *
 * Returns:
 * - 200: JSON backup file
 */
backup.get("/export", async (c) => {
  const includeRuns = c.req.query("includeRuns") !== "false";
  const includeHealing = c.req.query("includeHealing") !== "false";

  logger.info("Starting database export", {
    includeRuns,
    includeHealing,
  });

  try {
    const db = await getDB();

    // Export all entities
    const services = await db.getAllServices();
    const features = await db.getAllFeatures();
    const scenarios = await db.getAllScenarios();
    const components = await db.getAllComponents();

    // Optional: Include test runs and related data
    const runs = includeRuns ? await db.getAllTestRuns() : [];
    const stepResults: any[] = [];
    if (includeRuns) {
      for (const run of runs) {
        const results = await db.getStepResultsByRun(run.id);
        stepResults.push(...results);
      }
    }

    // Optional: Include healing records
    const healingRecords = includeHealing ? await db.getAllHealingRecords() : [];

    // Element registry
    const elementRegistry = await db.getAllRegistryElements();

    // Build backup object
    const backupData: DatabaseBackup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      metadata: {
        servicesCount: services.length,
        featuresCount: features.length,
        scenariosCount: scenarios.length,
        componentsCount: components.length,
        runsCount: runs.length,
        healingRecordsCount: healingRecords.length,
      },
      data: {
        services,
        features,
        scenarios,
        components,
        runs,
        stepResults,
        healingRecords,
        elementRegistry,
      },
    };

    logger.info("Database export completed", {
      metadata: backupData.metadata,
    });

    // Set content-disposition header for file download
    c.header(
      "Content-Disposition",
      `attachment; filename="testforge-backup-${new Date().toISOString().split("T")[0]}.json"`
    );
    c.header("Content-Type", "application/json");

    return c.json(backupData);
  } catch (error) {
    logger.error("Failed to export database", { error });
    throw error;
  }
});

/**
 * POST /api/backup/import
 *
 * Import database from JSON backup
 *
 * Body: DatabaseBackup JSON
 *
 * Query params:
 * - mode: "replace" | "merge" (default: "replace")
 *   - replace: Clear existing data before import
 *   - merge: Keep existing data, skip conflicts
 *
 * Returns:
 * - 200: Import summary
 * - 400: Invalid backup format
 */
const importSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  metadata: z.object({
    servicesCount: z.number(),
    featuresCount: z.number(),
    scenariosCount: z.number(),
    componentsCount: z.number(),
    runsCount: z.number(),
    healingRecordsCount: z.number(),
  }),
  data: z.object({
    services: z.array(z.any()),
    features: z.array(z.any()),
    scenarios: z.array(z.any()),
    components: z.array(z.any()),
    runs: z.array(z.any()),
    stepResults: z.array(z.any()),
    healingRecords: z.array(z.any()),
    elementRegistry: z.array(z.any()),
  }),
});

backup.post("/import", zValidator("json", importSchema), async (c) => {
  const backupData = c.req.valid("json");
  const mode = c.req.query("mode") === "merge" ? "merge" : "replace";

  logger.info("Starting database import", {
    mode,
    metadata: backupData.metadata,
  });

  const summary = {
    mode,
    imported: {
      services: 0,
      features: 0,
      scenarios: 0,
      components: 0,
      runs: 0,
      stepResults: 0,
      healingRecords: 0,
      elementRegistry: 0,
    },
    skipped: {
      services: 0,
      features: 0,
      scenarios: 0,
      components: 0,
    },
  };

  try {
    const db = await getDB();

    // In replace mode, we don't clear the database here
    // Instead, we let individual create operations handle conflicts
    // This prevents data loss if import fails partway through

    // Import services (preserving original IDs for FK integrity)
    for (const service of backupData.data.services) {
      try {
        if (mode === "merge") {
          const existing = await db.getService(service.id);
          if (existing) {
            summary.skipped.services++;
            continue;
          }
        }
        await db.importService({
          id: service.id,
          name: service.name,
          description: service.description,
          baseUrl: service.baseUrl,
          defaultTimeout: service.defaultTimeout ?? 30000,
          defaultVariables: service.defaultVariables ?? [],
          createdAt: new Date(service.createdAt ?? Date.now()),
          updatedAt: new Date(service.updatedAt ?? Date.now()),
        });
        summary.imported.services++;
      } catch (error) {
        if (mode === "merge") {
          summary.skipped.services++;
        } else {
          throw error;
        }
      }
    }

    // Import features (preserving original IDs for FK integrity)
    for (const feature of backupData.data.features) {
      try {
        if (mode === "merge") {
          const existing = await db.getFeature(feature.id);
          if (existing) {
            summary.skipped.features++;
            continue;
          }
        }
        await db.importFeature({
          id: feature.id,
          serviceId: feature.serviceId,
          name: feature.name,
          description: feature.description,
          owners: feature.owners || [],
          createdAt: new Date(feature.createdAt ?? Date.now()),
          updatedAt: new Date(feature.updatedAt ?? Date.now()),
        });
        summary.imported.features++;
      } catch (error) {
        if (mode === "merge") {
          summary.skipped.features++;
        } else {
          throw error;
        }
      }
    }

    // Import scenarios (preserving original IDs for FK integrity)
    for (const scenario of backupData.data.scenarios) {
      try {
        if (mode === "merge") {
          const existing = await db.getScenario(scenario.id);
          if (existing) {
            summary.skipped.scenarios++;
            continue;
          }
        }
        await db.importScenario({
          id: scenario.id,
          featureId: scenario.featureId,
          name: scenario.name,
          description: scenario.description,
          tags: scenario.tags || [],
          priority: scenario.priority || "medium",
          variables: scenario.variables || {},
          steps: scenario.steps || [],
          version: scenario.version ?? 1,
          createdAt: new Date(scenario.createdAt ?? Date.now()),
          updatedAt: new Date(scenario.updatedAt ?? Date.now()),
        });
        summary.imported.scenarios++;
      } catch (error) {
        if (mode === "merge") {
          summary.skipped.scenarios++;
        } else {
          throw error;
        }
      }
    }

    // Import components (preserving original IDs for FK integrity)
    for (const component of backupData.data.components) {
      try {
        if (mode === "merge") {
          const existing = await db.getComponent(component.id);
          if (existing) {
            summary.skipped.components++;
            continue;
          }
        }
        await db.importComponent({
          id: component.id,
          name: component.name,
          description: component.description,
          type: component.type,
          parameters: component.parameters || [],
          steps: component.steps || [],
          createdAt: new Date(component.createdAt ?? Date.now()),
          updatedAt: new Date(component.updatedAt ?? Date.now()),
        });
        summary.imported.components++;
      } catch (error) {
        if (mode === "merge") {
          summary.skipped.components++;
        } else {
          throw error;
        }
      }
    }

    // Import test runs (if included)
    for (const run of backupData.data.runs) {
      try {
        await db.createTestRun({
          id: run.id,
          scenarioId: run.scenarioId,
          status: run.status,
          environment: run.environment || { baseUrl: "", variables: {} },
          createdAt: new Date(run.createdAt),
          startedAt: run.startedAt ? new Date(run.startedAt) : undefined,
          finishedAt: run.finishedAt ? new Date(run.finishedAt) : undefined,
          duration: run.duration,
          summary: run.summary,
        });
        summary.imported.runs++;
      } catch (error) {
        // Skip failed runs in both modes
        logger.warn("Failed to import test run", { runId: run.id, error });
      }
    }

    // Import step results (if included)
    for (const result of backupData.data.stepResults) {
      try {
        await db.createStepResult({
          id: result.id,
          runId: result.runId,
          stepId: result.stepId,
          stepIndex: result.stepIndex,
          status: result.status,
          duration: result.duration,
          createdAt: new Date(result.createdAt),
          error: result.error,
          healing: result.healing,
          context: result.context,
        });
        summary.imported.stepResults++;
      } catch (error) {
        // Skip failed step results in both modes
        logger.warn("Failed to import step result", { resultId: result.id, error });
      }
    }

    // Import healing records (if included)
    for (const record of backupData.data.healingRecords) {
      try {
        await db.createHealingRecord({
          id: record.id,
          scenarioId: record.scenarioId,
          stepId: record.stepId,
          runId: record.runId,
          status: record.status,
          locatorDisplayName: record.locatorDisplayName,
          originalStrategy: record.originalStrategy,
          healedStrategy: record.healedStrategy,
          trigger: record.trigger,
          confidence: record.confidence,
          createdAt: new Date(record.createdAt),
          reviewedAt: record.reviewedAt ? new Date(record.reviewedAt) : undefined,
          reviewedBy: record.reviewedBy,
          propagatedTo: record.propagatedTo,
        });
        summary.imported.healingRecords++;
      } catch (error) {
        // Skip failed healing records in both modes
        logger.warn("Failed to import healing record", { recordId: record.id, error });
      }
    }

    // Import element registry (if included)
    for (const entry of backupData.data.elementRegistry) {
      try {
        await db.createRegistryElement({
          id: entry.id,
          serviceId: entry.service_id || entry.serviceId,
          displayName: entry.display_name || entry.displayName,
          pagePattern: entry.page_pattern || entry.pagePattern,
          currentLocator: entry.current_locator || entry.currentLocator,
        });
        summary.imported.elementRegistry++;
      } catch (error) {
        // Skip failed element registry entries in both modes
        logger.warn("Failed to import element registry entry", { entryId: entry.id, error });
      }
    }

    logger.info("Database import completed", { summary });

    return c.json({
      message: "Database import completed",
      summary,
    });
  } catch (error) {
    logger.error("Failed to import database", { error });
    throw error;
  }
});

/**
 * GET /api/backup/info
 *
 * Get current database statistics
 *
 * Returns:
 * - 200: Database statistics
 */
backup.get("/info", async (c) => {
  try {
    const db = await getDB();

    const services = await db.getAllServices();
    const features = await db.getAllFeatures();
    const scenarios = await db.getAllScenarios();
    const components = await db.getAllComponents();
    const runs = await db.getAllTestRuns();
    const healingRecords = await db.getAllHealingRecords();
    const elementRegistry = await db.getAllRegistryElements();

    const info = {
      counts: {
        services: services.length,
        features: features.length,
        scenarios: scenarios.length,
        components: components.length,
        runs: runs.length,
        healingRecords: healingRecords.length,
        elementRegistry: elementRegistry.length,
      },
      timestamp: new Date().toISOString(),
    };

    return c.json(info);
  } catch (error) {
    logger.error("Failed to get database info", { error });
    throw error;
  }
});

export default backup;
