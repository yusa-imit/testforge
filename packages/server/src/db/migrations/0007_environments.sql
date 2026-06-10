-- Migration 0007: Environment Profiles
-- Stores named test environments with base URL and variable overrides

CREATE TABLE IF NOT EXISTS environments (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  base_url VARCHAR,
  variables VARCHAR NOT NULL DEFAULT '{}',  -- JSON: Record<string, any>
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
