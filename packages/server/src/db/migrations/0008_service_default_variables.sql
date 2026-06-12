-- Migration 0008: Add default_variables to services table
-- PRD Appendix B: Service default variables (priority 4 in variable resolution chain)
ALTER TABLE services ADD COLUMN IF NOT EXISTS default_variables JSON DEFAULT '[]';
