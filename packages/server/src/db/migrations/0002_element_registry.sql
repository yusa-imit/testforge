-- Migration: 0002_element_registry
-- Description: Add element registry table for tracking element changes
-- Created: 2026-02-16

-- ============================================
-- Element Registry Table
-- ============================================
CREATE TABLE IF NOT EXISTS element_registry (
  id VARCHAR PRIMARY KEY,
  service_id VARCHAR NOT NULL REFERENCES services(id),
  display_name VARCHAR NOT NULL,
  page_pattern VARCHAR,
  current_locator JSON NOT NULL,
  history JSON DEFAULT '[]',
  used_in JSON DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_element_registry_service_id ON element_registry(service_id);
CREATE INDEX IF NOT EXISTS idx_element_registry_display_name ON element_registry(display_name);
