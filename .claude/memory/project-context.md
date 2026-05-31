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

## 최근 완료 (Session 60 - 2026-06-01)

✅ **Scenario pass rate badge in FeatureDetail** - Tests: 774 pass, 16 skip, 0 fail (+3 DB tests)

**ScenarioWithLastRun extended with totalRuns + passCount stats:**
- `ScenarioWithLastRun` interface now has `totalRuns: number` and `passCount: number`
- `getScenariosByFeatureWithLastRun` SQL: second LEFT JOIN aggregates `COUNT(*) FILTER (WHERE status IN ('passed', 'healed'))` and `COUNT(*)` per scenario
- `toScenarioWithLastRun` converter extracts both new fields
- `PassRateBadge` component in FeatureDetail shows "X/Y" with green(≥90%)/yellow(≥70%)/red(<70%) color coding
- Hidden when `totalRuns === 0` (no runs yet)

**Files changed:**
- `packages/server/src/db/database.ts` — interface + converter + SQL query
- `packages/server/src/db/database.test.ts` — 3 new pass rate tests
- `packages/web/src/pages/FeatureDetail.tsx` — PassRateBadge component + display

---

## 최근 완료 (Session 59 - 2026-05-31)

✅ **Tag filter dropdown + tag badges in FeatureDetail scenario list** - Tests: 771 pass, 16 skip, 0 fail

**UI enhancement for FeatureDetail scenario list:**
- `tagFilter` state with dynamic `availableTags` useMemo (unique tags from loaded scenarios, sorted)
- Tag filter Select dropdown appears alongside priority filter when tags exist
- Tag badges on each scenario row are clickable → sets tagFilter to that tag
- Reset button covers all three filters (search, priority, tag)
- Pre-existing TS fix in scenarios.test.ts: `as const` + `continueOnError` on step fixture

**Files changed:**
- `packages/web/src/pages/FeatureDetail.tsx` — tag filter dropdown + clickable tag badges
- `packages/server/src/routes/scenarios.test.ts` — TS fix for step fixture

---

## 최근 완료 (Session 58 - 2026-05-31)

✅ **Server-side tag/priority filtering for scenario list** - Tests: 771 pass, 16 skip, 0 fail (+9 tests)

**GET /api/features/:featureId/scenarios?tag=smoke&priority=high** - new query params
- `getScenariosByFeatureWithLastRun(featureId, filters?)` extended with optional `{ tag?, priority? }` filters
- Uses DuckDB's `list_contains(s.tags, ?)` for array tag matching
- Priority filtered via `s.priority = ?`
- Route parses `?tag=` and `?priority=` and forwards to DB layer
- +5 DB tests, +4 route tests

**Files changed:**
- `packages/server/src/db/database.ts` — filters param in getScenariosByFeatureWithLastRun
- `packages/server/src/db/database.test.ts` — 5 new tag/priority filter DB tests
- `packages/server/src/routes/features.ts` — parse tag/priority query params
- `packages/server/src/routes/features.test.ts` — 4 new route filter tests

---

## 최근 완료 (Session 57 - 2026-05-30)

✅ **Dashboard service stats + duplicate scenario tests** - Tests: 762 pass, 16 skip, 0 fail (+2 tests)

**Dashboard.tsx**: service list now shows featureCount, scenarioCount, lastRunStatus emoji per service card using data already returned by GET /api/services. Also added "전체 보기 →" link and hover group styling.

**scenarios.test.ts**: two new duplicate tests:
- "preserves steps from the original scenario" — verifies step type and config are copied
- "preserves tags, priority, and variables from the original" — verifies all metadata fields

**Files changed:**
- `packages/web/src/pages/Dashboard.tsx` — service list with stats
- `packages/server/src/routes/scenarios.test.ts` — 2 new duplicate coverage tests

---

## 최근 완료 (Session 56 - 2026-05-30)

✅ **Service-level stats in GET /api/services** - Tests: 760 pass, 16 skip, 0 fail (+6 tests)

**Service stats (featureCount + scenarioCount + lastRunStatus) in GET /api/services**
- `ServiceWithStats` interface added: extends Service with `featureCount`, `scenarioCount`, `lastRunId`, `lastRunStatus`, `lastRunAt`
- `RowConverter.toServiceWithStats()` static converter added
- `getAllServicesWithStats()` uses 3-way LEFT JOIN (feature count, scenarios count via feature JOIN, last run via ROW_NUMBER window function across all service scenarios)
- Route now uses enriched method; backwards-compatible (adds new fields)
- Services.tsx: shows "X개 기능 / Y개 시나리오" + last run status emoji (✅/❌/⚠️/🔄) per service card
- +4 DB tests, +3 route tests

**Files changed:**
- `packages/server/src/db/database.ts` — ServiceWithStats type + converter + new method
- `packages/server/src/db/database.test.ts` — 4 new tests
- `packages/server/src/routes/services.ts` — use getAllServicesWithStats
- `packages/server/src/routes/services.test.ts` — 3 new tests
- `packages/web/src/pages/Services.tsx` — feature/scenario count + last run status emoji per card

## 최근 완료 (Session 55 - 2026-05-29)

✅ **Feature-level stats in ServiceDetail** - Tests: 754 pass, 16 skip, 0 fail (+6 tests)

**Feature stats (scenarioCount + lastRunStatus) in GET /api/services/:id/features**
- `FeatureWithStats` interface added: extends Feature with `scenarioCount`, `lastRunId`, `lastRunStatus`, `lastRunAt`
- `RowConverter.toFeatureWithStats()` static converter added
- `getFeaturesByServiceWithStats()` uses JOIN + ROW_NUMBER window function (same pattern as `getScenariosByFeatureWithLastRun`)
- Route now uses enriched method; backwards-compatible (adds new fields)
- ServiceDetail.tsx: shows "X개 시나리오" count + `FeatureLastRunBadge` per feature row
- +4 DB tests, +2 route tests

**Files changed:**
- `packages/server/src/db/database.ts` — FeatureWithStats type + converter + new method
- `packages/server/src/db/database.test.ts` — 4 new tests
- `packages/server/src/routes/services.ts` — use getFeaturesByServiceWithStats
- `packages/server/src/routes/services.test.ts` — 2 new tests
- `packages/web/src/pages/ServiceDetail.tsx` — scenario count + last run badge UI

## 최근 완료 (Session 54 - 2026-05-29)

✅ **Dashboard broken links fix + getTestRun enrichment + Runs pagination** - Tests: 748 pass, 16 skip, 0 fail (+2 DB tests)

**1. Bug fix: Dashboard "상세 →" links were broken**
- Links pointed to `/runs/${run.id}` which has no matching route in App.tsx
- Fixed to `/scenarios/${run.scenarioId}/runs/${run.id}` (correct route)
- `RecentFailureRun` interface already had `scenarioId` from the API response

**2. Enriched `getTestRun` with scenarioName**
- Changed simple `SELECT * FROM test_runs` to LEFT JOIN with scenarios
- Now returns `TestRun & { scenarioName: string }` (consistent with `getAllTestRuns`)
- +2 DB tests: scenarioName populated, unknown id returns undefined

**3. Server-side offset pagination in Runs.tsx**
- `PAGE_SIZE = 50` — fetches 50 per page from server using `offset` param
- Prev/Next buttons + page number display
- `getRuns()` in api.ts now forwards `offset` parameter
- Search mode still fetches 500 client-side (no page controls shown)
- Filter changes reset page to 0

**Files changed:**
- `packages/server/src/db/database.ts` — getTestRun enriched with JOIN
- `packages/server/src/db/database.test.ts` — 2 new tests
- `packages/web/src/pages/Dashboard.tsx` — fixed broken run links
- `packages/web/src/pages/Runs.tsx` — pagination UI
- `packages/web/src/lib/api.ts` — getRuns offset param

## 최근 완료 (Session 53 - 2026-05-28)

✅ **Server-side date range filtering + ScenarioEditor Recent Runs** - Tests: 746 pass, 16 skip, 0 fail (+5 DB tests, +2 route tests)

**1. Server-side date range filtering for GET /api/runs**
- `getAllTestRuns()` accepts optional `from`/`to` Date params (DB-level WHERE clause)
- Route parses `?from=` and `?to=` ISO date strings
- `getRuns()` in api.ts accepts and forwards `from`/`to`
- `Runs.tsx`: replaced client-side diffDays date filtering with server-side `?from=` param

**2. "Recent Runs" card in ScenarioEditor**
- New card at bottom shows last 10 runs for the current scenario
- Status icon, relative time (date-fns/ko), duration, pass/fail/healed summary
- Direct link to each run's detail page
- Uses existing `getRuns(10, { scenarioId })` API

**Files changed:**
- `packages/server/src/db/database.ts` — from/to params in getAllTestRuns
- `packages/server/src/db/database.test.ts` — 5 new date filter tests
- `packages/server/src/routes/runs.ts` — from/to query param parsing
- `packages/server/src/routes/runs.test.ts` — 2 new route tests
- `packages/web/src/lib/api.ts` — from/to in getRuns filters
- `packages/web/src/pages/Runs.tsx` — server-side date filter
- `packages/web/src/pages/ScenarioEditor.tsx` — Recent Runs card

## 최근 완료 (Session 52 - 2026-05-28)

✅ **RunDetail step enrichment + TS fix** - Tests: 741 pass, 16 skip, 0 fail (+1 test)

**1. Fixed TS error in runs.test.ts**
- `createTestRun()` returns `{ service, feature, scenario, runId }` — not `scenarioId`
- Test was incorrectly destructuring `{ scenarioId: sid }` → changed to bare `await createTestRun()`

**2. RunDetail.tsx step name enrichment**
- Step accordion now shows step type icon + description: "🌐 Navigate to /login" instead of "스텝 #0"
- `STEP_TYPE_ICONS` map added (mirrors ScenarioEditor.tsx)
- Uses `scenario.steps[step.stepIndex]` (already fetched) to get step definition

**3. RunDetail.tsx step config summary in accordion body**
- `stepConfigSummary(step)` renders a gray monospace line:
  - navigate → `URL: /admin`
  - click/fill/hover → locator displayName or first strategy value
  - api-request → `GET https://api.example.com/users`
  - assert → assertion type + expected value
  - etc.

**4. New test: dashboard recentFailures includes scenarioName**

**Files changed:**
- `packages/server/src/routes/runs.test.ts` — TS fix + new scenarioName test
- `packages/web/src/pages/RunDetail.tsx` — step name/type display + config summary

## 최근 완료 (Session 51 - 2026-05-27)

✅ **Last run status in FeatureDetail scenario list** - Tests: 740 pass, 16 skip, 0 fail (+2 route tests)

**Per-scenario last-run status indicator in FeatureDetail**
- `getScenariosByFeatureWithLastRun()` added to database.ts using DuckDB window function JOIN
  - `ROW_NUMBER() OVER (PARTITION BY scenario_id ORDER BY created_at DESC)` to get most recent run per scenario in single query
  - Returns `ScenarioWithLastRun` (Scenario + `lastRunId`, `lastRunStatus`, `lastRunAt`)
- `GET /api/features/:id/scenarios` now returns enriched type
- `FeatureDetail.tsx`: `LastRunBadge` component shows ✅/❌/⚠️/🔄/⏹️ + relative timestamp
- Scenarios with no runs show "미실행" label

**Files changed:**
- `packages/server/src/db/database.ts` - ScenarioWithLastRun type + getScenariosByFeatureWithLastRun()
- `packages/server/src/routes/features.ts` - use new method in GET /api/features/:id/scenarios
- `packages/server/src/routes/features.test.ts` - 2 new tests for lastRunStatus behavior
- `packages/web/src/pages/FeatureDetail.tsx` - LastRunBadge + date-fns relative time

## 최근 완료 (Session 50 - 2026-05-27)

✅ **UX improvements + offset pagination** - Tests: 738 pass, 16 skip, 0 fail (+5 tests)

**1. alert() → toast() in ServiceDetail/FeatureDetail** (consistent UX)
- `ServiceDetail.tsx` & `FeatureDetail.tsx`: replaced browser `alert()` with `useToast` hook
- Success/error feedback now shows non-blocking toast notifications (already used in ScenarioEditor)

**2. Server-side status filter in Runs.tsx**
- `getRuns()` in `api.ts` now accepts optional `{ status, scenarioId }` filters
- `Runs.tsx` passes `status` filter to server (reduces data transfer), date/search remain client-side
- Removed unused `_getStatusColor` function from Runs.tsx

**3. offset pagination for GET /api/runs**
- `getAllTestRuns()` now accepts `offset` (3rd param, default 0) with safe fallback for invalid values
- Query: `LIMIT ? OFFSET ?` - proper cursor-based pagination
- Route parses `?offset=` query param
- +3 DB tests, +2 route tests

**4. Components.tsx search & shadcn cleanup**
- Added search input with name/description/type filtering and result count
- Replaced raw `<button>` with shadcn `Button` component
- Consistent with Services.tsx, FeatureDetail.tsx patterns

**Files changed:**
- `packages/server/src/db/database.ts` - offset param in getAllTestRuns
- `packages/server/src/routes/runs.ts` - offset query param
- `packages/server/src/db/database.test.ts` - 3 offset tests
- `packages/server/src/routes/runs.test.ts` - 2 offset route tests
- `packages/web/src/lib/api.ts` - getRuns accepts filters
- `packages/web/src/pages/Runs.tsx` - server-side status filter
- `packages/web/src/pages/ServiceDetail.tsx` - toast notifications
- `packages/web/src/pages/FeatureDetail.tsx` - toast notifications, removed _allTags
- `packages/web/src/pages/Components.tsx` - search + consistent Button

## 최근 완료 (Session 49 - 2026-05-26)

✅ **GET /api/runs featureId/serviceId filters** - Tests: 733 pass, 16 skip, 0 fail (+6 tests)

**featureId/serviceId filters for GET /api/runs** (eliminates N+1 on detail pages)
- `getAllTestRuns()` extended with optional `featureId` and `serviceId` filters
- `featureId`: filters via existing scenarios JOIN (`s.feature_id = ?`)
- `serviceId`: conditionally adds `JOIN features f ON s.feature_id = f.id` then `f.service_id = ?`
- Route parses `featureId` and `serviceId` query params
- +4 DB tests: featureId filter, serviceId filter, empty result, cross-service isolation
- +3 route tests: featureId filter, serviceId filter, empty featureId result

**Files changed:**
- `packages/server/src/db/database.ts` - getAllTestRuns with featureId/serviceId filters
- `packages/server/src/routes/runs.ts` - featureId/serviceId query param support
- `packages/server/src/db/database.test.ts` - 4 new filter tests
- `packages/server/src/routes/runs.test.ts` - 3 new route tests

## 최근 완료 (Session 48 - 2026-05-26)

✅ **GET /api/runs filtering + NaN limit fix** - Tests: 727 pass, 16 skip, 0 fail (+14 tests)

**scenarioId/status filters for GET /api/runs** (PRD Section 4.1 "필터링")
- `getAllTestRuns()` extended with optional `{ scenarioId?, status? }` filters
- Builds dynamic WHERE clause with parameterized conditions
- NaN/invalid limit falls back to 50 (fixes potential error with `?limit=invalid`)
- Route parses `scenarioId` and `status` query params and passes to DB layer
- +10 route tests: filter combinations, invalid limit, healed stats, recentFailures
- +5 DB tests: scenarioId filter, status filter, combined filters

**Files changed:**
- `packages/server/src/db/database.ts` - getAllTestRuns with filters + NaN guard
- `packages/server/src/routes/runs.ts` - scenarioId/status query param support
- `packages/server/src/db/database.test.ts` - 5 new filter tests
- `packages/server/src/routes/runs.test.ts` - 10 new route tests

## 최근 완료 (Session 47 - 2026-05-25)

✅ **N+1 query fix in POST /api/services/:id/run** - Tests: 713 pass, 16 skip, 0 fail (+4 tests)

**getScenariosByService JOIN query** (packages/server/src/db/database.ts)
- `POST /api/services/:id/run` called `getScenariosByFeature` once per feature (N+1 queries)
- Added `getScenariosByService(serviceId)` using JOIN: `SELECT s.* FROM scenarios s JOIN features f ON s.feature_id = f.id WHERE f.service_id = ?`
- Services route updated to use single query instead of loop
- Added 4 new tests: service isolation, multi-feature run count, unknown service, cross-service isolation

## 최근 완료 (Session 46 - 2026-05-25)

✅ **N+1 query fix in updateComponentUsagesForScenario** - Tests: 709 pass, 16 skip, 0 fail (+3 tests)

**Batch component existence check** (packages/server/src/db/database.ts)
- `updateComponentUsagesForScenario` called `getComponent()` once per component step (N queries)
- Changed to collect all unique component IDs, run a single `SELECT id FROM components WHERE id IN (...)` query, then check existence from a Set
- Early return when no component steps exist (avoids DB round-trip entirely)
- Added 4 new tests: ghost IDs skipped, mixed valid/invalid, update sync

## 최근 완료 (Session 45 - 2026-05-24)

✅ **Security + Performance fixes** - Tests: 706 pass, 16 skip, 0 fail (+3 tests)

**1. SQL injection fix** (packages/server/src/db/database.ts)
- `getDashboardRuns` used `INTERVAL '${hours} hours'` string interpolation
- Changed to parameterized cutoff: `WHERE t.created_at >= ?` with a computed Date object

**2. Healing status filter optimization** (packages/server/src/routes/healing.ts)
- `GET /api/healing?status=X` previously fetched ALL records then filtered in JS
- Now calls `getHealingRecordsByStatus(status)` which uses DB-level WHERE clause
- New method added to DuckDBDatabase

**3. Composite indexes** (packages/server/src/db/schema.ts + migration 0004)
- `test_runs(scenario_id, created_at DESC)` - speeds up getTestRunsByScenario
- `healing_records(status, created_at DESC)` - speeds up filtered healing list
- `step_results(run_id, step_index ASC)` - speeds up getStepResultsByRun

**4. New tests** (+3 tests in database.test.ts):
- getDashboardRuns excludes runs older than the time window
- getHealingRecordsByStatus filters correctly by status
- getHealingRecordsByStatus returns empty array for unmatched status

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

- Remaining 16 skipped tests are browser-integration (Playwright required, legitimately skipped)
- 사용자 피드백 반영
- Any new PRD items or feature requests

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
