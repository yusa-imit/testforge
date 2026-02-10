import type { LocatorStrategy, HealingStatus } from "../types";

export interface HealingEvent {
  scenarioId: string;
  stepId: string;
  runId: string;
  locatorDisplayName: string;
  originalStrategy: LocatorStrategy;
  healedStrategy: LocatorStrategy;
  confidence: number;
}

export interface HealingDecision {
  eventId: string;
  status: HealingStatus;
  reviewedBy?: string;
  reviewNote?: string;
}

/**
 * HealingTracker - Self-Healing 이벤트 추적
 * 
 * Healing 이벤트를 수집하고 승인/거부 워크플로우를 관리합니다.
 */
export class HealingTracker {
  private events: Map<string, HealingEvent> = new Map();
  private decisions: Map<string, HealingDecision> = new Map();
  
  /**
   * 신뢰도 임계값 (이 값 이상이면 자동 승인 가능)
   */
  private autoApproveThreshold = 0.9;

  /**
   * Healing 이벤트를 기록합니다.
   */
  recordEvent(event: HealingEvent): string {
    const eventId = `${event.runId}-${event.stepId}`;
    this.events.set(eventId, event);

    // 높은 신뢰도면 자동 승인
    if (event.confidence >= this.autoApproveThreshold) {
      this.decisions.set(eventId, {
        eventId,
        status: "auto_approved",
      });
    }

    return eventId;
  }

  /**
   * Healing 이벤트를 승인합니다.
   */
  approve(
    eventId: string,
    reviewedBy?: string,
    reviewNote?: string
  ): HealingDecision | null {
    if (!this.events.has(eventId)) {
      return null;
    }

    const decision: HealingDecision = {
      eventId,
      status: "approved",
      reviewedBy,
      reviewNote,
    };

    this.decisions.set(eventId, decision);
    return decision;
  }

  /**
   * Healing 이벤트를 거부합니다.
   */
  reject(
    eventId: string,
    reviewedBy?: string,
    reviewNote?: string
  ): HealingDecision | null {
    if (!this.events.has(eventId)) {
      return null;
    }

    const decision: HealingDecision = {
      eventId,
      status: "rejected",
      reviewedBy,
      reviewNote,
    };

    this.decisions.set(eventId, decision);
    return decision;
  }

  /**
   * 대기 중인 이벤트 목록을 반환합니다.
   */
  getPendingEvents(): HealingEvent[] {
    const pending: HealingEvent[] = [];

    for (const [eventId, event] of this.events) {
      const decision = this.decisions.get(eventId);
      if (!decision || decision.status === "pending") {
        pending.push(event);
      }
    }

    return pending;
  }

  /**
   * 이벤트 결정 상태를 반환합니다.
   */
  getDecision(eventId: string): HealingDecision | undefined {
    return this.decisions.get(eventId);
  }

  /**
   * 승인된 전략을 적용해야 하는지 확인합니다.
   */
  shouldUseHealedStrategy(
    scenarioId: string,
    stepId: string
  ): LocatorStrategy | null {
    for (const [eventId, event] of this.events) {
      if (event.scenarioId === scenarioId && event.stepId === stepId) {
        const decision = this.decisions.get(eventId);
        if (
          decision &&
          (decision.status === "approved" || decision.status === "auto_approved")
        ) {
          return event.healedStrategy;
        }
      }
    }
    return null;
  }

  /**
   * 모든 이벤트를 초기화합니다.
   */
  clear(): void {
    this.events.clear();
    this.decisions.clear();
  }

  /**
   * 자동 승인 임계값을 설정합니다.
   */
  setAutoApproveThreshold(threshold: number): void {
    this.autoApproveThreshold = Math.max(0, Math.min(1, threshold));
  }
}

/**
 * 전역 HealingTracker 인스턴스
 */
export const globalHealingTracker = new HealingTracker();
