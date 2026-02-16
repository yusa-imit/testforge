# /build — 프로젝트 빌드

프로젝트를 빌드합니다. 빌드 타겟을 지정할 수 있습니다.

## 실행 절차

### 1. 빌드 타겟 확인

사용자가 지정한 타겟에 따라 빌드:

- `all` (기본값): 서버 + 웹 전체 빌드
- `server`: 서버 패키지만 빌드
- `web`: 웹 패키지만 빌드

### 2. 빌드 실행

```bash
# 전체 빌드
bun run build

# 서버만
bun run build:server

# 웹만
bun run build:web
```

### 3. 결과 보고

빌드 성공/실패 여부를 보고합니다.

**성공 시:**
```
✓ Build completed successfully
  - Server: OK
  - Web: OK
```

**실패 시:**
```
✗ Build failed

  [에러 메시지]

  Hint: [수정 제안]
```

### 4. 빌드 실패 처리

- TypeScript 타입 에러 → `bun run typecheck`로 상세 확인
- 의존성 누락 → `bun install` 실행
- 빌드 에러가 3회 이상 반복되면 `.claude/memory/debugging.md`에 기록
