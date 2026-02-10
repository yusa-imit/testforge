import { chromium, Browser, BrowserContext, Page } from "playwright";
import { v4 as uuid } from "uuid";
import type {
  Scenario,
  Step,
  TestRun,
  StepResult,
  RunStatus,
  StepResultStatus,
  Service,
  ElementLocator,
  Component,
} from "../types";
import { LocatorResolver, ElementNotFoundError } from "../locator/resolver";
import { HealingTracker, type HealingEvent } from "../healing/tracker";

export interface ExecutionOptions {
  headless?: boolean;
  timeout?: number;
  variables?: Record<string, any>;
  onStepStart?: (step: Step, index: number) => void;
  onStepComplete?: (result: StepResult) => void;
  onHealing?: (event: HealingEvent) => void;
  componentLoader?: (componentId: string) => Promise<Component | undefined>;
}

export interface ExecutionResult {
  run: TestRun;
  stepResults: StepResult[];
  healingEvents: HealingEvent[];
}

/**
 * TestExecutor - 테스트 실행 엔진
 */
export class TestExecutor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private locatorResolver: LocatorResolver;
  private healingTracker: HealingTracker;

  constructor() {
    this.locatorResolver = new LocatorResolver();
    this.healingTracker = new HealingTracker();
  }

  /**
   * 시나리오를 실행합니다.
   */
  async execute(
    scenario: Scenario,
    service: Service,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const {
      headless = true,
      timeout = service.defaultTimeout,
      variables = {},
      onStepStart,
      onStepComplete,
      onHealing,
      componentLoader,
    } = options;

    // 실행 기록 생성
    const run: TestRun = {
      id: uuid(),
      scenarioId: scenario.id,
      status: "running",
      environment: {
        baseUrl: service.baseUrl,
        variables: { ...this.buildVariables(scenario, variables) },
      },
      createdAt: new Date(),
      startedAt: new Date(),
    };

    const stepResults: StepResult[] = [];
    const healingEvents: HealingEvent[] = [];

    try {
      // 브라우저 초기화
      await this.initBrowser(headless, timeout);

      // 기본 URL로 이동
      await this.page!.goto(service.baseUrl);

      // 스텝 확장 (컴포넌트 포함)
      const expandedSteps = await this.expandSteps(
        scenario.steps,
        run.environment.variables,
        componentLoader
      );

      // 스텝 실행
      for (let i = 0; i < expandedSteps.length; i++) {
        const step = expandedSteps[i];

        onStepStart?.(step, i);

        const result = await this.executeStep(
          step,
          i,
          run.id,
          run.environment.variables,
          timeout
        );

        stepResults.push(result);

        // Healing 이벤트 처리
        if (result.healing) {
          const event: HealingEvent = {
            scenarioId: scenario.id,
            stepId: step.id,
            runId: run.id,
            locatorDisplayName: this.getLocatorDisplayName(step),
            originalStrategy: result.healing.originalStrategy,
            healedStrategy: result.healing.usedStrategy,
            confidence: result.healing.confidence,
          };
          healingEvents.push(event);
          onHealing?.(event);
        }

        onStepComplete?.(result);

        // 실패 시 중단 (continueOnError가 아닌 경우)
        if (result.status === "failed" && !step.continueOnError) {
          break;
        }
      }

      // 결과 집계
      run.finishedAt = new Date();
      run.duration = run.finishedAt.getTime() - run.startedAt!.getTime();
      run.status = this.determineRunStatus(stepResults);
      run.summary = {
        totalSteps: scenario.steps.length,
        passedSteps: stepResults.filter((r) => r.status === "passed").length,
        failedSteps: stepResults.filter((r) => r.status === "failed").length,
        skippedSteps: stepResults.filter((r) => r.status === "skipped").length,
        healedSteps: stepResults.filter((r) => r.status === "healed").length,
      };
    } catch (error) {
      run.status = "failed";
      run.finishedAt = new Date();
      run.duration = run.finishedAt.getTime() - run.startedAt!.getTime();
    } finally {
      await this.cleanup();
    }

    return { run, stepResults, healingEvents };
  }

  /**
   * 브라우저를 초기화합니다.
   */
  private async initBrowser(headless: boolean, timeout: number): Promise<void> {
    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    this.context.setDefaultTimeout(timeout);
    this.page = await this.context.newPage();
  }

  /**
   * 단일 스텝을 실행합니다.
   */
  private async executeStep(
    step: Step,
    index: number,
    runId: string,
    variables: Record<string, any>,
    timeout: number
  ): Promise<StepResult> {
    const startTime = Date.now();
    const stepTimeout = step.timeout ?? timeout;

    try {
      await this.page!.setDefaultTimeout(stepTimeout);

      switch (step.type) {
        case "navigate":
          await this.executeNavigate(step, variables);
          break;
        case "click":
          return await this.executeClick(step, index, runId, startTime);
        case "fill":
          return await this.executeFill(step, index, runId, variables, startTime);
        case "select":
          await this.executeSelect(step, variables);
          break;
        case "hover":
          await this.executeHover(step);
          break;
        case "wait":
          await this.executeWait(step);
          break;
        case "assert":
          await this.executeAssert(step, variables);
          break;
        case "screenshot":
          await this.executeScreenshot(step);
          break;
        case "component":
          // Components should be expanded before execution
          throw new Error("Component steps should be expanded before execution");
        case "api-request":
        case "api-assert":
        case "script":
          // Not implemented in Phase 1
          throw new Error(`Step type not yet implemented: ${step.type}`);
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      return {
        id: uuid(),
        runId,
        stepId: step.id,
        stepIndex: index,
        status: "passed",
        duration: Date.now() - startTime,
        createdAt: new Date(),
      };
    } catch (error) {
      return {
        id: uuid(),
        runId,
        stepId: step.id,
        stepIndex: index,
        status: "failed",
        duration: Date.now() - startTime,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        createdAt: new Date(),
      };
    }
  }

  /**
   * navigate 스텝 실행
   */
  private async executeNavigate(
    step: Step,
    variables: Record<string, any>
  ): Promise<void> {
    const config = step.config as { url: string };
    const url = this.interpolate(config.url, variables);
    await this.page!.goto(url);
  }

  /**
   * click 스텝 실행 (Self-Healing 지원)
   */
  private async executeClick(
    step: Step,
    index: number,
    runId: string,
    startTime: number
  ): Promise<StepResult> {
    const config = step.config as { locator: ElementLocator };
    
    try {
      const result = await this.locatorResolver.resolve(config.locator, this.page!);
      await result.locator.click();

      const status: StepResultStatus = result.healed ? "healed" : "passed";

      return {
        id: uuid(),
        runId,
        stepId: step.id,
        stepIndex: index,
        status,
        duration: Date.now() - startTime,
        healing: result.healed
          ? {
              originalStrategy: config.locator.strategies[0],
              usedStrategy: result.usedStrategy,
              confidence: result.confidence,
            }
          : undefined,
        createdAt: new Date(),
      };
    } catch (error) {
      if (error instanceof ElementNotFoundError) {
        return {
          id: uuid(),
          runId,
          stepId: step.id,
          stepIndex: index,
          status: "failed",
          duration: Date.now() - startTime,
          error: {
            message: error.message,
          },
          createdAt: new Date(),
        };
      }
      throw error;
    }
  }

  /**
   * fill 스텝 실행 (Self-Healing 지원)
   */
  private async executeFill(
    step: Step,
    index: number,
    runId: string,
    variables: Record<string, any>,
    startTime: number
  ): Promise<StepResult> {
    const config = step.config as {
      locator: ElementLocator;
      value: string;
      clearBefore?: boolean;
    };

    try {
      const result = await this.locatorResolver.resolve(config.locator, this.page!);
      const value = this.interpolate(config.value, variables);

      if (config.clearBefore !== false) {
        await result.locator.clear();
      }
      await result.locator.fill(value);

      const status: StepResultStatus = result.healed ? "healed" : "passed";

      return {
        id: uuid(),
        runId,
        stepId: step.id,
        stepIndex: index,
        status,
        duration: Date.now() - startTime,
        healing: result.healed
          ? {
              originalStrategy: config.locator.strategies[0],
              usedStrategy: result.usedStrategy,
              confidence: result.confidence,
            }
          : undefined,
        createdAt: new Date(),
      };
    } catch (error) {
      if (error instanceof ElementNotFoundError) {
        return {
          id: uuid(),
          runId,
          stepId: step.id,
          stepIndex: index,
          status: "failed",
          duration: Date.now() - startTime,
          error: {
            message: error.message,
          },
          createdAt: new Date(),
        };
      }
      throw error;
    }
  }

  /**
   * select 스텝 실행
   */
  private async executeSelect(
    step: Step,
    variables: Record<string, any>
  ): Promise<void> {
    const config = step.config as { locator: ElementLocator; value: string };
    const result = await this.locatorResolver.resolve(config.locator, this.page!);
    const value = this.interpolate(config.value, variables);
    await result.locator.selectOption(value);
  }

  /**
   * hover 스텝 실행
   */
  private async executeHover(step: Step): Promise<void> {
    const config = step.config as { locator: ElementLocator };
    const result = await this.locatorResolver.resolve(config.locator, this.page!);
    await result.locator.hover();
  }

  /**
   * wait 스텝 실행
   */
  private async executeWait(step: Step): Promise<void> {
    const config = step.config as {
      type: string;
      timeout?: number;
      locator?: ElementLocator;
    };

    switch (config.type) {
      case "time":
        await this.page!.waitForTimeout(config.timeout ?? 1000);
        break;
      case "element":
        if (config.locator) {
          const result = await this.locatorResolver.resolve(
            config.locator,
            this.page!
          );
          await result.locator.waitFor();
        }
        break;
      case "navigation":
        await this.page!.waitForLoadState("networkidle");
        break;
    }
  }

  /**
   * assert 스텝 실행
   */
  private async executeAssert(
    step: Step,
    variables: Record<string, any>
  ): Promise<void> {
    const config = step.config as {
      type: string;
      locator?: ElementLocator;
      expected?: string;
      attribute?: string;
    };

    const expected = config.expected
      ? this.interpolate(config.expected, variables)
      : undefined;

    switch (config.type) {
      case "visible":
        if (config.locator) {
          const result = await this.locatorResolver.resolve(
            config.locator,
            this.page!
          );
          const isVisible = await result.locator.isVisible();
          if (!isVisible) {
            throw new Error(`Element not visible: ${config.locator.displayName}`);
          }
        }
        break;

      case "hidden":
        if (config.locator) {
          const result = await this.locatorResolver.resolve(
            config.locator,
            this.page!
          );
          const isHidden = await result.locator.isHidden();
          if (!isHidden) {
            throw new Error(
              `Element not hidden: ${config.locator.displayName}`
            );
          }
        }
        break;

      case "text":
        if (config.locator && expected) {
          const result = await this.locatorResolver.resolve(
            config.locator,
            this.page!
          );
          const text = await result.locator.textContent();
          if (text !== expected) {
            throw new Error(`Text mismatch: expected "${expected}", got "${text}"`);
          }
        }
        break;

      case "url":
        if (expected) {
          const url = this.page!.url();
          if (!url.includes(expected)) {
            throw new Error(`URL mismatch: expected to contain "${expected}", got "${url}"`);
          }
        }
        break;

      case "title":
        if (expected) {
          const title = await this.page!.title();
          if (title !== expected) {
            throw new Error(`Title mismatch: expected "${expected}", got "${title}"`);
          }
        }
        break;
    }
  }

  /**
   * screenshot 스텝 실행
   */
  private async executeScreenshot(step: Step): Promise<void> {
    const config = step.config as { name?: string; fullPage?: boolean };
    await this.page!.screenshot({
      path: `screenshots/${config.name ?? Date.now()}.png`,
      fullPage: config.fullPage,
    });
  }

  /**
   * 변수를 빌드합니다.
   */
  private buildVariables(
    scenario: Scenario,
    overrides: Record<string, any>
  ): Record<string, any> {
    const vars: Record<string, any> = {};

    for (const variable of scenario.variables) {
      vars[variable.name] = variable.defaultValue;
    }

    return { ...vars, ...overrides };
  }

  /**
   * 문자열 내 변수를 치환합니다.
   */
  private interpolate(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return variables[key] ?? `{{${key}}}`;
    });
  }

  /**
   * 스텝에서 로케이터 표시 이름을 가져옵니다.
   */
  private getLocatorDisplayName(step: Step): string {
    const config = step.config as { locator?: ElementLocator };
    return config.locator?.displayName ?? step.description;
  }

  /**
   * 전체 실행 상태를 결정합니다.
   */
  private determineRunStatus(results: StepResult[]): RunStatus {
    if (results.some((r) => r.status === "failed")) {
      return "failed";
    }
    return "passed";
  }

  /**
   * 스텝 목록을 확장합니다 (컴포넌트를 하위 스텝으로 변환).
   * PRD Section 5.3 - 컴포넌트 시스템 구현
   */
  private async expandSteps(
    steps: Step[],
    variables: Record<string, any>,
    componentLoader?: (componentId: string) => Promise<Component | undefined>
  ): Promise<Step[]> {
    const expanded: Step[] = [];

    for (const step of steps) {
      if (step.type === "component") {
        // 컴포넌트 스텝 확장
        const componentSteps = await this.expandComponentStep(
          step,
          variables,
          componentLoader
        );
        expanded.push(...componentSteps);
      } else {
        expanded.push(step);
      }
    }

    return expanded;
  }

  /**
   * 컴포넌트 스텝을 하위 스텝으로 확장합니다.
   */
  private async expandComponentStep(
    step: Step,
    variables: Record<string, any>,
    componentLoader?: (componentId: string) => Promise<Component | undefined>
  ): Promise<Step[]> {
    const config = step.config as {
      componentId: string;
      parameters?: Record<string, any>;
    };

    if (!componentLoader) {
      throw new Error(
        "Component loader not provided. Cannot expand component steps."
      );
    }

    // 컴포넌트 로드
    const component = await componentLoader(config.componentId);
    if (!component) {
      throw new Error(`Component not found: ${config.componentId}`);
    }

    // 파라미터 바인딩을 위한 변수 생성
    const componentVariables = this.bindComponentParameters(
      component,
      config.parameters ?? {},
      variables
    );

    // 컴포넌트의 스텝들을 복사하고 파라미터 적용
    const expandedSteps: Step[] = component.steps.map((compStep) => ({
      ...compStep,
      id: uuid(), // 새로운 ID 생성 (중복 방지)
      config: this.applyParametersToConfig(
        compStep.config,
        componentVariables
      ),
      description: this.interpolate(compStep.description, componentVariables),
    }));

    return expandedSteps;
  }

  /**
   * 컴포넌트 파라미터를 바인딩합니다.
   * PRD Section 5.3 - 파라미터 바인딩
   */
  private bindComponentParameters(
    component: Component,
    providedParams: Record<string, any>,
    variables: Record<string, any>
  ): Record<string, any> {
    const bound: Record<string, any> = { ...variables };

    for (const paramDef of component.parameters) {
      let value = providedParams[paramDef.name];

      // 변수 참조 처리 ({{adminEmail}} 형태)
      if (typeof value === "string" && value.includes("{{")) {
        value = this.interpolate(value, variables);
      }

      // 값이 제공되지 않았으면 기본값 사용
      if (value === undefined) {
        value = paramDef.defaultValue;
      }

      // 필수 파라미터 검증
      if (value === undefined && paramDef.required) {
        throw new Error(
          `Required parameter '${paramDef.name}' not provided for component '${component.name}'`
        );
      }

      bound[paramDef.name] = value;
    }

    return bound;
  }

  /**
   * config 객체에 파라미터를 적용합니다.
   */
  private applyParametersToConfig(
    config: any,
    variables: Record<string, any>
  ): any {
    if (typeof config === "string") {
      return this.interpolate(config, variables);
    }

    if (Array.isArray(config)) {
      return config.map((item) => this.applyParametersToConfig(item, variables));
    }

    if (config && typeof config === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = this.applyParametersToConfig(value, variables);
      }
      return result;
    }

    return config;
  }

  /**
   * 리소스를 정리합니다.
   */
  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.page = null;
  }
}
