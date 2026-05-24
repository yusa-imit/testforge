# TestForge — Project Context

## 개요

QA 엔지니어와 기획자를 위한 Self-Healing 자동화 테스트 플랫폼.

- **Tech Stack**: Bun, React, Hono, DuckDB, Playwright
- **Monorepo**: `packages/core`, `packages/server`, `packages/web`
- **PRD**: `docs/PRD.md` (57KB, 모든 작업 전 필독)

## 현재 Phase

**Phase 4 완료 — Production Ready**

모든 핵심 기능 구현 완료:
- [x] Phase 1: Foundation & CRUD
- [x] Phase 2: Self-Healing System
- [x] Phase 3: Components & API Testing
- [x] Phase 4: Polish & Real-time

## 구현 완료 기능

- 계층적 테스트 관리 (Service → Feature → Scenario → Step)
- Visual Scenario Editor (드래그앤드롭)
- Playwright 브라우저 자동화
- Multi-layer Selectors (6 strategies)
- Self-Healing with Approval Workflow
- Reusable Components with Parameter Binding
- API Testing (HTTP + Validation)
- Real-time Execution (SSE)
- Screenshot Capture
- Search & Filtering
- Element Registry

## 최근 완료 (Session 43 - 2026-05-24)

✅ **Step retry/disabled + DuckDB array fix** - Tests: 675 pass, 23 skip, 0 fail (+25 tests)

**1. Step.retries / retryDelay / disabled fields added** (packages/core/src/types/index.ts)
- All three fields are optional in TypeScript (backward compatible)
- Engine skips disabled steps (returns status=skipped immediately)
- Engine retries failed steps up to `retries` times with `retryDelay` ms between attempts
- Retry outcome logged in StepResult.context.consoleLog

**2. DuckDB VARCHAR[] binding fix** (packages/server/src/db/database.ts)
- Root cause: duckdb node.js driver converts JS arrays to comma-separated strings
- Fix: use `CAST(? AS VARCHAR[])` in SQL + `JSON.stringify(array)` as parameter value
- Affected: owners (features), tags (scenarios), propagatedTo (healing_records)
- 3 previously-skipped database tests are now active and passing

**Previous (Session 42 - 2026-05-24):**
✅ **8 Failing Tests Fixed** - All tests green (650 pass, 26 skip, 0 fail)

## 다음 우선순위

- 성능 최적화
- 테스트 커버리지 향상 (23 skipped tests remain - mostly browser-integration)
- 사용자 피드백 반영

## 주요 파일 경로

```
docs/PRD.md                         — 전체 요구사항 (MANDATORY)
packages/core/src/                  — 테스트 엔진, Self-Healing
packages/server/src/routes/         — API 엔드포인트
packages/server/src/db/             — DB 스키마, 쿼리
packages/web/src/pages/             — 페이지 컴포넌트
packages/web/src/components/        — UI 컴포넌트
packages/web/src/stores/            — Zustand 스토어
```
