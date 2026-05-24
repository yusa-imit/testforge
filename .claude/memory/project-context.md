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

## 최근 완료 (Session 44 - 2026-05-24)

✅ **Test Coverage Expansion** - Tests: 703 pass, 16 skip, 0 fail (+28 tests from session 43's 675)

**1. Backup import now preserves entity IDs** (packages/server/src/db/database.ts)
- Added importService/importFeature/importScenario/importComponent methods
- These accept full entity objects with original IDs for FK integrity during restore
- backup.ts updated to use these ID-preserving methods
- 5 previously-skipped backup tests now pass

**2. Connection tests fixed** (packages/server/src/db/connection.test.ts)
- Added resetDatabaseInstance() to afterEach — 2 previously-skipped tests now pass

**3. New test coverage** (net +25 tests):
- database.test.ts: 9 tests for importService/Feature/Scenario/Component methods
- scenarios.test.ts: 6 tests for step retry/disabled fields and tags/priority
- components.test.ts: 8 tests for usages endpoint and type validation
- services.test.ts: 3 tests for POST /api/services/:id/run endpoint

**Previous (Session 43 - 2026-05-24):**
✅ **Step retry/disabled + DuckDB array fix** - Tests: 675 pass, 23 skip, 0 fail

## 다음 우선순위

- 성능 최적화 (DB 인덱스, 쿼리 최적화)
- Remaining 16 skipped tests are browser-integration (Playwright required, legitimately skipped)
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
