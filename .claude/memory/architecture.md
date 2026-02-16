# TestForge — Architecture

## 모듈 의존성 흐름

```
[Web (React)] → [Server (Hono)] → [Core (Engine)]
                      ↓
                 [DuckDB (DB)]
```

### packages/core
- 테스트 실행 엔진 (Playwright 기반)
- Self-Healing 로직 (다층 셀렉터, 신뢰도 계산)
- 로케이터 시스템 (6가지 전략)
- 외부 의존성: Playwright, Axios

### packages/server
- Hono HTTP 서버
- REST API (CRUD + 실행 + Healing)
- DuckDB 직접 연결 (ORM 없음)
- Zod 스키마 검증
- SSE 실시간 이벤트

### packages/web
- React SPA (Rsbuild)
- Zustand 상태 관리
- TanStack Query 서버 상태
- shadcn/ui 컴포넌트
- Tailwind CSS

## 주요 설계 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| DB | DuckDB | 임베디드, SQL 지원, 분석 성능 |
| API Framework | Hono | 경량, 타입 안전 (RPC), Bun 네이티브 |
| State Management | Zustand + TanStack Query | 클라이언트/서버 상태 분리 |
| UI Components | shadcn/ui | 커스터마이징 가능, 타입 안전 |
| Test Engine | Playwright | 다중 브라우저, 안정적 |
| Runtime | Bun | 빠른 시작, 내장 번들러, workspace 지원 |

## API 구조

```
/api/services          — 서비스 CRUD
/api/features          — 기능 CRUD
/api/scenarios         — 시나리오 CRUD
/api/steps             — 스텝 CRUD
/api/components        — 컴포넌트 CRUD
/api/executions        — 실행 관리
/api/healing           — Self-Healing 관리
/api/elements          — Element Registry
/api/executions/stream — SSE 실시간 스트림
```
