-- Migration: Add component_usages table for efficient component usage tracking
-- Date: 2026-02-27
-- Description: Creates component_usages table to replace O(n) scenario scanning
--              with direct indexed lookups when finding which scenarios use a component.
-- Note: DuckDB does not support CASCADE - deletes handled in application layer

CREATE TABLE IF NOT EXISTS component_usages (
  id VARCHAR PRIMARY KEY,
  component_id VARCHAR NOT NULL REFERENCES components(id),
  scenario_id VARCHAR NOT NULL REFERENCES scenarios(id),
  step_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_component_usages_component_id ON component_usages(component_id);
CREATE INDEX IF NOT EXISTS idx_component_usages_scenario_id ON component_usages(scenario_id);

-- Note: Initial population will happen automatically as scenarios are accessed
-- No need to populate from existing data since the index will be built lazily
