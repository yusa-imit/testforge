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

## 다음 우선순위

- 안정성 개선 및 버그 수정
- 성능 최적화
- 테스트 커버리지 향상
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
