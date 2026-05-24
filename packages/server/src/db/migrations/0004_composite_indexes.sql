-- Migration: Add composite indexes for common query patterns
-- Date: 2026-05-24
-- Description: Adds composite indexes to speed up filtered+sorted queries
--              that are common in the application (runs by scenario+date,
--              healing records by status+date, step results by run+index).

-- Speeds up getTestRunsByScenario (scenario_id filter, created_at sort)
CREATE INDEX IF NOT EXISTS idx_test_runs_scenario_created ON test_runs(scenario_id, created_at DESC);

-- Speeds up getHealingRecordsByStatus (status filter, created_at sort)
CREATE INDEX IF NOT EXISTS idx_healing_status_created ON healing_records(status, created_at DESC);

-- Speeds up getStepResultsByRun (run_id filter, step_index sort)
CREATE INDEX IF NOT EXISTS idx_step_results_run_index ON step_results(run_id, step_index ASC);
