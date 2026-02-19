/**
 * API Client - HTTP 요청 및 응답 처리
 * PRD Section 5.1, Appendix A (api-request, api-assert)
 */

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiRequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

/**
 * API 요청을 실행하고 응답을 반환합니다.
 */
export class ApiClient {
  /**
   * HTTP 요청 실행
   */
  async request(options: ApiRequestOptions): Promise<ApiRequestResponse> {
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = options.timeout
      ? setTimeout(() => controller.abort(), options.timeout)
      : null;

    try {
      const response = await fetch(options.url, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 응답 헤더 추출
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // 응답 본문 파싱
      let body: unknown;
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        body = await response.json();
      } else if (contentType.includes("text/")) {
        body = await response.text();
      } else {
        // 기타 타입은 텍스트로 읽기
        body = await response.text();
      }

      const duration = Date.now() - startTime;

      return {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        duration,
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${options.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * JSON path로 값을 가져옵니다.
   * 예: "data.user.name" → response.data.user.name
   */
  getValueByPath(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: Record<string, unknown> | unknown[] | unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      // 배열 인덱스 처리: items[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        const obj2 = current as Record<string, unknown[]>;
        current = obj2[key]?.[parseInt(index, 10)];
      } else {
        current = (current as Record<string, unknown>)[part];
      }

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 값이 존재하는지 확인합니다.
   */
  pathExists(obj: unknown, path: string): boolean {
    return this.getValueByPath(obj, path) !== undefined;
  }

  /**
   * 두 값을 비교합니다.
   */
  compareValues(
    actual: unknown,
    expected: unknown,
    operator: "equals" | "contains" | "matches" | "exists" | "type"
  ): boolean {
    switch (operator) {
      case "equals":
        // JSON으로 직렬화하여 깊은 비교
        return JSON.stringify(actual) === JSON.stringify(expected);

      case "contains":
        if (typeof actual === "string" && typeof expected === "string") {
          return actual.includes(expected);
        }
        if (Array.isArray(actual)) {
          return actual.some((item) =>
            JSON.stringify(item) === JSON.stringify(expected)
          );
        }
        return false;

      case "matches":
        if (typeof actual === "string" && typeof expected === "string") {
          const regex = new RegExp(expected);
          return regex.test(actual);
        }
        return false;

      case "exists":
        return actual !== undefined && actual !== null;

      case "type":
        const actualType = Array.isArray(actual)
          ? "array"
          : typeof actual;
        return actualType === expected;

      default:
        return false;
    }
  }

  /**
   * 모든 가능한 JSON 경로를 추출합니다.
   * Self-Healing을 위해 대체 경로를 찾는 데 사용됩니다.
   */
  private extractAllPaths(obj: unknown, prefix: string = ""): string[] {
    const paths: string[] = [];

    if (obj === null || obj === undefined) {
      return paths;
    }

    if (typeof obj !== "object") {
      return [prefix];
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const arrayPath = `${prefix}[${index}]`;
        paths.push(arrayPath);
        paths.push(...this.extractAllPaths(item, arrayPath));
      });
    } else {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        paths.push(currentPath);
        paths.push(...this.extractAllPaths(value, currentPath));
      }
    }

    return paths;
  }

  /**
   * 두 문자열 간의 유사도를 계산합니다 (Levenshtein distance 기반).
   * 0.0 (완전 다름) ~ 1.0 (동일)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = [];

    // 초기화
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Levenshtein distance 계산
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 삭제
          matrix[i][j - 1] + 1, // 삽입
          matrix[i - 1][j - 1] + cost // 교체
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);

    return 1 - distance / maxLength;
  }

  /**
   * 원래 경로가 실패했을 때 대체 경로를 찾습니다 (Self-Healing).
   * 가장 유사한 경로를 반환하며, 신뢰도 점수를 함께 제공합니다.
   */
  findAlternativePath(
    obj: unknown,
    originalPath: string,
    minConfidence: number = 0.7
  ): { path: string; confidence: number } | null {
    // 모든 가능한 경로 추출
    const allPaths = this.extractAllPaths(obj);

    // 원래 경로의 마지막 키 추출 (예: "data.user.status" → "status")
    const originalKey = originalPath.split(".").pop() || originalPath;

    // 각 경로와 유사도 계산
    const candidates = allPaths
      .map((path) => {
        const pathKey = path.split(".").pop() || path;
        const keySimilarity = this.calculateStringSimilarity(
          originalKey.toLowerCase(),
          pathKey.toLowerCase()
        );
        const fullPathSimilarity = this.calculateStringSimilarity(
          originalPath.toLowerCase(),
          path.toLowerCase()
        );

        // 키 유사도에 더 높은 가중치 (70%), 전체 경로 유사도 30%
        const confidence = keySimilarity * 0.7 + fullPathSimilarity * 0.3;

        return { path, confidence };
      })
      .filter((candidate) => candidate.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);

    // 가장 높은 신뢰도의 경로 반환
    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * 경로에서 값을 가져오되, 실패 시 대체 경로를 시도합니다 (Self-Healing).
   */
  getValueByPathWithHealing(
    obj: unknown,
    originalPath: string
  ): {
    value: unknown;
    healed: boolean;
    usedPath?: string;
    confidence?: number;
  } {
    // 먼저 원래 경로로 시도
    const originalValue = this.getValueByPath(obj, originalPath);

    if (originalValue !== undefined) {
      return { value: originalValue, healed: false };
    }

    // 원래 경로 실패 → 대체 경로 찾기
    const alternative = this.findAlternativePath(obj, originalPath);

    if (alternative) {
      const value = this.getValueByPath(obj, alternative.path);
      if (value !== undefined) {
        return {
          value,
          healed: true,
          usedPath: alternative.path,
          confidence: alternative.confidence,
        };
      }
    }

    // 대체 경로도 없음
    return { value: undefined, healed: false };
  }
}
