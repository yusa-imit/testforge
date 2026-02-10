-- Migration: 0001_initial
-- Description: Initial schema for TestForge
-- Created: 2026-02-10
-- Note: DuckDB does not support CASCADE in foreign keys as of version 1.1.0
-- Cascade deletes must be handled in application layer

-- ============================================
-- Services Table
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  base_url VARCHAR NOT NULL,
  default_timeout INTEGER DEFAULT 30000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Features Table
-- ============================================
CREATE TABLE IF NOT EXISTS features (
  id VARCHAR PRIMARY KEY,
  service_id VARCHAR NOT NULL REFERENCES services(id),
  name VARCHAR NOT NULL,
  description VARCHAR,
  owners VARCHAR[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_features_service_id ON features(service_id);

-- ============================================
-- Scenarios Table
-- ============================================
CREATE TABLE IF NOT EXISTS scenarios (
  id VARCHAR PRIMARY KEY,
  feature_id VARCHAR NOT NULL REFERENCES features(id),
  name VARCHAR NOT NULL,
  description VARCHAR,
  tags VARCHAR[],
  priority VARCHAR DEFAULT 'medium',
  variables JSON DEFAULT '[]',
  steps JSON DEFAULT '[]',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scenarios_feature_id ON scenarios(feature_id);

-- ============================================
-- Components Table
-- ============================================
CREATE TABLE IF NOT EXISTS components (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  type VARCHAR NOT NULL,
  parameters JSON DEFAULT '[]',
  steps JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Test Runs Table
-- ============================================
CREATE TABLE IF NOT EXISTS test_runs (
  id VARCHAR PRIMARY KEY,
  scenario_id VARCHAR NOT NULL REFERENCES scenarios(id),
  status VARCHAR NOT NULL,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  duration INTEGER,
  environment JSON NOT NULL,
  summary JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_runs_scenario_id ON test_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs(created_at);

-- ============================================
-- Step Results Table
-- ============================================
CREATE TABLE IF NOT EXISTS step_results (
  id VARCHAR PRIMARY KEY,
  run_id VARCHAR NOT NULL REFERENCES test_runs(id),
  step_id VARCHAR NOT NULL,
  step_index INTEGER NOT NULL,
  status VARCHAR NOT NULL,
  duration INTEGER NOT NULL,
  error JSON,
  healing JSON,
  context JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_step_results_run_id ON step_results(run_id);

-- ============================================
-- Healing Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS healing_records (
  id VARCHAR PRIMARY KEY,
  scenario_id VARCHAR NOT NULL REFERENCES scenarios(id),
  step_id VARCHAR NOT NULL,
  run_id VARCHAR NOT NULL REFERENCES test_runs(id),
  locator_display_name VARCHAR NOT NULL,
  original_strategy JSON NOT NULL,
  healed_strategy JSON NOT NULL,
  trigger VARCHAR NOT NULL,
  confidence DOUBLE NOT NULL,
  status VARCHAR DEFAULT 'pending',
  reviewed_by VARCHAR,
  reviewed_at TIMESTAMP,
  review_note VARCHAR,
  propagated_to VARCHAR[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_healing_records_status ON healing_records(status);
CREATE INDEX IF NOT EXISTS idx_healing_records_scenario_id ON healing_records(scenario_id);
CREATE INDEX IF NOT EXISTS idx_healing_records_created_at ON healing_records(created_at);
