# /test — 테스트 실행

테스트를 실행하고 결과를 보고합니다.

## 실행 절차

### 1. 테스트 범위 결정

사용자 지시에 따라 범위 결정:

- `all` (기본값): 전체 테스트 + 타입체크 + 린트
- `unit`: 유닛 테스트만
- `typecheck`: 타입 체크만
- `lint`: 린트만

### 2. 테스트 실행

```bash
# 전체 테스트
bun test

# 타입 체크
bun run typecheck

# 린트
bun run lint
```

### 3. 결과 보고

```
## Test Results

### Unit Tests
- Total: X tests
- Passed: X ✓
- Failed: X ✗
- Duration: Xs

### Type Check
- Status: ✓ Pass / ✗ Fail
- Errors: [있는 경우 목록]

### Lint
- Status: ✓ Pass / ✗ Fail
- Warnings: X
- Errors: X
```

### 4. 실패 처리

- 테스트 실패 시 실패한 테스트 목록과 에러 메시지 출력
- 타입 에러 시 관련 파일과 라인 번호 표시
- 해결 방법 제안 (Hint 포함)
