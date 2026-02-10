/**
 * API Client - HTTP 요청 및 응답 처리
 * PRD Section 5.1, Appendix A (api-request, api-assert)
 */

export interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiRequestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
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
      let body: any;
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
  getValueByPath(obj: any, path: string): any {
    const parts = path.split(".");
    let current = obj;

    for (const part of parts) {
      // 배열 인덱스 처리: items[0]
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current?.[key]?.[parseInt(index, 10)];
      } else {
        current = current?.[part];
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
  pathExists(obj: any, path: string): boolean {
    return this.getValueByPath(obj, path) !== undefined;
  }

  /**
   * 두 값을 비교합니다.
   */
  compareValues(
    actual: any,
    expected: any,
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
}
