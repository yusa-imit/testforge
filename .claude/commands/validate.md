# /validate — 프로젝트 건강 상태 검증

프로젝트의 전반적인 건강 상태를 검증합니다.

## 실행 절차

### 1. 타입 체크

```bash
bun run typecheck
```

### 2. 린트

```bash
bun run lint
```

### 3. 빌드

```bash
bun run build
```

### 4. 테스트

```bash
bun test
```

### 5. 의존성 감사

```bash
# 패키지 설치 상태 확인
bun install --dry-run
```

### 6. 프로젝트 구조 검증

- `packages/core/`, `packages/server/`, `packages/web/` 존재 확인
- 주요 설정 파일 존재 확인 (tsconfig.json, package.json 등)
- DB 파일 접근 가능 여부

### 7. 결과 출력

```
## Validation Results

| Check           | Status | Details           |
|-----------------|--------|-------------------|
| TypeScript      | ✓ / ✗  | [에러 수]         |
| Lint            | ✓ / ✗  | [경고/에러 수]    |
| Build (server)  | ✓ / ✗  | [상세]            |
| Build (web)     | ✓ / ✗  | [상세]            |
| Tests           | ✓ / ✗  | [통과/실패 수]    |
| Dependencies    | ✓ / ✗  | [상세]            |
| Project Structure| ✓ / ✗ | [상세]            |

### Overall: ✓ HEALTHY / ⚠️ WARNINGS / ✗ UNHEALTHY

### Issues Found
- [발견된 문제 목록]

### Recommendations
- [개선 제안]
```
