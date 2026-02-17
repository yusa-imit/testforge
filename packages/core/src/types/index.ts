import { z } from "zod";

// ============================================
// Service - 테스트 대상 애플리케이션의 최상위 단위
// ============================================

export const serviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  baseUrl: z.string().url(),
  defaultTimeout: z.number().default(30000),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceSchema = serviceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateService = z.infer<typeof createServiceSchema>;

// ============================================
// Feature - 서비스 내 논리적 기능 단위
// ============================================

export const featureSchema = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  owners: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Feature = z.infer<typeof featureSchema>;

export const createFeatureSchema = featureSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateFeature = z.infer<typeof createFeatureSchema>;

// ============================================
// Variable - 시나리오에서 사용할 변수
// ============================================

export const variableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "json"]),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
});

export type Variable = z.infer<typeof variableSchema>;

// ============================================
// Locator Strategy - 다층 셀렉터 전략
// ============================================

export const locatorStrategySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("testId"),
    value: z.string(),
    priority: z.number(),
  }),
  z.object({
    type: z.literal("role"),
    role: z.string(),
    name: z.string().optional(),
    priority: z.number(),
  }),
  z.object({
    type: z.literal("text"),
    value: z.string(),
    exact: z.boolean().default(true),
    priority: z.number(),
  }),
  z.object({
    type: z.literal("label"),
    value: z.string(),
    priority: z.number(),
  }),
  z.object({
    type: z.literal("css"),
    selector: z.string(),
    priority: z.number(),
  }),
  z.object({
    type: z.literal("xpath"),
    expression: z.string(),
    priority: z.number(),
  }),
  z.object({
    type: z.literal("api-path"),
    path: z.string(),
    priority: z.number(),
  }),
]);

export type LocatorStrategy = z.infer<typeof locatorStrategySchema>;

// ============================================
// Element Locator - Self-Healing의 핵심
// ============================================

export const elementLocatorSchema = z.object({
  displayName: z.string(),
  strategies: z.array(locatorStrategySchema),
  healing: z.object({
    enabled: z.boolean().default(true),
    autoApprove: z.boolean().default(false),
    confidenceThreshold: z.number().min(0).max(1).default(0.9),
  }),
});

export type ElementLocator = z.infer<typeof elementLocatorSchema>;

// ============================================
// Step Types and Configs
// ============================================

export const stepTypeSchema = z.enum([
  "navigate",
  "click",
  "fill",
  "select",
  "hover",
  "wait",
  "assert",
  "screenshot",
  "api-request",
  "api-assert",
  "component",
  "script",
]);

export type StepType = z.infer<typeof stepTypeSchema>;

// Navigate Step
export const navigateConfigSchema = z.object({
  url: z.string(),
});

// Click Step
export const clickConfigSchema = z.object({
  locator: elementLocatorSchema,
  button: z.enum(["left", "right", "middle"]).default("left"),
  clickCount: z.number().default(1),
});

// Fill Step
export const fillConfigSchema = z.object({
  locator: elementLocatorSchema,
  value: z.string(),
  clearBefore: z.boolean().default(true),
});

// Select Step
export const selectConfigSchema = z.object({
  locator: elementLocatorSchema,
  value: z.string(),
});

// Hover Step
export const hoverConfigSchema = z.object({
  locator: elementLocatorSchema,
});

// Wait Step
export const waitConfigSchema = z.object({
  type: z.enum(["time", "element", "navigation"]),
  timeout: z.number().optional(),
  locator: elementLocatorSchema.optional(),
});

// Assert Step
export const assertConfigSchema = z.object({
  type: z.enum([
    "visible",
    "hidden",
    "text",
    "value",
    "attribute",
    "url",
    "title",
  ]),
  locator: elementLocatorSchema.optional(),
  expected: z.string().optional(),
  attribute: z.string().optional(),
});

// Screenshot Step
export const screenshotConfigSchema = z.object({
  name: z.string().optional(),
  fullPage: z.boolean().default(false),
});

// API Request Step
export const apiRequestConfigSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string(),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  saveResponseAs: z.string().optional(), // Store response for later assertions
});

// API Assert Step
export const apiAssertConfigSchema = z.object({
  type: z.enum(["status", "body", "header"]),
  path: z.string().optional(),
  expected: z.any().optional(),
  operator: z.enum(["equals", "contains", "matches", "exists", "type"]).default("equals"),
  // Status assertion
  status: z.number().optional(),
  // Header assertion
  headerName: z.string().optional(),
  // Response reference (optional, defaults to last response)
  responseRef: z.string().optional(),
});

// Component Step
export const componentConfigSchema = z.object({
  componentId: z.string().uuid(),
  parameters: z.record(z.any()).optional(),
});

// Script Step
export const scriptConfigSchema = z.object({
  code: z.string(),
  saveResultAs: z.string().optional(), // Save the script return value to a variable
});

export const stepConfigSchema = z.union([
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
]);

export type StepConfig = z.infer<typeof stepConfigSchema>;

// ============================================
// Step - 시나리오 내 개별 실행 단위
// ============================================

export const stepSchema = z.object({
  id: z.string().uuid(),
  type: stepTypeSchema,
  description: z.string(),
  timeout: z.number().optional(),
  continueOnError: z.boolean().default(false),
  config: stepConfigSchema,
});

export type Step = z.infer<typeof stepSchema>;

// ============================================
// Scenario - 실제 테스트 케이스
// ============================================

export const scenarioPrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export type ScenarioPriority = z.infer<typeof scenarioPrioritySchema>;

export const scenarioSchema = z.object({
  id: z.string().uuid(),
  featureId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priority: scenarioPrioritySchema.default("medium"),
  variables: z.array(variableSchema).default([]),
  steps: z.array(stepSchema).default([]),
  version: z.number().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Scenario = z.infer<typeof scenarioSchema>;

export const createScenarioSchema = scenarioSchema.omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateScenario = z.infer<typeof createScenarioSchema>;

// ============================================
// Component - 재사용 가능한 스텝 묶음
// ============================================

export const componentTypeSchema = z.enum(["flow", "assertion", "setup", "teardown"]);

export type ComponentType = z.infer<typeof componentTypeSchema>;

export const parameterDefSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "enum"]),
  required: z.boolean().default(true),
  defaultValue: z.any().optional(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export type ParameterDef = z.infer<typeof parameterDefSchema>;

export const componentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: componentTypeSchema,
  parameters: z.array(parameterDefSchema).default([]),
  steps: z.array(stepSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Component = z.infer<typeof componentSchema>;

export const createComponentSchema = componentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateComponent = z.infer<typeof createComponentSchema>;

// ============================================
// Test Run - 실행
// ============================================

export const runStatusSchema = z.enum([
  "pending",
  "running",
  "passed",
  "failed",
  "cancelled",
]);

export type RunStatus = z.infer<typeof runStatusSchema>;

export const testRunSchema = z.object({
  id: z.string().uuid(),
  scenarioId: z.string().uuid(),
  status: runStatusSchema,
  startedAt: z.date().optional(),
  finishedAt: z.date().optional(),
  duration: z.number().optional(),
  environment: z.object({
    baseUrl: z.string(),
    variables: z.record(z.any()),
  }),
  summary: z
    .object({
      totalSteps: z.number(),
      passedSteps: z.number(),
      failedSteps: z.number(),
      skippedSteps: z.number(),
      healedSteps: z.number(),
    })
    .optional(),
  createdAt: z.date(),
});

export type TestRun = z.infer<typeof testRunSchema>;

// ============================================
// Step Result - 스텝 결과
// ============================================

export const stepResultStatusSchema = z.enum(["passed", "failed", "skipped", "healed"]);

export type StepResultStatus = z.infer<typeof stepResultStatusSchema>;

export const stepResultSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepId: z.string().uuid(),
  stepIndex: z.number(),
  status: stepResultStatusSchema,
  duration: z.number(),
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  healing: z
    .object({
      originalStrategy: locatorStrategySchema,
      usedStrategy: locatorStrategySchema,
      confidence: z.number(),
    })
    .optional(),
  context: z
    .object({
      screenshotPath: z.string().optional(),
      htmlSnapshotPath: z.string().optional(),
      consoleLog: z.array(z.string()).optional(),
    })
    .optional(),
  createdAt: z.date(),
});

export type StepResult = z.infer<typeof stepResultSchema>;

// ============================================
// Healing Record - 치유 기록
// ============================================

export const healingTriggerSchema = z.enum([
  "element_not_found",
  "multiple_matches",
  "wrong_element",
  "api_path_changed",
]);

export type HealingTrigger = z.infer<typeof healingTriggerSchema>;

export const healingStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "auto_approved",
]);

export type HealingStatus = z.infer<typeof healingStatusSchema>;

export const healingRecordSchema = z.object({
  id: z.string().uuid(),
  scenarioId: z.string().uuid(),
  stepId: z.string().uuid(),
  runId: z.string().uuid(),
  locatorDisplayName: z.string(),
  originalStrategy: locatorStrategySchema,
  healedStrategy: locatorStrategySchema,
  trigger: healingTriggerSchema,
  confidence: z.number().min(0).max(1),
  status: healingStatusSchema,
  reviewedBy: z.string().optional(),
  reviewedAt: z.date().optional(),
  reviewNote: z.string().optional(),
  propagatedTo: z.array(z.string()).optional(),
  createdAt: z.date(),
});

export type HealingRecord = z.infer<typeof healingRecordSchema>;

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
