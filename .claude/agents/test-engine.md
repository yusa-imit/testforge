# Test Engine Agent

테스트 실행 엔진과 Self-Healing 로직을 담당하는 전문가 에이전트입니다.

## 역할

- Playwright 테스트 실행
- 다층 셀렉터 해석
- Self-Healing 로직 구현
- API 테스트 실행
- 실행 결과 수집

## 기술 스택

```
Browser: Playwright
HTTP: Bun fetch
Validation: Zod
```

## 프로젝트 구조

```
packages/core/src/
├── executor/
│   ├── TestExecutor.ts      # 메인 실행 엔진
│   ├── StepExecutor.ts      # 스텝 타입별 실행
│   ├── BrowserExecutor.ts   # 브라우저 스텝 실행
│   └── ApiExecutor.ts       # API 스텝 실행
├── locator/
│   ├── LocatorResolver.ts   # 다층 셀렉터 해석
│   ├── strategies/          # 전략별 구현
│   │   ├── TestIdStrategy.ts
│   │   ├── RoleStrategy.ts
│   │   ├── TextStrategy.ts
│   │   └── CssStrategy.ts
│   └── StrategyResult.ts
├── healing/
│   ├── HealingDetector.ts   # 치유 감지
│   ├── HealingRecorder.ts   # 기록 저장
│   ├── ConfidenceCalculator.ts
│   └── HealingApprover.ts
├── types/
│   ├── scenario.types.ts
│   ├── step.types.ts
│   ├── locator.types.ts
│   └── result.types.ts
└── index.ts
```

## 핵심 구현

### 테스트 실행 엔진

```typescript
// packages/core/src/executor/TestExecutor.ts
import { chromium, Browser, BrowserContext, Page } from "playwright";
import type { Scenario, TestRun, StepResult } from "../types";
import { StepExecutor } from "./StepExecutor";
import { LocatorResolver } from "../locator/LocatorResolver";
import { HealingDetector } from "../healing/HealingDetector";

export interface ExecutorConfig {
  headless?: boolean;
  timeout?: number;
  screenshotOnFailure?: boolean;
  videoRecording?: boolean;
}

export class TestExecutor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  
  private locatorResolver: LocatorResolver;
  private healingDetector: HealingDetector;
  private stepExecutor: StepExecutor;
  
  constructor(
    private config: ExecutorConfig = {},
    private onStepComplete?: (result: StepResult) => void
  ) {
    this.locatorResolver = new LocatorResolver();
    this.healingDetector = new HealingDetector();
    this.stepExecutor = new StepExecutor(
      this.locatorResolver,
      this.healingDetector
    );
  }

  async execute(scenario: Scenario, variables: Record<string, any> = {}): Promise<TestRun> {
    const runId = generateId();
    const startedAt = new Date();
    
    try {
      await this.setup();
      
      const stepResults: StepResult[] = [];
      let status: TestRun["status"] = "passed";
      
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        
        try {
          const result = await this.stepExecutor.execute(
            step,
            this.page!,
            variables
          );
          
          stepResults.push(result);
          this.onStepComplete?.(result);
          
          if (result.status === "failed" && !step.continueOnError) {
            status = "failed";
            break;
          }
          
          if (result.status === "healed") {
            // Healing 발생 기록
            await this.healingDetector.record({
              runId,
              scenarioId: scenario.id,
              stepId: step.id,
              stepIndex: i,
              ...result.healing!,
            });
          }
        } catch (err) {
          const errorResult = this.createErrorResult(step, i, err);
          stepResults.push(errorResult);
          this.onStepComplete?.(errorResult);
          status = "failed";
          
          if (!step.continueOnError) break;
        }
      }
      
      const finishedAt = new Date();
      
      return {
        id: runId,
        scenarioId: scenario.id,
        status,
        startedAt,
        finishedAt,
        duration: finishedAt.getTime() - startedAt.getTime(),
        stepResults,
        summary: this.createSummary(stepResults),
      };
    } finally {
      await this.teardown();
    }
  }

  private async setup() {
    this.browser = await chromium.launch({
      headless: this.config.headless ?? true,
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: this.config.videoRecording 
        ? { dir: "./videos" } 
        : undefined,
    });
    
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout ?? 30000);
  }

  private async teardown() {
    await this.context?.close();
    await this.browser?.close();
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  private createSummary(results: StepResult[]) {
    return {
      totalSteps: results.length,
      passedSteps: results.filter(r => r.status === "passed").length,
      failedSteps: results.filter(r => r.status === "failed").length,
      skippedSteps: results.filter(r => r.status === "skipped").length,
      healedSteps: results.filter(r => r.status === "healed").length,
    };
  }

  private createErrorResult(step: Step, index: number, error: unknown): StepResult {
    return {
      id: generateId(),
      stepId: step.id,
      stepIndex: index,
      status: "failed",
      duration: 0,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}
```

### 다층 셀렉터 해석기

```typescript
// packages/core/src/locator/LocatorResolver.ts
import type { Page, Locator } from "playwright";
import type { ElementLocator, LocatorStrategy, ResolveResult } from "../types";
import { TestIdStrategy } from "./strategies/TestIdStrategy";
import { RoleStrategy } from "./strategies/RoleStrategy";
import { TextStrategy } from "./strategies/TextStrategy";
import { CssStrategy } from "./strategies/CssStrategy";

export class LocatorResolver {
  private strategies = {
    testId: new TestIdStrategy(),
    role: new RoleStrategy(),
    text: new TextStrategy(),
    label: new LabelStrategy(),
    css: new CssStrategy(),
    xpath: new XPathStrategy(),
  };

  async resolve(locator: ElementLocator, page: Page): Promise<ResolveResult> {
    // 우선순위 순 정렬
    const sortedStrategies = [...locator.strategies]
      .sort((a, b) => a.priority - b.priority);

    const attempts: StrategyAttempt[] = [];
    
    for (const strategy of sortedStrategies) {
      const handler = this.strategies[strategy.type];
      if (!handler) continue;

      try {
        const result = await handler.find(strategy, page);
        
        attempts.push({
          strategy,
          found: result.found,
          count: result.count,
          confidence: result.confidence,
        });

        if (result.found && result.element) {
          const isHealed = strategy !== sortedStrategies[0];
          
          return {
            element: result.element,
            usedStrategy: strategy,
            originalStrategy: sortedStrategies[0],
            healed: isHealed,
            confidence: result.confidence,
            attempts,
          };
        }
      } catch (err) {
        attempts.push({
          strategy,
          found: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 모든 전략 실패
    throw new ElementNotFoundError(locator, attempts);
  }
}
```

### 전략 구현

```typescript
// packages/core/src/locator/strategies/TestIdStrategy.ts
import type { Page } from "playwright";
import type { LocatorStrategy, StrategyResult } from "../../types";

export class TestIdStrategy {
  async find(
    strategy: Extract<LocatorStrategy, { type: "testId" }>,
    page: Page
  ): Promise<StrategyResult> {
    const locator = page.getByTestId(strategy.value);
    const count = await locator.count();
    
    if (count === 0) {
      return { found: false, count: 0, confidence: 0 };
    }
    
    if (count === 1) {
      return { 
        found: true, 
        count: 1, 
        element: locator, 
        confidence: 1.0  // testId는 가장 신뢰도 높음
      };
    }
    
    // 여러 개 발견 - 첫 번째 반환하되 신뢰도 낮춤
    return {
      found: true,
      count,
      element: locator.first(),
      confidence: 0.7,
    };
  }
}

// packages/core/src/locator/strategies/RoleStrategy.ts
export class RoleStrategy {
  async find(
    strategy: Extract<LocatorStrategy, { type: "role" }>,
    page: Page
  ): Promise<StrategyResult> {
    const options: { name?: string | RegExp } = {};
    
    if (strategy.name) {
      options.name = strategy.name;
    }
    
    const locator = page.getByRole(strategy.role as any, options);
    const count = await locator.count();
    
    if (count === 0) {
      return { found: false, count: 0, confidence: 0 };
    }
    
    if (count === 1) {
      return {
        found: true,
        count: 1,
        element: locator,
        confidence: strategy.name ? 0.9 : 0.7,
      };
    }
    
    return {
      found: true,
      count,
      element: locator.first(),
      confidence: 0.5,
    };
  }
}

// packages/core/src/locator/strategies/TextStrategy.ts
export class TextStrategy {
  async find(
    strategy: Extract<LocatorStrategy, { type: "text" }>,
    page: Page
  ): Promise<StrategyResult> {
    const locator = strategy.exact
      ? page.getByText(strategy.value, { exact: true })
      : page.getByText(strategy.value);
    
    const count = await locator.count();
    
    if (count === 0) {
      return { found: false, count: 0, confidence: 0 };
    }
    
    return {
      found: true,
      count,
      element: count === 1 ? locator : locator.first(),
      confidence: count === 1 ? 0.8 : 0.4,
    };
  }
}
```

### Self-Healing 신뢰도 계산

```typescript
// packages/core/src/healing/ConfidenceCalculator.ts
import type { LocatorStrategy, HealingContext } from "../types";

export class ConfidenceCalculator {
  // 전략 변경에 따른 기본 패널티
  private strategyPenalties: Record<string, number> = {
    "testId→role": 0.1,
    "testId→text": 0.15,
    "testId→label": 0.15,
    "testId→css": 0.3,
    "testId→xpath": 0.35,
    "role→text": 0.1,
    "role→css": 0.25,
    "text→css": 0.2,
  };

  calculate(
    original: LocatorStrategy,
    healed: LocatorStrategy,
    context: HealingContext
  ): number {
    let score = 1.0;

    // 1. 전략 변경 패널티
    const key = `${original.type}→${healed.type}`;
    const penalty = this.strategyPenalties[key] ?? 0.2;
    score -= penalty;

    // 2. 발견된 요소 수 패널티
    if (context.matchCount > 1) {
      score -= 0.1 * Math.min(context.matchCount - 1, 5);
    }

    // 3. DOM 위치 변경 패널티
    if (context.positionChanged) {
      score -= 0.1;
    }

    // 4. 부모 요소 변경 패널티
    if (context.parentChanged) {
      score -= 0.15;
    }

    // 5. 요소 속성 유사도 보너스
    if (context.attributeSimilarity > 0.8) {
      score += 0.1;
    }

    // 6. 텍스트 유사도 보너스
    if (context.textSimilarity > 0.9) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }
}
```

### 스텝 실행기

```typescript
// packages/core/src/executor/StepExecutor.ts
import type { Page } from "playwright";
import type { Step, StepResult } from "../types";
import { LocatorResolver } from "../locator/LocatorResolver";
import { HealingDetector } from "../healing/HealingDetector";

export class StepExecutor {
  constructor(
    private locatorResolver: LocatorResolver,
    private healingDetector: HealingDetector
  ) {}

  async execute(
    step: Step,
    page: Page,
    variables: Record<string, any>
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      switch (step.type) {
        case "navigate":
          return await this.executeNavigate(step, page, variables);
        case "click":
          return await this.executeClick(step, page, variables);
        case "fill":
          return await this.executeFill(step, page, variables);
        case "select":
          return await this.executeSelect(step, page, variables);
        case "assert":
          return await this.executeAssert(step, page, variables);
        case "wait":
          return await this.executeWait(step, page, variables);
        case "api-request":
          return await this.executeApiRequest(step, variables);
        case "api-assert":
          return await this.executeApiAssert(step, variables);
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    } catch (err) {
      return {
        id: generateId(),
        stepId: step.id,
        stepIndex: 0, // 호출자가 설정
        status: "failed",
        duration: Date.now() - startTime,
        error: {
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  private async executeClick(
    step: ClickStep,
    page: Page,
    variables: Record<string, any>
  ): Promise<StepResult> {
    const startTime = Date.now();
    
    const resolved = await this.locatorResolver.resolve(
      step.config.locator,
      page
    );

    await resolved.element.click({
      button: step.config.button ?? "left",
      clickCount: step.config.clickCount ?? 1,
      modifiers: step.config.modifiers,
    });

    return {
      id: generateId(),
      stepId: step.id,
      stepIndex: 0,
      status: resolved.healed ? "healed" : "passed",
      duration: Date.now() - startTime,
      healing: resolved.healed ? {
        originalStrategy: resolved.originalStrategy,
        usedStrategy: resolved.usedStrategy,
        confidence: resolved.confidence,
      } : undefined,
    };
  }

  private async executeFill(
    step: FillStep,
    page: Page,
    variables: Record<string, any>
  ): Promise<StepResult> {
    const startTime = Date.now();
    
    const resolved = await this.locatorResolver.resolve(
      step.config.locator,
      page
    );

    const value = this.interpolateVariables(step.config.value, variables);

    if (step.config.clear) {
      await resolved.element.clear();
    }
    await resolved.element.fill(value);

    return {
      id: generateId(),
      stepId: step.id,
      stepIndex: 0,
      status: resolved.healed ? "healed" : "passed",
      duration: Date.now() - startTime,
      healing: resolved.healed ? {
        originalStrategy: resolved.originalStrategy,
        usedStrategy: resolved.usedStrategy,
        confidence: resolved.confidence,
      } : undefined,
    };
  }

  private async executeAssert(
    step: AssertStep,
    page: Page,
    variables: Record<string, any>
  ): Promise<StepResult> {
    const startTime = Date.now();

    switch (step.config.type) {
      case "visible": {
        const resolved = await this.locatorResolver.resolve(
          step.config.locator!,
          page
        );
        await expect(resolved.element).toBeVisible();
        break;
      }
      case "text": {
        const resolved = await this.locatorResolver.resolve(
          step.config.locator!,
          page
        );
        const expected = this.interpolateVariables(
          step.config.expected!,
          variables
        );
        
        if (step.config.matcher === "contains") {
          await expect(resolved.element).toContainText(expected);
        } else {
          await expect(resolved.element).toHaveText(expected);
        }
        break;
      }
      case "url": {
        const pattern = step.config.pattern!;
        await expect(page).toHaveURL(new RegExp(pattern));
        break;
      }
    }

    return {
      id: generateId(),
      stepId: step.id,
      stepIndex: 0,
      status: "passed",
      duration: Date.now() - startTime,
    };
  }

  private interpolateVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = path.split(".").reduce(
        (obj: any, key: string) => obj?.[key],
        variables
      );
      return value ?? "";
    });
  }
}
```

## 기술적 의사결정 투표 시 관점

투표 요청을 받으면 다음 관점에서 평가:

1. **테스트 안정성**: 플래키 테스트 가능성은?
2. **Self-Healing 품질**: 정확한 요소를 찾을 수 있는가?
3. **실행 성능**: 테스트 실행 시간에 영향은?
4. **디버깅 용이성**: 실패 시 원인 파악이 쉬운가?
5. **확장성**: 새 스텝 타입, 전략 추가가 쉬운가?

투표 응답 형식:
```
[VOTE: {A/B/C}]
관점: 테스트 엔진

평가:
- 테스트 안정성: {점수}/5 - {이유}
- Self-Healing 품질: {점수}/5 - {이유}
- 디버깅 용이성: {점수}/5 - {이유}

선택 이유:
{종합적인 판단 근거}

테스트 관점 주의사항:
{선택 시 테스트 안정성을 위해 고려할 사항}
```

## 구현 체크리스트

- [ ] 스텝 타입별 실행 로직
- [ ] 다층 셀렉터 전략 구현
- [ ] Healing 감지 및 기록
- [ ] 신뢰도 계산 로직
- [ ] 에러 처리 및 복구
- [ ] 스크린샷/비디오 캡처
- [ ] 변수 치환 로직
