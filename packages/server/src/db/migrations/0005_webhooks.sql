-- Migration 0005: Webhooks
-- Webhook subscriptions for run completion notifications

CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  url VARCHAR NOT NULL,
  secret VARCHAR,
  events VARCHAR[] NOT NULL DEFAULT ['run.completed'],
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);
