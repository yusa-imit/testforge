/**
 * Background scheduler for automated test runs.
 * Checks the database every minute for schedules that are due and runs them.
 */
import { getDB } from "../db";
import { executeScenarioRun } from "./runHelper";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 60_000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function runDueSchedules(): Promise<void> {
  try {
    const db = await getDB();
    const due = await db.getDueSchedules();

    for (const schedule of due) {
      try {
        const scenario = await db.getScenario(schedule.scenarioId);
        if (!scenario) {
          logger.warn("Scheduler: scenario not found, skipping", { scheduleId: schedule.id, scenarioId: schedule.scenarioId });
          continue;
        }
        const feature = await db.getFeature(scenario.featureId);
        if (!feature) continue;
        const service = await db.getService(feature.serviceId);
        if (!service) continue;

        // Update schedule timing before execution so we don't double-fire
        await db.recordScheduleRun(schedule.id);

        logger.info("Scheduler: triggering scheduled run", {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          scenarioId: schedule.scenarioId,
        });

        // Fire-and-forget — execution happens in background
        executeScenarioRun(scenario, service, db).catch((err) => {
          logger.error("Scheduler: run failed", {
            scheduleId: schedule.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      } catch (err) {
        logger.error("Scheduler: error processing schedule", {
          scheduleId: schedule.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    logger.error("Scheduler: error fetching due schedules", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function startScheduler(): void {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(runDueSchedules, CHECK_INTERVAL_MS);
  logger.info("Scheduler started (check interval: 60s)");
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info("Scheduler stopped");
  }
}
