/**
 * DuckDB Schema Definitions
 *
 * DuckDB-specific schema for TestForge.
 * Uses DuckDB's column-oriented storage optimized for analytical queries.
 */

/**
 * Services Table
 *
 * Top-level entity representing a test target application.
 */
export const servicesTable = `
  CREATE TABLE IF NOT EXISTS services (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    base_url VARCHAR NOT NULL,
    default_timeout INTEGER DEFAULT 30000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Features Table
 *
 * Logical feature units within a service.
 * CASCADE delete when service is deleted.
 */
export const featuresTable = `
  CREATE TABLE IF NOT EXISTS features (
    id VARCHAR PRIMARY KEY,
    service_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description VARCHAR,
    owners VARCHAR[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  )
`;

/**
 * Scenarios Table
 *
 * Actual test cases with steps and variables stored as JSON.
 * DuckDB's native JSON support for complex nested data.
 */
export const scenariosTable = `
  CREATE TABLE IF NOT EXISTS scenarios (
    id VARCHAR PRIMARY KEY,
    feature_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description VARCHAR,
    tags VARCHAR[],
    priority VARCHAR DEFAULT 'medium',
    variables JSON DEFAULT '[]',
    steps JSON DEFAULT '[]',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
  )
`;

/**
 * Components Table
 *
 * Reusable step bundles with parameters.
 */
export const componentsTable = `
  CREATE TABLE IF NOT EXISTS components (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    type VARCHAR NOT NULL,
    parameters JSON DEFAULT '[]',
    steps JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

/**
 * Test Runs Table
 *
 * Test execution records with environment and summary data.
 */
export const testRunsTable = `
  CREATE TABLE IF NOT EXISTS test_runs (
    id VARCHAR PRIMARY KEY,
    scenario_id VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration INTEGER,
    environment JSON NOT NULL,
    summary JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
  )
`;

/**
 * Step Results Table
 *
 * Individual step execution results.
 * Stores healing info, errors, and debugging context.
 */
export const stepResultsTable = `
  CREATE TABLE IF NOT EXISTS step_results (
    id VARCHAR PRIMARY KEY,
    run_id VARCHAR NOT NULL,
    step_id VARCHAR NOT NULL,
    step_index INTEGER NOT NULL,
    status VARCHAR NOT NULL,
    duration INTEGER NOT NULL,
    error JSON,
    healing JSON,
    context JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
  )
`;

/**
 * Healing Records Table
 *
 * Self-healing event records with approval workflow.
 */
export const healingRecordsTable = `
  CREATE TABLE IF NOT EXISTS healing_records (
    id VARCHAR PRIMARY KEY,
    scenario_id VARCHAR NOT NULL,
    step_id VARCHAR NOT NULL,
    run_id VARCHAR NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
    FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
  )
`;

/**
 * Element Registry Table
 *
 * Tracks elements across scenarios for Self-Healing quality improvement.
 * Records element changes and usage patterns.
 */
export const elementRegistryTable = `
  CREATE TABLE IF NOT EXISTS element_registry (
    id VARCHAR PRIMARY KEY,
    service_id VARCHAR NOT NULL,
    display_name VARCHAR NOT NULL,
    page_pattern VARCHAR,
    current_locator JSON NOT NULL,
    history JSON DEFAULT '[]',
    used_in JSON DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  )
`;

/**
 * Indexes for performance optimization
 *
 * DuckDB automatically creates indexes for foreign keys,
 * but we add additional indexes for frequently queried columns.
 */
export const indexes = [
  // Features by service lookup
  'CREATE INDEX IF NOT EXISTS idx_features_service_id ON features(service_id)',

  // Scenarios by feature lookup
  'CREATE INDEX IF NOT EXISTS idx_scenarios_feature_id ON scenarios(feature_id)',

  // Test runs by scenario and status
  'CREATE INDEX IF NOT EXISTS idx_test_runs_scenario_id ON test_runs(scenario_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status)',
  'CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs(created_at)',

  // Step results by run
  'CREATE INDEX IF NOT EXISTS idx_step_results_run_id ON step_results(run_id)',

  // Healing records by status and scenario
  'CREATE INDEX IF NOT EXISTS idx_healing_records_status ON healing_records(status)',
  'CREATE INDEX IF NOT EXISTS idx_healing_records_scenario_id ON healing_records(scenario_id)',
  'CREATE INDEX IF NOT EXISTS idx_healing_records_created_at ON healing_records(created_at)',

  // Element registry indexes
  'CREATE INDEX IF NOT EXISTS idx_element_registry_service_id ON element_registry(service_id)',
  'CREATE INDEX IF NOT EXISTS idx_element_registry_display_name ON element_registry(display_name)',
];

/**
 * All table creation statements in dependency order
 */
export const allTables = [
  servicesTable,
  featuresTable,
  scenariosTable,
  componentsTable,
  testRunsTable,
  stepResultsTable,
  healingRecordsTable,
  elementRegistryTable,
];
