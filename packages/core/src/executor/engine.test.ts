import { describe, it, expect } from "bun:test";
import { TestExecutor } from "./engine";
import type { Component, Step, Scenario, StepResult } from "../types";

/**
 * TestExecutorTestable exposes private methods for unit testing.
 * This avoids touching engine internals while still allowing us
 * to verify the pure utility functions.
 */
class TestExecutorTestable extends TestExecutor {
  public testInterpolate(text: string, variables: Record<string, unknown>) {
    // @ts-expect-error accessing private method for testing
    return this.interpolate(text, variables);
  }

  public testBindComponentParameters(
    component: Component,
    providedParams: Record<string, unknown>,
    variables: Record<string, unknown>
  ) {
    // @ts-expect-error accessing private method for testing
    return this.bindComponentParameters(component, providedParams, variables);
  }

  public testApplyParametersToConfig(
    config: unknown,
    variables: Record<string, unknown>
  ) {
    // @ts-expect-error accessing private method for testing
    return this.applyParametersToConfig(config, variables);
  }

  public testDetermineRunStatus(results: StepResult[]) {
    // @ts-expect-error accessing private method for testing
    return this.determineRunStatus(results);
  }

  public testBuildVariables(
    scenario: Pick<Scenario, "variables">,
    overrides: Record<string, unknown>
  ) {
    // @ts-expect-error accessing private method for testing
    return this.buildVariables(scenario, overrides);
  }
}

// Helper factories
const _makeStep = (overrides: Partial<Step> = {}): Step => ({
  id: "00000000-0000-0000-0000-000000000001",
  type: "navigate",
  description: "Navigate to page",
  continueOnError: false,
  config: { url: "https://example.com" },
  ...overrides,
});

const makeStepResult = (
  status: "passed" | "failed" | "skipped" | "healed"
): StepResult => ({
  id: "00000000-0000-0000-0000-000000000099",
  runId: "00000000-0000-0000-0000-000000000001",
  stepId: "00000000-0000-0000-0000-000000000001",
  stepIndex: 0,
  status,
  duration: 100,
  createdAt: new Date("2026-01-01"),
});

const makeComponent = (overrides: Partial<Component> = {}): Component => ({
  id: "00000000-0000-0000-0000-000000000010",
  name: "Login Flow",
  type: "flow",
  parameters: [],
  steps: [],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

// ============================================================
// interpolate()
// ============================================================
describe("TestExecutor.interpolate", () => {
  const executor = new TestExecutorTestable();

  it("replaces a single variable", () => {
    expect(executor.testInterpolate("Hello {{name}}", { name: "World" })).toBe(
      "Hello World"
    );
  });

  it("replaces multiple variables", () => {
    expect(
      executor.testInterpolate("{{greeting}}, {{name}}!", {
        greeting: "Hi",
        name: "Alice",
      })
    ).toBe("Hi, Alice!");
  });

  it("leaves unknown variables as-is with braces", () => {
    expect(executor.testInterpolate("Hello {{unknown}}", {})).toBe(
      "Hello {{unknown}}"
    );
  });

  it("returns the original string when there are no placeholders", () => {
    expect(executor.testInterpolate("No placeholders", { name: "X" })).toBe(
      "No placeholders"
    );
  });

  it("returns empty string unchanged", () => {
    expect(executor.testInterpolate("", {})).toBe("");
  });

  it("replaces the same variable appearing multiple times", () => {
    expect(
      executor.testInterpolate("{{x}} and {{x}}", { x: "foo" })
    ).toBe("foo and foo");
  });

  it("converts non-string variable values to string", () => {
    expect(executor.testInterpolate("Count: {{n}}", { n: 42 })).toBe(
      "Count: 42"
    );
  });

  it("handles adjacent variables", () => {
    expect(
      executor.testInterpolate("{{a}}{{b}}", { a: "hello", b: "world" })
    ).toBe("helloworld");
  });
});

// ============================================================
// applyParametersToConfig()
// ============================================================
describe("TestExecutor.applyParametersToConfig", () => {
  const executor = new TestExecutorTestable();

  it("interpolates a plain string config", () => {
    expect(
      executor.testApplyParametersToConfig("{{url}}", { url: "https://example.com" })
    ).toBe("https://example.com");
  });

  it("interpolates strings inside an object", () => {
    const result = executor.testApplyParametersToConfig(
      { url: "{{baseUrl}}/login", method: "POST" },
      { baseUrl: "https://api.example.com" }
    );
    expect(result).toEqual({
      url: "https://api.example.com/login",
      method: "POST",
    });
  });

  it("interpolates strings inside nested objects", () => {
    const result = executor.testApplyParametersToConfig(
      { headers: { Authorization: "Bearer {{token}}" } },
      { token: "abc123" }
    );
    expect(result).toEqual({ headers: { Authorization: "Bearer abc123" } });
  });

  it("interpolates strings inside arrays", () => {
    const result = executor.testApplyParametersToConfig(
      ["{{a}}", "{{b}}", "literal"],
      { a: "hello", b: "world" }
    );
    expect(result).toEqual(["hello", "world", "literal"]);
  });

  it("passes through numbers unchanged", () => {
    expect(executor.testApplyParametersToConfig(42, {})).toBe(42);
  });

  it("passes through booleans unchanged", () => {
    expect(executor.testApplyParametersToConfig(true, {})).toBe(true);
    expect(executor.testApplyParametersToConfig(false, {})).toBe(false);
  });

  it("passes through null unchanged", () => {
    expect(executor.testApplyParametersToConfig(null, {})).toBe(null);
  });

  it("passes through undefined unchanged", () => {
    expect(executor.testApplyParametersToConfig(undefined, {})).toBe(undefined);
  });

  it("handles deeply nested structures", () => {
    const result = executor.testApplyParametersToConfig(
      { a: { b: { c: "{{val}}" } } },
      { val: "deep" }
    );
    expect(result).toEqual({ a: { b: { c: "deep" } } });
  });
});

// ============================================================
// determineRunStatus()
// ============================================================
describe("TestExecutor.determineRunStatus", () => {
  const executor = new TestExecutorTestable();

  it("returns 'passed' when all steps passed", () => {
    const results = [
      makeStepResult("passed"),
      makeStepResult("passed"),
      makeStepResult("passed"),
    ];
    expect(executor.testDetermineRunStatus(results)).toBe("passed");
  });

  it("returns 'failed' when at least one step failed", () => {
    const results = [
      makeStepResult("passed"),
      makeStepResult("failed"),
      makeStepResult("passed"),
    ];
    expect(executor.testDetermineRunStatus(results)).toBe("failed");
  });

  it("returns 'failed' when all steps failed", () => {
    const results = [makeStepResult("failed"), makeStepResult("failed")];
    expect(executor.testDetermineRunStatus(results)).toBe("failed");
  });

  it("returns 'passed' when steps are healed (not failed)", () => {
    const results = [makeStepResult("passed"), makeStepResult("healed")];
    expect(executor.testDetermineRunStatus(results)).toBe("passed");
  });

  it("returns 'passed' when steps are skipped (not failed)", () => {
    const results = [makeStepResult("skipped"), makeStepResult("passed")];
    expect(executor.testDetermineRunStatus(results)).toBe("passed");
  });

  it("returns 'passed' for an empty result list", () => {
    expect(executor.testDetermineRunStatus([])).toBe("passed");
  });
});

// ============================================================
// buildVariables()
// ============================================================
describe("TestExecutor.buildVariables", () => {
  const executor = new TestExecutorTestable();

  it("uses scenario variable default values", () => {
    const scenario = {
      variables: [
        { name: "username", type: "string" as const, defaultValue: "admin" },
        { name: "timeout", type: "number" as const, defaultValue: 5000 },
      ],
    };
    const result = executor.testBuildVariables(scenario, {});
    expect(result).toEqual({ username: "admin", timeout: 5000 });
  });

  it("allows overrides to take precedence over defaults", () => {
    const scenario = {
      variables: [{ name: "env", type: "string" as const, defaultValue: "dev" }],
    };
    const result = executor.testBuildVariables(scenario, { env: "prod" });
    expect(result).toEqual({ env: "prod" });
  });

  it("merges scenario defaults with overrides", () => {
    const scenario = {
      variables: [
        { name: "username", type: "string" as const, defaultValue: "admin" },
        { name: "baseUrl", type: "string" as const, defaultValue: "http://localhost" },
      ],
    };
    const result = executor.testBuildVariables(scenario, {
      baseUrl: "https://staging.example.com",
    });
    expect(result).toEqual({
      username: "admin",
      baseUrl: "https://staging.example.com",
    });
  });

  it("returns only overrides when there are no scenario variables", () => {
    const scenario = { variables: [] };
    const result = executor.testBuildVariables(scenario, { extra: "value" });
    expect(result).toEqual({ extra: "value" });
  });

  it("returns empty object when no variables and no overrides", () => {
    const scenario = { variables: [] };
    expect(executor.testBuildVariables(scenario, {})).toEqual({});
  });
});

// ============================================================
// bindComponentParameters()
// ============================================================
describe("TestExecutor.bindComponentParameters", () => {
  const executor = new TestExecutorTestable();

  it("binds a required parameter from providedParams", () => {
    const component = makeComponent({
      parameters: [
        { name: "email", type: "string", required: true },
      ],
    });
    const result = executor.testBindComponentParameters(
      component,
      { email: "test@example.com" },
      {}
    );
    expect(result.email).toBe("test@example.com");
  });

  it("uses parameter default when value is not provided", () => {
    const component = makeComponent({
      parameters: [
        {
          name: "retries",
          type: "number",
          required: false,
          defaultValue: 3,
        },
      ],
    });
    const result = executor.testBindComponentParameters(component, {}, {});
    expect(result.retries).toBe(3);
  });

  it("throws when a required parameter is missing", () => {
    const component = makeComponent({
      name: "Critical Flow",
      parameters: [
        { name: "apiKey", type: "string", required: true },
      ],
    });
    expect(() =>
      executor.testBindComponentParameters(component, {}, {})
    ).toThrow("Required parameter 'apiKey' not provided for component 'Critical Flow'");
  });

  it("interpolates variable references in parameter values", () => {
    const component = makeComponent({
      parameters: [
        { name: "url", type: "string", required: true },
      ],
    });
    const result = executor.testBindComponentParameters(
      component,
      { url: "{{baseUrl}}/endpoint" },
      { baseUrl: "https://api.example.com" }
    );
    expect(result.url).toBe("https://api.example.com/endpoint");
  });

  it("inherits existing variables from scope", () => {
    const component = makeComponent({ parameters: [] });
    const variables = { sessionToken: "abc123", userId: "42" };
    const result = executor.testBindComponentParameters(component, {}, variables);
    expect(result.sessionToken).toBe("abc123");
    expect(result.userId).toBe("42");
  });

  it("component parameter overrides inherited variable of same name", () => {
    const component = makeComponent({
      parameters: [
        { name: "env", type: "string", required: false, defaultValue: "test" },
      ],
    });
    const result = executor.testBindComponentParameters(
      component,
      { env: "production" },
      { env: "staging" }
    );
    // Provided param takes precedence over both default and inherited variable
    expect(result.env).toBe("production");
  });
});
