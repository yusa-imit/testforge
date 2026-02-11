import { TestExecutor, type RunEvent } from "@testforge/core";

/**
 * ExecutionManager - 활성 실행 추적 및 이벤트 스트리밍 관리
 * PRD Section 4.2 - 실시간 통신
 */
export class ExecutionManager {
  private static instance: ExecutionManager;
  private activeExecutions: Map<string, TestExecutor>;

  private constructor() {
    this.activeExecutions = new Map();
  }

  static getInstance(): ExecutionManager {
    if (!ExecutionManager.instance) {
      ExecutionManager.instance = new ExecutionManager();
    }
    return ExecutionManager.instance;
  }

  /**
   * 실행을 등록하고 executor를 반환합니다.
   */
  registerExecution(runId: string, executor: TestExecutor): void {
    this.activeExecutions.set(runId, executor);

    // 실행 완료 시 자동 정리 (run:finished 이벤트 리스닝)
    const finishHandler = (event: RunEvent) => {
      if (event.type === "run:finished") {
        // 약간의 딜레이 후 정리 (클라이언트가 마지막 이벤트를 받을 시간 확보)
        setTimeout(() => {
          this.unregisterExecution(runId);
        }, 5000);
      }
    };

    executor.on("event", finishHandler);
  }

  /**
   * 실행을 제거합니다.
   */
  unregisterExecution(runId: string): void {
    const executor = this.activeExecutions.get(runId);
    if (executor) {
      executor.removeAllListeners();
      this.activeExecutions.delete(runId);
    }
  }

  /**
   * 특정 실행의 executor를 가져옵니다.
   */
  getExecutor(runId: string): TestExecutor | undefined {
    return this.activeExecutions.get(runId);
  }

  /**
   * 실행이 활성 상태인지 확인합니다.
   */
  isActive(runId: string): boolean {
    return this.activeExecutions.has(runId);
  }

  /**
   * 모든 활성 실행 ID를 반환합니다.
   */
  getActiveRunIds(): string[] {
    return Array.from(this.activeExecutions.keys());
  }
}
