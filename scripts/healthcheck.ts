#!/usr/bin/env bun
/**
 * TestForge Health Check Script
 *
 * Verifies all core APIs are functional before QA testing or deployment.
 * Run this after starting dev servers to ensure everything works.
 */

const API_BASE = 'http://localhost:3001';

interface HealthCheckResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: HealthCheckResult[] = [];

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message: '✅ PASSED', duration });
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, message: `❌ FAILED: ${message}`, duration });
  }
}

async function get(path: string): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error('API returned success: false');
  }
  return data.data;
}

async function _post(path: string, body: any): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error('API returned success: false');
  }
  return data.data;
}

console.log('🏥 TestForge Health Check\n');
console.log('Testing API endpoints...\n');

// 1. Services API
await check('Services: List', async () => {
  const services = await get('/api/services');
  if (!Array.isArray(services)) throw new Error('Expected array');
  if (services.length === 0) throw new Error('No services found - seed data missing?');
});

await check('Services: Get by ID', async () => {
  const services = await get('/api/services');
  const firstService = services[0];
  const service = await get(`/api/services/${firstService.id}`);
  if (service.id !== firstService.id) throw new Error('Service ID mismatch');
});

// 2. Features API
await check('Features: List by Service', async () => {
  const services = await get('/api/services');
  const features = await get(`/api/services/${services[0].id}/features`);
  if (!Array.isArray(features)) throw new Error('Expected array');
});

// 3. Scenarios API
await check('Scenarios: List by Feature', async () => {
  const services = await get('/api/services');
  const features = await get(`/api/services/${services[0].id}/features`);
  if (features.length === 0) throw new Error('No features found');
  const scenarios = await get(`/api/features/${features[0].id}/scenarios`);
  if (!Array.isArray(scenarios)) throw new Error('Expected array');
});

await check('Scenarios: Get by ID', async () => {
  const services = await get('/api/services');
  const features = await get(`/api/services/${services[0].id}/features`);
  const scenarios = await get(`/api/features/${features[0].id}/scenarios`);
  if (scenarios.length === 0) throw new Error('No scenarios found');
  const scenario = await get(`/api/scenarios/${scenarios[0].id}`);
  if (!scenario.steps) throw new Error('Missing steps array');
});

// 4. Components API
await check('Components: List', async () => {
  const components = await get('/api/components');
  if (!Array.isArray(components)) throw new Error('Expected array');
  if (components.length === 0) throw new Error('No components found - seed data missing?');
});

await check('Components: Get by ID', async () => {
  const components = await get('/api/components');
  const component = await get(`/api/components/${components[0].id}`);
  if (!component.steps) throw new Error('Missing steps array');
});

await check('Components: Usage Tracking', async () => {
  const components = await get('/api/components');
  const usage = await get(`/api/components/${components[0].id}/usages`);
  if (!usage.component) throw new Error('Missing component in response');
  if (!Array.isArray(usage.usedBy)) throw new Error('Expected usedBy array');
  if (typeof usage.totalUsages !== 'number') throw new Error('Missing totalUsages count');
});

// 5. Test Runs API
await check('Runs: List', async () => {
  const runs = await get('/api/runs');
  if (!Array.isArray(runs)) throw new Error('Expected array');
});

// 6. Healing API
await check('Healing: List', async () => {
  const healing = await get('/api/healing');
  if (!Array.isArray(healing)) throw new Error('Expected array');
});

await check('Healing: Stats', async () => {
  const stats = await get('/api/healing/stats');
  if (typeof stats.total !== 'number') throw new Error('Missing total count');
});

// 7. Element Registry API
await check('Registry: List', async () => {
  const registry = await get('/api/registry');
  if (!Array.isArray(registry)) throw new Error('Expected array');
});

// Print results
console.log('\n' + '='.repeat(60));
console.log('RESULTS');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;

for (const result of results) {
  console.log(`${result.message.padEnd(50)} ${result.duration}ms`);
  console.log(`  ${result.name}`);

  if (result.passed) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Total: ${results.length} checks`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  console.log('❌ Health check FAILED');
  process.exit(1);
} else {
  console.log('✅ All health checks PASSED!');
  console.log('\nTestForge is ready for QA testing.');
  process.exit(0);
}
