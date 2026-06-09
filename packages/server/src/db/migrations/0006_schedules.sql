-- Migration 0006: Scheduled Test Runs
-- Allows scenarios to be run automatically on an interval schedule

CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  scenario_id VARCHAR NOT NULL,
  interval_minutes INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_scenario_id ON schedules(scenario_id);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled_next_run ON schedules(enabled, next_run_at);
