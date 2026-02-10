import type { Page, Locator } from "playwright";
import type { ElementLocator, LocatorStrategy } from "../types";

export interface ResolveResult {
  locator: Locator;
  usedStrategy: LocatorStrategy;
  healed: boolean;
  confidence: number;
}

export interface StrategyResult {
  found: boolean;
  locator?: Locator;
  confidence: number;
  matchCount?: number;
}

export interface HealingContext {
  positionChanged: boolean;
  parentChanged: boolean;
  textSimilarity: number;
}

/**
 * LocatorResolver - 다층 셀렉터 해석기
 * 
 * 우선순위에 따라 여러 전략을 시도하고,
 * 첫 번째 전략이 실패하면 Self-Healing을 기록합니다.
 */
export class LocatorResolver {
  /**
   * 요소를 찾습니다. 우선순위 순으로 전략을 시도합니다.
   */
  async resolve(
    elementLocator: ElementLocator,
    page: Page
  ): Promise<ResolveResult> {
    const sortedStrategies = [...elementLocator.strategies].sort(
      (a, b) => a.priority - b.priority
    );

    const firstStrategy = sortedStrategies[0];
    
    for (const strategy of sortedStrategies) {
      const result = await this.tryStrategy(strategy, page);

      if (result.found && result.locator) {
        const isHealed = strategy !== firstStrategy;

        return {
          locator: result.locator,
          usedStrategy: strategy,
          healed: isHealed,
          confidence: isHealed ? result.confidence : 1.0,
        };
      }
    }

    throw new ElementNotFoundError(elementLocator, sortedStrategies);
  }

  /**
   * 단일 전략으로 요소 찾기를 시도합니다.
   */
  private async tryStrategy(
    strategy: LocatorStrategy,
    page: Page
  ): Promise<StrategyResult> {
    try {
      let locator: Locator;
      
      switch (strategy.type) {
        case "testId":
          locator = page.getByTestId(strategy.value);
          break;
        
        case "role":
          locator = page.getByRole(strategy.role as any, {
            name: strategy.name,
          });
          break;
        
        case "text":
          locator = page.getByText(strategy.value, {
            exact: strategy.exact,
          });
          break;
        
        case "label":
          locator = page.getByLabel(strategy.value);
          break;
        
        case "css":
          locator = page.locator(strategy.selector);
          break;
        
        case "xpath":
          locator = page.locator(`xpath=${strategy.expression}`);
          break;
        
        default:
          return { found: false, confidence: 0 };
      }

      const count = await locator.count();
      
      if (count === 0) {
        return { found: false, confidence: 0, matchCount: 0 };
      }

      if (count > 1) {
        // 여러 개 발견 시 첫 번째 사용, 신뢰도 감소
        return {
          found: true,
          locator: locator.first(),
          confidence: 0.7,
          matchCount: count,
        };
      }

      return {
        found: true,
        locator,
        confidence: this.calculateStrategyConfidence(strategy),
        matchCount: 1,
      };
    } catch (error) {
      return { found: false, confidence: 0 };
    }
  }

  /**
   * 전략 타입에 따른 기본 신뢰도 계산
   */
  private calculateStrategyConfidence(strategy: LocatorStrategy): number {
    const baseConfidence: Record<string, number> = {
      testId: 1.0,
      role: 0.95,
      text: 0.9,
      label: 0.9,
      css: 0.8,
      xpath: 0.7,
    };

    return baseConfidence[strategy.type] ?? 0.5;
  }
}

/**
 * Healing 발생 시 신뢰도 계산
 */
export function calculateHealingConfidence(
  original: LocatorStrategy,
  healed: LocatorStrategy,
  context?: HealingContext
): number {
  let score = 1.0;

  // 전략 타입 변경 패널티
  const typePenalty: Record<string, number> = {
    "testId→role": 0.1,
    "testId→text": 0.15,
    "testId→css": 0.3,
    "role→text": 0.1,
    "role→css": 0.25,
    "text→css": 0.2,
  };

  const key = `${original.type}→${healed.type}`;
  score -= typePenalty[key] ?? 0.2;

  if (context) {
    // 위치 변경 패널티
    if (context.positionChanged) {
      score -= 0.1;
    }

    // 부모 요소 변경 패널티
    if (context.parentChanged) {
      score -= 0.15;
    }

    // 텍스트 유사도 보너스
    if (context.textSimilarity > 0.9) {
      score += 0.1;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * 요소를 찾지 못했을 때 발생하는 에러
 */
export class ElementNotFoundError extends Error {
  constructor(
    public locator: ElementLocator,
    public attemptedStrategies: LocatorStrategy[]
  ) {
    super(`Element not found: ${locator.displayName}`);
    this.name = "ElementNotFoundError";
  }
}
