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
- **Global Search** (header search bar across all entities)
- **CSV Export** (test runs export with filter support)
- **Variable Override on Run** (POST /api/scenarios/:id/run accepts { variables })
- **Step Performance Analytics** (GET /api/scenarios/:id/step-stats — per-step avg/min/max duration + failure rate)
- **Step Retry/Disabled UI** (StepEditModal exposes retries, retryDelay, disabled fields; engine already supported them)
- **healed RunStatus** (added to core schema + RunDetail badge)
- **Webhook Notifications** (POST to configured URLs on run.completed/passed/failed/healed; HMAC-SHA256 signing)
- **Scheduled Test Runs** (interval-based automation: 15m/30m/1h/3h/6h/12h/daily/weekly; background scheduler; manual trigger)
- **Flaky Test Detection** (GET /api/scenarios/flaky; pass rate 10-90% threshold; Dashboard widget)

## 최근 완료 (Session 73 - 2026-06-10)

✅ **Flaky Test Detection** — Tests: 871 pass, 16 skip, 0 fail (+5 tests)

**Automatic identification of scenarios with inconsistent pass rates:**
- `getFlakyScenarios(minRuns=3, days=30)` DB method: JOIN query across test_runs/scenarios/features/services
  - HAVING: pass_rate > 0.1 AND pass_rate < 0.9 (excludes consistently passing/failing)
  - Returns: scenarioId/Name, featureId/Name, serviceId/Name, runCount, passRate, passCount, failCount, lastRunAt
- `GET /api/scenarios/flaky?minRuns=3&days=30` — route placed BEFORE `/:id` to avoid routing conflict
- 5 route tests: empty when below minRuns, flaky detection at 50% pass rate, excludes 100% pass, excludes 0% pass, breadcrumb fields
- `FlakyScenario` interface + `getFlakyScenarios()` in api.ts
- Dashboard "불안정 테스트" card: shown when flakyScenarios.length > 0; pass rate progress bar (yellow/red), scenario count badge, service/feature breadcrumb

**Files changed:**
- `packages/server/src/db/database.ts` — getFlakyScenarios method
- `packages/server/src/routes/scenarios.ts` — GET /flaky route
- `packages/server/src/routes/scenarios.test.ts` — 5 new tests
- `packages/web/src/lib/api.ts` — FlakyScenario interface + getFlakyScenarios()
- `packages/web/src/pages/Dashboard.tsx` — flaky tests card

## 최근 완료 (Session 72 - 2026-06-10)

✅ **Scheduled Test Runs** — Tests: 866 pass, 16 skip, 0 fail (+17 tests)

**Automated scenario execution on interval schedule:**
- `schedules` table (migration 0006): id, name, scenario_id, interval_minutes, enabled, last_run_at, next_run_at
- Valid intervals: 15, 30, 60, 180, 360, 720, 1440, 10080 minutes
- `getDueSchedules()`: fetches enabled schedules where next_run_at <= now()
- `recordScheduleRun()`: updates last_run_at + advances next_run_at by interval
- `execution/scheduler.ts`: setInterval 60s background runner; finds due schedules, fires executeScenarioRun (fire-and-forget)
- `startScheduler/stopScheduler` wired into index.ts main block + graceful shutdown

**API: CRUD /api/schedules**
- `GET /api/schedules` — list all (joined with scenario name)
- `POST /api/schedules` — create (Zod: name, scenarioId UUID, intervalMinutes enum)
- `GET/PUT/DELETE /api/schedules/:id` — get/update/delete
- `POST /api/schedules/:id/trigger` — manual trigger returns runId

**Also added: `GET /api/scenarios`** — root endpoint returning all scenarios (needed for dropdown)

**Web: Schedules.tsx page**
- List cards: enabled/disabled indicator, scenario name, interval badge, last/next run times
- Manual "지금 실행" button per card
- Create/edit dialog: name input, scenario dropdown (all scenarios), interval picker
- Enable/disable toggle, delete with confirm dialog
- Nav link "스케줄" in Layout

**Files changed:**
- `packages/server/src/db/migrations/0006_schedules.sql`
- `packages/server/src/db/database.ts` — Schedule type + 7 CRUD methods
- `packages/server/src/routes/schedules.ts` — API routes
- `packages/server/src/routes/schedules.test.ts` — 17 tests
- `packages/server/src/routes/scenarios.ts` — GET / root endpoint
- `packages/server/src/execution/scheduler.ts` — background scheduler
- `packages/server/src/index.ts` — route registration + scheduler start/stop
- `packages/web/src/lib/api.ts` — Schedule types + API functions + getAllScenarios
- `packages/web/src/pages/Schedules.tsx` — management page
- `packages/web/src/App.tsx` — route
- `packages/web/src/components/Layout.tsx` — nav link

## 최근 완료 (Session 71 - 2026-06-09)

✅ **Webhook notifications on run completion** — Tests: 849 pass, 16 skip, 0 fail (+15 tests)

**New: Webhook subscriptions with run event delivery**
- `webhooks` table (migration 0005): id, name, url, secret, events[], enabled
- Events: `run.completed` (any), `run.passed`, `run.failed`, `run.healed`
- `webhookDispatcher.ts`: after run saves, fires POST to each matching enabled webhook; fire-and-forget, errors logged
- HMAC-SHA256 signing: if `secret` set, adds `X-TestForge-Signature: sha256=<hex>` header
- `runHelper.ts`: calls `dispatchWebhooks(db, result.run, scenario.name)` after saving results

**API: CRUD /api/webhooks**
- `GET /api/webhooks` — list all
- `POST /api/webhooks` — create (Zod: name, url, secret?, events[])
- `GET/PUT/DELETE /api/webhooks/:id` — get/update/delete

**Web: Webhooks.tsx page**
- List cards with enable/disable toggle, edit, delete
- Create/edit dialog: name, URL, secret, event checkboxes
- Empty state with CTA
- Nav link "Webhooks" in Layout

**Files changed:**
- `packages/server/src/db/migrations/0005_webhooks.sql`
- `packages/server/src/db/schema.ts` — webhooksTable added
- `packages/server/src/db/database.ts` — Webhook types + 5 CRUD methods
- `packages/server/src/execution/webhookDispatcher.ts` — new dispatcher
- `packages/server/src/execution/runHelper.ts` — dispatch after save
- `packages/server/src/routes/webhooks.ts` — API routes
- `packages/server/src/routes/webhooks.test.ts` — 15 tests
- `packages/server/src/index.ts` — route registration
- `packages/web/src/lib/api.ts` — webhook API functions + types
- `packages/web/src/pages/Webhooks.tsx` — management page
- `packages/web/src/App.tsx` — route
- `packages/web/src/components/Layout.tsx` — nav link

## 최근 완료 (Session 70 - 2026-06-09)

✅ **Step retry/disabled settings in StepEditModal UI + healed RunStatus fix** — Tests: 834 pass, 16 skip, 0 fail (0 new tests, type fixes)

**StepEditModal advanced settings now include:**
- `retries` (0-10): number of retries before failing the step
- `retryDelay` (ms): delay between retries (default 1000ms)
- `disabled` (bool): skip this step during execution

**ScenarioEditor step card visual indicators:**
- Disabled steps: muted/line-through style, gray step number, "비활성" badge
- Steps with retries: purple "재시도 ×N" badge + retry info line in config preview

**Type fixes:**
- `runStatusSchema` now includes `"healed"` (matches actual DB usage)
- `RunDetail.tsx` local `TestRun` interface + `StatusBadge` updated with `healed`
- `runs.test.ts` `createTestRun` helper type updated to accept `"healed"`

**Files changed:**
- `packages/core/src/types/index.ts` — added "healed" to runStatusSchema
- `packages/server/src/routes/runs.test.ts` — createTestRun accepts "healed"
- `packages/web/src/components/StepEditModal.tsx` — retries/retryDelay/disabled fields
- `packages/web/src/pages/RunDetail.tsx` — healed status in interface + badge
- `packages/web/src/pages/ScenarioEditor.tsx` — disabled/retry visual indicators

## 최근 완료 (Session 69 - 2026-06-05)

✅ **Scenario step performance analytics** — Tests: 834 pass, 16 skip, 0 fail (+5 tests)

**GET /api/scenarios/:id/step-stats** — new endpoint returning per-step aggregate stats:
- `stepIndex`, `count`, `passCount`, `failCount`, `avgDuration`, `minDuration`, `maxDuration`, `failureRate`
- Joins `step_results` with `test_runs` to filter by `scenario_id`
- Groups by `step_index`, returns results ordered ASC
- DB method: `getScenarioStepStats(scenarioId, limit=50)` in `database.ts`
- 5 new route tests in `scenarios.test.ts`

**ScenarioEditor.tsx "스텝 성능 분석" card** (shown when stepStats.length > 0):
- Table: step icon + description, run count, avg/min/max duration (formatted ms/s), failure rate %
- Color-coded failure rate: ≥50% red, >0% yellow, 0% green
- Fetched via new `getScenarioStepStats(id)` in `api.ts` (`ScenarioStepStat` interface)
- Displayed before the step edit modal, after "최근 실행 이력" card

**Files changed:**
- `packages/server/src/db/database.ts` — `getScenarioStepStats` method
- `packages/server/src/routes/scenarios.ts` — `GET /:id/step-stats` route
- `packages/server/src/routes/scenarios.test.ts` — 5 new tests
- `packages/web/src/lib/api.ts` — `ScenarioStepStat` interface + `getScenarioStepStats()`
- `packages/web/src/pages/ScenarioEditor.tsx` — step stats card UI

## 최근 완료 (Session 68 - 2026-06-05)

✅ **Variable override for scenario runs** - Tests: 829 pass, 16 skip, 0 fail (+3 tests)

**POST /api/scenarios/:id/run** now accepts optional JSON body `{ variables?: Record<string, unknown> }`:
- `runHelper.ts`: `executeScenarioRun()` accepts `variables?` param, forwarded to `executor.execute()`
- `scenarios.ts`: `zValidator` with `runScenarioSchema` (optional body), extracts `body?.variables`
- `api.ts`: `runScenario(id, variables?)` — optional variables arg passed as JSON body
- `ScenarioEditor.tsx`: when scenario has variables, clicking "실행" opens a "Run with variables" dialog
  - pre-fills with scenario default values
  - user can override per-run values before executing
  - Dialog uses existing shadcn/ui `Dialog` + `Input` components

**Files changed:**
- `packages/server/src/execution/runHelper.ts` — variables param
- `packages/server/src/routes/scenarios.ts` — runScenarioSchema + body parsing
- `packages/server/src/routes/scenarios.test.ts` — 3 new tests
- `packages/web/src/lib/api.ts` — runScenario variables param
- `packages/web/src/pages/ScenarioEditor.tsx` — run-with-variables dialog

## 최근 완료 (Session 67 - 2026-06-04)

✅ **CSV export for test runs — GET /api/runs/export** - Tests: 826 pass, 16 skip, 0 fail (+6 tests)

**GET /api/runs/export** — new endpoint (placed before `/:id` to avoid route conflict):
- Accepts same filters as list: `status`, `scenarioId`, `featureId`, `serviceId`, `from`, `to`
- Fetches up to 10,000 matching runs (no pagination for export)
- Returns `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="testforge-runs-YYYY-MM-DD.csv"`
- CSV columns: `id`, `scenarioName`, `status`, `startedAt`, `finishedAt`, `duration_ms`, `totalSteps`, `passedSteps`, `failedSteps`, `healedSteps`, `skippedSteps`, `createdAt`
- Proper CSV escaping (double-quotes values with commas/quotes/newlines)

**Runs.tsx "CSV 내보내기" button:**
- Appears in the filter bar (right-aligned with `ml-auto`)
- Builds export URL with current `status` + `from` filters applied
- Triggers browser download via programmatic `<a>` click (no page navigation)
- Uses `Download` icon from lucide-react

**Files changed:**
- `packages/server/src/routes/runs.ts` — `/export` route added before `/:id`
- `packages/server/src/routes/runs.test.ts` — 6 new export tests
- `packages/web/src/pages/Runs.tsx` — `handleExportCSV` + export button

---

## 최근 완료 (Session 66 - 2026-06-04)

✅ **Global search — header search bar with service/feature/scenario results** - Tests: 820 pass, 16 skip, 0 fail (+9 tests)

**GET /api/search?q=...&limit=N** — new endpoint:
- `searchEntities(q, limit)` DB method: 3 ILIKE queries (services, features+service, scenarios+feature+service)
- Returns grouped results with full breadcrumb context (serviceId/serviceName/featureId/featureName)
- Case-insensitive search (DuckDB ILIKE)

**GlobalSearch.tsx component** integrated into Layout header:
- Debounced input (300ms) with TanStack Query cache (10s stale)
- Dropdown shows type icon (🔧/📦/🧪) + name + breadcrumb path
- Keyboard navigation: ↑↓ to move, Enter to select, Escape to close
- Clear button, click-outside closes dropdown
- Navigates to `/services/:id`, `/features/:id`, or `/scenarios/:id`

**Files changed**:
- `packages/server/src/db/database.ts` — searchEntities method
- `packages/server/src/routes/search.ts` — new route (GET /)
- `packages/server/src/routes/search.test.ts` — 9 tests
- `packages/server/src/index.ts` — route registration
- `packages/web/src/lib/api.ts` — search() function + SearchResultItem interface
- `packages/web/src/components/GlobalSearch.tsx` — new component
- `packages/web/src/components/Layout.tsx` — GlobalSearch integrated in header

## 최근 완료 (Session 65 - 2026-06-03)

✅ **Global run stats + 7-day trend chart on Dashboard** - Tests: 811 pass, 16 skip, 0 fail (+8 tests)

**getDashboardStats(days=7)** — new DB method returning all-time aggregate + daily trend:
- `totalRuns`, `passedRuns`, `failedRuns`, `healedRuns`, `cancelledRuns`, `passRate`, `avgDuration`
- `trend` array: daily `{ date, passed, failed, healed }` for last N days (default 7, max 90)
- Route: `GET /api/runs/dashboard?days=N` now returns `globalStats` alongside the 24h stats

**Dashboard.tsx "전체 실행 현황" card** (shown when totalRuns > 0):
- 4-stat grid: cumulative total, overall pass rate (color-coded), failures, avg duration
- Mini bar chart of daily trend with color-coded bars (same pattern as Service/Feature/Scenario stats)
- Displayed between the 24h stats card and the Self-Healing status card

**Files changed**:
- `packages/server/src/db/database.ts` — getDashboardStats method
- `packages/server/src/db/database.test.ts` — 5 new tests
- `packages/server/src/routes/runs.ts` — globalStats in dashboard response + ?days param
- `packages/server/src/routes/runs.test.ts` — 4 new route tests
- `packages/web/src/pages/Dashboard.tsx` — global stats card with trend chart

---

## 최근 완료 (Session 64 - 2026-06-03)

✅ **Service-level aggregate run stats API + stats card in ServiceDetail** - Tests: 803 pass, 16 skip, 0 fail (+9 tests)

**GET /api/services/:id/stats** — new endpoint returning:
- `totalRuns`, `passedRuns`, `failedRuns`, `healedRuns`, `cancelledRuns`
- `passRate` (0-1, includes healed), `avgDuration`
- `featureCount`, `scenarioCount` (distinct across all runs)
- `trend` array: daily `{ date, passed, failed, healed }` for last N days (default 7, max 90)
- Route: `?days=N` query param

**ServiceDetail.tsx stats card** (shown when totalRuns > 0):
- 4-stat grid: total runs, pass rate (color-coded ≥90%/≥70%/<70%), failures, avg duration
- Mini bar chart of daily trend with color coded bars
- Displayed between the Service Info card and the Features section

**DB method**: `getServiceStats(serviceId, days=7)` — 3-way JOIN across test_runs/scenarios/features
**Files changed**:
- `packages/server/src/db/database.ts` — getServiceStats method
- `packages/server/src/db/database.test.ts` — 5 new tests
- `packages/server/src/routes/services.ts` — GET /:id/stats route
- `packages/server/src/routes/services.test.ts` — 4 new route tests
- `packages/web/src/lib/api.ts` — getServiceStats function
- `packages/web/src/pages/ServiceDetail.tsx` — stats card UI

---

## 최근 완료 (Session 63 - 2026-06-02)

✅ **Feature-level aggregate run stats API + stats card in FeatureDetail** - Tests: 794 pass, 16 skip, 0 fail (+9 tests)

**GET /api/features/:id/stats** — new endpoint returning:
- `totalRuns`, `passedRuns`, `failedRuns`, `healedRuns`, `cancelledRuns`
- `passRate` (0-1, includes healed), `avgDuration`, `scenarioCount`
- `trend` array: daily `{ date, passed, failed, healed }` for last N days (default 7, max 90)
- Route: `?days=N` query param

**FeatureDetail.tsx stats card** (shown when totalRuns > 0):
- 4-stat grid: total runs, pass rate (color-coded ≥90%/≥70%/<70%), failures, avg duration
- Mini bar chart of daily trend with color coded bars
- Displayed between the Feature Info card and the Scenarios section

**DB method**: `getFeatureStats(featureId, days=7)` — JOIN query across scenarios
**Files changed**:
- `packages/server/src/db/database.ts` — getFeatureStats method
- `packages/server/src/db/database.test.ts` — 5 new tests
- `packages/server/src/routes/features.ts` — GET /:id/stats route
- `packages/server/src/routes/features.test.ts` — 4 new route tests
- `packages/web/src/lib/api.ts` — getFeatureStats function
- `packages/web/src/pages/FeatureDetail.tsx` — stats card UI

---

## 최근 완료 (Session 62 - 2026-06-02)

✅ **Scenario run statistics API + stats card in ScenarioEditor** - Tests: 785 pass, 16 skip, 0 fail (+9 tests)

**GET /api/scenarios/:id/stats** — new endpoint returning:
- `totalRuns`, `passedRuns`, `failedRuns`, `healedRuns`, `cancelledRuns`
- `passRate` (0-1, includes healed), `avgDuration`/`minDuration`/`maxDuration`
- `trend` array: daily `{ date, passed, failed, healed }` for last N days (default 7, max 90)
- Route: `?days=N` query param

**ScenarioEditor.tsx stats card** (shown when totalRuns > 0):
- 4-stat grid: total runs, pass rate (color-coded ≥90%/≥70%/<70%), failures, avg duration
- Mini bar chart of daily trend with color coded bars

**DB method**: `getScenarioStats(scenarioId, days=7)` — single agg query + trend query
**Files changed**:
- `packages/server/src/db/database.ts` — getScenarioStats method
- `packages/server/src/db/database.test.ts` — 5 new tests
- `packages/server/src/routes/scenarios.ts` — GET /:id/stats route
- `packages/server/src/routes/scenarios.test.ts` — 4 new route tests
- `packages/web/src/lib/api.ts` — getScenarioStats function
- `packages/web/src/pages/ScenarioEditor.tsx` — stats card UI

---

## 최근 완료 (Session 61 - 2026-06-01)

✅ **Per-scenario quick actions in FeatureDetail + pass rate route tests** - Tests: 776 pass, 16 skip, 0 fail (+2 route tests)

**Per-scenario dropdown (Run/Duplicate/Delete) in FeatureDetail scenario list:**
- Scenario rows now use div+Link combo so the ⋮ action button doesn't trigger navigation
- Hover reveals a `MoreHorizontal` dropdown menu with Play/Copy/Trash2 actions
- Run: calls `runScenario(id)` → navigates to `/scenarios/:id/runs/:runId` on success
- Duplicate: calls `duplicateScenario(id)` → invalidates scenarios query + toast
- Delete: sets `confirmDeleteId` state → shows confirmation Dialog → calls `deleteScenario(id)`
- All mutations use toast for success/error feedback

**Route tests for pass rate:**
- `features.test.ts`: +2 tests — `totalRuns=0/passCount=0` for no-run scenario, and `passed+healed=passCount` across 3 runs

**Files changed:**
- `packages/web/src/pages/FeatureDetail.tsx` — per-scenario actions dropdown + confirm delete dialog
- `packages/server/src/routes/features.test.ts` — 2 new pass rate route tests

---

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
