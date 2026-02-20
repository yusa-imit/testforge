#!/usr/bin/env bun

/**
 * Pre-QA Validation Script
 *
 * Automated smoke tests to verify the system is ready for manual QA.
 * Run this before starting manual QA to catch any environment/setup issues.
 *
 * Usage: bun run scripts/pre-qa-check.ts
 */

import { $ } from "bun";
import { existsSync } from "fs";

// ANSI colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface CheckResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: CheckResult[] = [];

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${step}`, "cyan");
  log("=".repeat(60), "cyan");
}

function addResult(result: CheckResult) {
  results.push(result);
  const icon = result.passed ? "✅" : "❌";
  const color = result.passed ? "green" : "red";
  const duration = result.duration ? ` (${result.duration}ms)` : "";
  log(`${icon} ${result.name}${duration}`, color);
  if (result.error) {
    log(`   Error: ${result.error}`, "red");
  }
}

async function checkTypeScript(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await $`bun run typecheck`.quiet();
    return {
      name: "TypeScript type checking",
      passed: true,
      duration: Date.now() - start,
    };
  } catch (_error) {
    return {
      name: "TypeScript type checking",
      passed: false,
      error: "Type errors found. Run 'bun run typecheck' for details.",
      duration: Date.now() - start,
    };
  }
}

async function checkTests(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await $`bun test`.quiet();
    const output = result.stdout.toString();

    // Parse test results
    const passMatch = output.match(/(\d+) pass/);
    const failMatch = output.match(/(\d+) fail/);

    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;

    if (failed > 0) {
      return {
        name: `Unit tests (${passed} passed, ${failed} failed)`,
        passed: false,
        error: "Some tests are failing. Run 'bun test' for details.",
        duration: Date.now() - start,
      };
    }

    return {
      name: `Unit tests (${passed} passed)`,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (_error) {
    return {
      name: "Unit tests",
      passed: false,
      error: "Test execution failed. Run 'bun test' for details.",
      duration: Date.now() - start,
    };
  }
}

async function checkLint(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await $`bun run lint`.quiet();
    const output = result.stderr.toString() + result.stdout.toString();

    // Check for errors (not warnings)
    const errorMatch = output.match(/(\d+) errors?/);
    const errors = errorMatch ? parseInt(errorMatch[1]) : 0;

    if (errors > 0) {
      return {
        name: `ESLint (${errors} errors)`,
        passed: false,
        error: "Linting errors found. Run 'bun run lint' for details.",
        duration: Date.now() - start,
      };
    }

    // Extract warning count
    const warningMatch = output.match(/(\d+) warnings?/);
    const warnings = warningMatch ? parseInt(warningMatch[1]) : 0;

    return {
      name: `ESLint (0 errors, ${warnings} warnings)`,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (_error) {
    return {
      name: "ESLint",
      passed: false,
      error: "Linting failed. Run 'bun run lint' for details.",
      duration: Date.now() - start,
    };
  }
}

async function checkDatabaseFile(): Promise<CheckResult> {
  const dbPath = "packages/server/testforge.duckdb";
  const exists = existsSync(dbPath);

  return {
    name: "Database file exists",
    passed: exists,
    error: exists ? undefined : "Run 'bun run db:migrate' to create database",
  };
}

async function checkDependencies(): Promise<CheckResult> {
  const start = Date.now();
  const critical = [
    "packages/core/node_modules",
    "packages/server/node_modules",
    "packages/web/node_modules",
  ];

  const missing = critical.filter((dir) => !existsSync(dir));

  if (missing.length > 0) {
    return {
      name: "Dependencies installed",
      passed: false,
      error: `Missing node_modules in: ${missing.join(", ")}. Run 'bun install'`,
      duration: Date.now() - start,
    };
  }

  return {
    name: "Dependencies installed",
    passed: true,
    duration: Date.now() - start,
  };
}

async function checkBuildArtifacts(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await $`bun run build`.quiet();

    // Check for build outputs (core package is TypeScript-only, no build needed)
    const serverDist = existsSync("packages/server/dist");
    const webDist = existsSync("packages/web/dist");

    if (!serverDist || !webDist) {
      return {
        name: "Build artifacts",
        passed: false,
        error: "Some packages failed to build. Check build output.",
        duration: Date.now() - start,
      };
    }

    return {
      name: "Build artifacts",
      passed: true,
      duration: Date.now() - start,
    };
  } catch (_error) {
    return {
      name: "Build artifacts",
      passed: false,
      error: "Build failed. Run 'bun run build' for details.",
      duration: Date.now() - start,
    };
  }
}

async function checkAPIServer(): Promise<CheckResult> {
  const start = Date.now();

  try {
    // Start server in background
    const server = Bun.spawn(["bun", "run", "dev:server"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    // Wait for server to start (max 10 seconds)
    let serverReady = false;
    for (let i = 0; i < 50; i++) {
      try {
        const response = await fetch("http://localhost:3001/api/services", {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          serverReady = true;
          break;
        }
      } catch {
        // Server not ready yet, wait
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Kill server
    server.kill();

    if (!serverReady) {
      return {
        name: "API server startup",
        passed: false,
        error: "Server failed to start within 10 seconds. Check server logs.",
        duration: Date.now() - start,
      };
    }

    return {
      name: "API server startup",
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "API server startup",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

async function checkCriticalEndpoints(): Promise<CheckResult> {
  const start = Date.now();

  try {
    // Start server in background
    const server = Bun.spawn(["bun", "run", "dev:server"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    // Wait for server to start
    let serverReady = false;
    for (let i = 0; i < 50; i++) {
      try {
        const response = await fetch("http://localhost:3001/api/services", {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          serverReady = true;
          break;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (!serverReady) {
      server.kill();
      return {
        name: "Critical API endpoints",
        passed: false,
        error: "Server failed to start",
        duration: Date.now() - start,
      };
    }

    // Test critical endpoints
    const endpoints = [
      { path: "/api/services", method: "GET" },
      { path: "/api/components", method: "GET" },
      { path: "/api/runs", method: "GET" },
      { path: "/api/healing", method: "GET" },
      { path: "/api/healing/stats", method: "GET" },
      { path: "/api/runs/dashboard", method: "GET" },
      { path: "/api/registry", method: "GET" },
    ];

    const failures: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3001${endpoint.path}`, {
          method: endpoint.method,
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          failures.push(`${endpoint.method} ${endpoint.path}: ${response.status}`);
        }
      } catch (error) {
        failures.push(
          `${endpoint.method} ${endpoint.path}: ${error instanceof Error ? error.message : "error"}`
        );
      }
    }

    // Kill server
    server.kill();

    if (failures.length > 0) {
      return {
        name: "Critical API endpoints",
        passed: false,
        error: `Failed endpoints: ${failures.join(", ")}`,
        duration: Date.now() - start,
      };
    }

    return {
      name: `Critical API endpoints (${endpoints.length} tested)`,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Critical API endpoints",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

async function checkSeedData(): Promise<CheckResult> {
  const start = Date.now();

  try {
    // Import database connection to check seed data directly
    const { initDatabase } = await import("../packages/server/src/db/connection");
    const { resolve } = await import("path");

    const projectRoot = process.cwd();
    const dbPath = resolve(projectRoot, "packages/server/testforge.duckdb");

    const db = await initDatabase(dbPath);

    // Query services and components
    const services = await db.all("SELECT COUNT(*) as count FROM services");
    const components = await db.all("SELECT COUNT(*) as count FROM components");

    const servicesCount = services[0]?.count || 0;
    const componentsCount = components[0]?.count || 0;

    await db.close();

    const hasServices = servicesCount >= 2;
    const hasComponents = componentsCount >= 1;

    if (!hasServices || !hasComponents) {
      return {
        name: "Seed data validation",
        passed: false,
        error: `Missing seed data. Run 'bun run db:seed'. Found ${servicesCount} services, ${componentsCount} components.`,
        duration: Date.now() - start,
      };
    }

    return {
      name: `Seed data validation (${servicesCount} services, ${componentsCount} components)`,
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "Seed data validation",
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    };
  }
}

async function main() {
  log("\n🔍 TestForge Pre-QA Validation\n", "blue");
  log("This script validates that the system is ready for manual QA testing.\n", "cyan");

  // Phase 1: Static checks
  logStep("Phase 1: Static Analysis");
  addResult(await checkDependencies());
  addResult(await checkDatabaseFile());
  addResult(await checkTypeScript());
  addResult(await checkLint());

  // Phase 2: Tests
  logStep("Phase 2: Automated Tests");
  addResult(await checkTests());

  // Phase 3: Build
  logStep("Phase 3: Build Validation");
  addResult(await checkBuildArtifacts());

  // Phase 4: Runtime checks
  logStep("Phase 4: Runtime Validation");
  addResult(await checkAPIServer());
  addResult(await checkCriticalEndpoints());
  addResult(await checkSeedData());

  // Summary
  logStep("Summary");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  log(`\n  Total checks: ${total}`, "cyan");
  log(`  ✅ Passed: ${passed}`, "green");
  log(`  ❌ Failed: ${failed}`, failed > 0 ? "red" : "cyan");

  if (failed > 0) {
    log("\n⚠️  System is NOT ready for QA. Fix the issues above first.\n", "yellow");
    process.exit(1);
  } else {
    log("\n✅ All checks passed! System is ready for manual QA.\n", "green");
    log("Next steps:", "cyan");
    log("  1. Start servers: bun run dev", "cyan");
    log("  2. Open browser: http://localhost:3000", "cyan");
    log("  3. Follow QA checklist: docs/QA_CHECKLIST.md\n", "cyan");
    process.exit(0);
  }
}

main().catch((error) => {
  log(`\n❌ Validation script failed: ${error.message}\n`, "red");
  process.exit(1);
});
