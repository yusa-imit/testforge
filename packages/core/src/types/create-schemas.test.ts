import { describe, it, expect } from "bun:test";
import {
  createServiceSchema,
  createFeatureSchema,
  createScenarioSchema,
  createComponentSchema,
  variableSchema,
  navigateConfigSchema,
  clickConfigSchema,
  fillConfigSchema,
  selectConfigSchema,
  hoverConfigSchema,
  waitConfigSchema,
  assertConfigSchema,
  screenshotConfigSchema,
  apiRequestConfigSchema,
  apiAssertConfigSchema,
  componentConfigSchema,
  scriptConfigSchema,
  parameterDefSchema,
  stepConfigSchema,
} from "./index";

// ============================================================
// createServiceSchema
// ============================================================
describe("createServiceSchema", () => {
  const valid = {
    name: "My Service",
    baseUrl: "https://example.com",
  };

  it("accepts minimal valid service", () => {
    expect(createServiceSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional description", () => {
    const result = createServiceSchema.safeParse({
      ...valid,
      description: "A test service",
    });
    expect(result.success).toBe(true);
  });

  it("defaults defaultTimeout to 30000", () => {
    const result = createServiceSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultTimeout).toBe(30000);
    }
  });

  it("accepts custom defaultTimeout", () => {
    const result = createServiceSchema.safeParse({
      ...valid,
      defaultTimeout: 60000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultTimeout).toBe(60000);
    }
  });

  it("rejects missing name", () => {
    const result = createServiceSchema.safeParse({ baseUrl: "https://example.com" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createServiceSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing baseUrl", () => {
    const result = createServiceSchema.safeParse({ name: "My Service" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid baseUrl (not a URL)", () => {
    const result = createServiceSchema.safeParse({ ...valid, baseUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("does not include id, createdAt, updatedAt fields", () => {
    const result = createServiceSchema.safeParse(valid);
    if (result.success) {
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
      expect((result.data as Record<string, unknown>).createdAt).toBeUndefined();
      expect((result.data as Record<string, unknown>).updatedAt).toBeUndefined();
    }
  });
});

// ============================================================
// createFeatureSchema
// ============================================================
describe("createFeatureSchema", () => {
  const validServiceId = "550e8400-e29b-41d4-a716-446655440001";
  const valid = {
    serviceId: validServiceId,
    name: "User Authentication",
  };

  it("accepts minimal valid feature", () => {
    expect(createFeatureSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults owners to empty array", () => {
    const result = createFeatureSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owners).toEqual([]);
    }
  });

  it("accepts owners array", () => {
    const result = createFeatureSchema.safeParse({
      ...valid,
      owners: ["alice@example.com", "bob@example.com"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owners).toHaveLength(2);
    }
  });

  it("rejects missing serviceId", () => {
    const result = createFeatureSchema.safeParse({ name: "Feature" });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID serviceId", () => {
    const result = createFeatureSchema.safeParse({ ...valid, serviceId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createFeatureSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createScenarioSchema
// ============================================================
describe("createScenarioSchema", () => {
  const validFeatureId = "550e8400-e29b-41d4-a716-446655440002";
  const valid = {
    featureId: validFeatureId,
    name: "Login Flow",
  };

  it("accepts minimal valid scenario", () => {
    expect(createScenarioSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults priority to medium", () => {
    const result = createScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
    }
  });

  it("defaults tags to empty array", () => {
    const result = createScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it("defaults steps to empty array", () => {
    const result = createScenarioSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toEqual([]);
    }
  });

  it("accepts all priority values", () => {
    for (const priority of ["critical", "high", "medium", "low"]) {
      const result = createScenarioSchema.safeParse({ ...valid, priority });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid priority", () => {
    const result = createScenarioSchema.safeParse({ ...valid, priority: "urgent" });
    expect(result.success).toBe(false);
  });

  it("rejects missing featureId", () => {
    const result = createScenarioSchema.safeParse({ name: "Scenario" });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID featureId", () => {
    const result = createScenarioSchema.safeParse({ ...valid, featureId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepts optional description", () => {
    const result = createScenarioSchema.safeParse({ ...valid, description: "Test desc" });
    expect(result.success).toBe(true);
  });

  it("accepts variables array", () => {
    const result = createScenarioSchema.safeParse({
      ...valid,
      variables: [{ name: "email", type: "string", defaultValue: "test@test.com" }],
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// createComponentSchema
// ============================================================
describe("createComponentSchema", () => {
  const valid = {
    name: "Login Component",
    type: "flow",
  };

  it("accepts minimal valid component", () => {
    expect(createComponentSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults parameters and steps to empty arrays", () => {
    const result = createComponentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parameters).toEqual([]);
      expect(result.data.steps).toEqual([]);
    }
  });

  it("accepts all component types", () => {
    for (const type of ["flow", "assertion", "setup", "teardown"]) {
      const result = createComponentSchema.safeParse({ ...valid, type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid component type", () => {
    const result = createComponentSchema.safeParse({ ...valid, type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createComponentSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// variableSchema
// ============================================================
describe("variableSchema", () => {
  it("accepts string variable", () => {
    const result = variableSchema.safeParse({ name: "email", type: "string" });
    expect(result.success).toBe(true);
  });

  it("accepts number variable with defaultValue", () => {
    const result = variableSchema.safeParse({
      name: "count",
      type: "number",
      defaultValue: 42,
    });
    expect(result.success).toBe(true);
  });

  it("accepts boolean variable", () => {
    const result = variableSchema.safeParse({ name: "isActive", type: "boolean" });
    expect(result.success).toBe(true);
  });

  it("accepts json variable", () => {
    const result = variableSchema.safeParse({
      name: "payload",
      type: "json",
      defaultValue: { key: "value" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = variableSchema.safeParse({ name: "x", type: "array" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = variableSchema.safeParse({ name: "", type: "string" });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// parameterDefSchema
// ============================================================
describe("parameterDefSchema", () => {
  it("accepts required string parameter", () => {
    const result = parameterDefSchema.safeParse({
      name: "username",
      type: "string",
    });
    expect(result.success).toBe(true);
  });

  it("defaults required to true", () => {
    const result = parameterDefSchema.safeParse({ name: "x", type: "string" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(true);
    }
  });

  it("accepts enum parameter with options", () => {
    const result = parameterDefSchema.safeParse({
      name: "env",
      type: "enum",
      options: ["dev", "staging", "prod"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional parameter with defaultValue", () => {
    const result = parameterDefSchema.safeParse({
      name: "timeout",
      type: "number",
      required: false,
      defaultValue: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = parameterDefSchema.safeParse({ name: "x", type: "object" });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Step Config Schemas
// ============================================================

describe("navigateConfigSchema", () => {
  it("accepts valid navigate config", () => {
    const result = navigateConfigSchema.safeParse({ url: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts relative URL", () => {
    const result = navigateConfigSchema.safeParse({ url: "/dashboard" });
    expect(result.success).toBe(true);
  });

  it("rejects missing url", () => {
    const result = navigateConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("clickConfigSchema", () => {
  const locator = {
    displayName: "Submit Button",
    strategies: [{ type: "testId", value: "submit-btn", priority: 1 }],
    healing: {},
  };

  it("accepts minimal click config", () => {
    const result = clickConfigSchema.safeParse({ locator });
    expect(result.success).toBe(true);
  });

  it("defaults button to left and clickCount to 1", () => {
    const result = clickConfigSchema.safeParse({ locator });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.button).toBe("left");
      expect(result.data.clickCount).toBe(1);
    }
  });

  it("accepts right-click config", () => {
    const result = clickConfigSchema.safeParse({ locator, button: "right" });
    expect(result.success).toBe(true);
  });

  it("accepts double-click config", () => {
    const result = clickConfigSchema.safeParse({ locator, clickCount: 2 });
    expect(result.success).toBe(true);
  });

  it("rejects invalid button value", () => {
    const result = clickConfigSchema.safeParse({ locator, button: "side" });
    expect(result.success).toBe(false);
  });
});

describe("fillConfigSchema", () => {
  const locator = {
    displayName: "Email Input",
    strategies: [{ type: "label", value: "Email", priority: 1 }],
    healing: {},
  };

  it("accepts valid fill config", () => {
    const result = fillConfigSchema.safeParse({ locator, value: "test@example.com" });
    expect(result.success).toBe(true);
  });

  it("defaults clearBefore to true", () => {
    const result = fillConfigSchema.safeParse({ locator, value: "text" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clearBefore).toBe(true);
    }
  });

  it("rejects missing value", () => {
    const result = fillConfigSchema.safeParse({ locator });
    expect(result.success).toBe(false);
  });
});

describe("selectConfigSchema", () => {
  const locator = {
    displayName: "Dropdown",
    strategies: [{ type: "css", selector: "select#role", priority: 1 }],
    healing: {},
  };

  it("accepts valid select config", () => {
    const result = selectConfigSchema.safeParse({ locator, value: "admin" });
    expect(result.success).toBe(true);
  });

  it("rejects missing value", () => {
    const result = selectConfigSchema.safeParse({ locator });
    expect(result.success).toBe(false);
  });

  it("rejects missing locator", () => {
    const result = selectConfigSchema.safeParse({ value: "admin" });
    expect(result.success).toBe(false);
  });
});

describe("hoverConfigSchema", () => {
  const locator = {
    displayName: "Tooltip Trigger",
    strategies: [{ type: "role", role: "button", name: "Info", priority: 1 }],
    healing: {},
  };

  it("accepts valid hover config", () => {
    const result = hoverConfigSchema.safeParse({ locator });
    expect(result.success).toBe(true);
  });

  it("rejects missing locator", () => {
    const result = hoverConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("waitConfigSchema", () => {
  it("accepts wait-time config", () => {
    const result = waitConfigSchema.safeParse({ type: "time", timeout: 2000 });
    expect(result.success).toBe(true);
  });

  it("accepts wait-navigation config", () => {
    const result = waitConfigSchema.safeParse({ type: "navigation" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid wait type", () => {
    const result = waitConfigSchema.safeParse({ type: "api" });
    expect(result.success).toBe(false);
  });
});

describe("assertConfigSchema", () => {
  it("accepts visible assertion", () => {
    const locator = {
      displayName: "Header",
      strategies: [{ type: "css", selector: "h1", priority: 1 }],
      healing: {},
    };
    const result = assertConfigSchema.safeParse({ type: "visible", locator });
    expect(result.success).toBe(true);
  });

  it("accepts url assertion without locator", () => {
    const result = assertConfigSchema.safeParse({
      type: "url",
      expected: "https://example.com/dashboard",
    });
    expect(result.success).toBe(true);
  });

  it("accepts title assertion", () => {
    const result = assertConfigSchema.safeParse({ type: "title", expected: "Dashboard" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid assertion type", () => {
    const result = assertConfigSchema.safeParse({ type: "contains" });
    expect(result.success).toBe(false);
  });
});

describe("screenshotConfigSchema", () => {
  it("accepts empty config (all optional)", () => {
    const result = screenshotConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("defaults fullPage to false", () => {
    const result = screenshotConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullPage).toBe(false);
    }
  });

  it("accepts full config", () => {
    const result = screenshotConfigSchema.safeParse({ name: "home-page", fullPage: true });
    expect(result.success).toBe(true);
  });
});

describe("apiRequestConfigSchema", () => {
  it("accepts GET request config", () => {
    const result = apiRequestConfigSchema.safeParse({
      method: "GET",
      url: "https://api.example.com/users",
    });
    expect(result.success).toBe(true);
  });

  it("accepts POST with body", () => {
    const result = apiRequestConfigSchema.safeParse({
      method: "POST",
      url: "https://api.example.com/users",
      body: { name: "Alice" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all HTTP methods", () => {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      const result = apiRequestConfigSchema.safeParse({
        method,
        url: "https://api.example.com",
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts headers", () => {
    const result = apiRequestConfigSchema.safeParse({
      method: "GET",
      url: "https://api.example.com",
      headers: { Authorization: "Bearer token123" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts saveResponseAs", () => {
    const result = apiRequestConfigSchema.safeParse({
      method: "GET",
      url: "https://api.example.com/users",
      saveResponseAs: "users_response",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid HTTP method", () => {
    const result = apiRequestConfigSchema.safeParse({
      method: "CONNECT",
      url: "https://api.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing url", () => {
    const result = apiRequestConfigSchema.safeParse({ method: "GET" });
    expect(result.success).toBe(false);
  });
});

describe("apiAssertConfigSchema", () => {
  it("accepts status assertion", () => {
    const result = apiAssertConfigSchema.safeParse({ type: "status", status: 200 });
    expect(result.success).toBe(true);
  });

  it("accepts body assertion with path and operator", () => {
    const result = apiAssertConfigSchema.safeParse({
      type: "body",
      path: "data.users[0].name",
      expected: "Alice",
      operator: "equals",
    });
    expect(result.success).toBe(true);
  });

  it("accepts header assertion", () => {
    const result = apiAssertConfigSchema.safeParse({
      type: "header",
      headerName: "Content-Type",
      expected: "application/json",
    });
    expect(result.success).toBe(true);
  });

  it("defaults operator to equals", () => {
    const result = apiAssertConfigSchema.safeParse({ type: "status", status: 201 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operator).toBe("equals");
    }
  });

  it("accepts all assertion types", () => {
    for (const type of ["status", "body", "header"]) {
      const result = apiAssertConfigSchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all operator values", () => {
    for (const operator of ["equals", "contains", "matches", "exists", "type"]) {
      const result = apiAssertConfigSchema.safeParse({ type: "body", operator });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid assertion type", () => {
    const result = apiAssertConfigSchema.safeParse({ type: "cookies" });
    expect(result.success).toBe(false);
  });
});

describe("componentConfigSchema", () => {
  const validComponentId = "550e8400-e29b-41d4-a716-446655440010";

  it("accepts minimal component step", () => {
    const result = componentConfigSchema.safeParse({ componentId: validComponentId });
    expect(result.success).toBe(true);
  });

  it("accepts parameters map", () => {
    const result = componentConfigSchema.safeParse({
      componentId: validComponentId,
      parameters: { username: "alice", password: "secret" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID componentId", () => {
    const result = componentConfigSchema.safeParse({ componentId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing componentId", () => {
    const result = componentConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("scriptConfigSchema", () => {
  it("accepts valid script config", () => {
    const result = scriptConfigSchema.safeParse({ code: "return 42;" });
    expect(result.success).toBe(true);
  });

  it("accepts saveResultAs", () => {
    const result = scriptConfigSchema.safeParse({
      code: "return document.title;",
      saveResultAs: "pageTitle",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = scriptConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("stepConfigSchema (union)", () => {
  it("parses navigate config", () => {
    const result = stepConfigSchema.safeParse({ url: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("parses screenshot config (empty)", () => {
    const result = stepConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("parses api-request config", () => {
    const result = stepConfigSchema.safeParse({
      method: "GET",
      url: "https://api.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("parses script config", () => {
    const result = stepConfigSchema.safeParse({ code: "console.log('hello');" });
    expect(result.success).toBe(true);
  });
});
