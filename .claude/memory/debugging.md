# TestForge — Debugging Insights

버그 해결 과정에서 얻은 인사이트를 기록합니다.

## 형식

```markdown
### [날짜] [버그 제목]
- **증상**: [증상 설명]
- **원인**: [근본 원인]
- **수정**: [수정 내용]
- **파일**: [수정된 파일]
- **교훈**: [향후 참고사항]
```

## 알려진 이슈

_(현재 미해결 이슈 없음)_

## 해결된 이슈

### [2026-05-24 session 42] runMigrations tests - "Table already exists"
- **증상**: migrate.test.ts의 8개 테스트가 "Catalog Error: Table with name X already exists!" 에러
- **원인**: `getDatabase(dbPath)` 가 싱글톤 패턴이라 경로를 무시하고 첫 번째 연결을 반환. 각 테스트가 새 DB 파일을 만들지만 모두 같은 연결을 공유
- **수정**: afterEach에서 `db.close()` 후 `resetDatabaseInstance()` 호출
- **파일**: `packages/server/src/db/migrate.test.ts`
- **교훈**: 싱글톤 DB 연결을 사용하는 테스트는 각 테스트 후 반드시 싱글톤을 리셋해야 함

### [2026-05-24 session 42] runHelper tests - timeout/status check failure
- **증상**: "missing component" 및 "invalid URL" 테스트가 3초 타임아웃 후 assertions 실패
- **원인**: engine.ts에서 expandSteps가 브라우저 초기화 + example.com 네트워크 요청 이후에 실행됨. 총 실행 시간이 3초 근처여서 race condition 발생
- **수정 1**: engine.ts에서 expandSteps를 initBrowser 전으로 이동 → 컴포넌트 없는 경우 브라우저 없이 즉시 실패
- **수정 2**: runHelper.test.ts 서비스 baseUrl을 `about:blank`로 변경 → 초기 네트워크 호출 제거
- **파일**: `packages/core/src/executor/engine.ts`, `packages/server/src/execution/runHelper.test.ts`
- **교훈**: expandSteps는 브라우저 상태가 필요 없으므로 브라우저 초기화 전에 수행하는 것이 옳음. 테스트에서 외부 네트워크 의존성은 flaky 원인이 됨

### [2026-02-22 session 19] React component testing with Bun + happy-dom
- **증상**: React Testing Library tests failing with `document is not defined`
- **원인**: Bun test runner doesn't auto-setup DOM environment like Jest
- **시도한 해결책**: Global happy-dom setup (`global.document = ...`) → `screen` API still failed
- **최종 수정**: Component class 단위 테스트로 전환 (render() 대신 new ErrorBoundary() 직접)
- **파일**: `packages/web/src/components/ErrorBoundary.test.tsx`
- **교훈**:
  - Bun에서 React component render 테스트는 복잡함 (DOM setup 이슈)
  - Class component는 인스턴스 메서드 직접 테스트 가능 (render 없이)
  - 단순 유닛 테스트로도 충분한 커버리지 확보 가능
  - E2E 테스트나 실제 브라우저 테스트는 Playwright로 수행

### [2026-02-19 session 9] updateHealingRecord propagatedTo 빈 배열 바인딩 실패
- **증상**: propagate 엔드포인트에서 아무 시나리오도 매칭 안 되면 500 에러
- **원인**: `propagatedTo: []` (빈 배열)로 UPDATE 시 DuckDB VARCHAR[] 변환 실패
- **수정**: `data.propagatedTo?.length ? data.propagatedTo : null` — null로 저장
- **추가 수정**: `toHealingRecord`에서 `propagated_to || undefined` → `propagated_to || []`로 복원
- **파일**: `packages/server/src/db/database.ts`

### [2026-02-19 session 9] healing_records FK 제약 (테스트)
- **증상**: `createHealingRecord()` 직접 호출 시 FK 에러
- **원인**: `healing_records.scenario_id → scenarios(id)`, `run_id → test_runs(id)` FK 제약
- **수정**: 테스트 beforeEach에서 service→feature→scenario→test_run 전체 계층 생성 후 ID 사용
- **파일**: `packages/server/src/routes/healing.test.ts`

### [2026-05-24 session 43] DuckDB VARCHAR[] non-empty array binding failure
- **증상**: createFeature(owners: ["alice","bob"]), createScenario(tags: ["smoke"]), updateHealingRecord(propagatedTo: [...]) 모두 "Conversion Error: Type VARCHAR with value 'a,b' can't be cast to VARCHAR[]"
- **원인**: duckdb node.js 드라이버가 JS 배열을 파라미터로 받으면 자동으로 comma-joined string으로 변환 ("a,b"). 이 string이 VARCHAR[]로 캐스팅 불가
- **수정**: SQL에서 `CAST(? AS VARCHAR[])` 사용, 파라미터로 `JSON.stringify(array)` 전달. DuckDB는 JSON 배열 문자열을 VARCHAR[]로 캐스팅 가능
- **파일**: `packages/server/src/db/database.ts` (createFeature, updateFeature, createScenario, updateScenario, duplicateScenario, updateHealingRecord)
- **교훈**: DuckDB node.js 드라이버의 배열 바인딩은 항상 `CAST(? AS VARCHAR[])` + `JSON.stringify` 패턴 사용

### [2026-02-19] DuckDB VARCHAR[] 빈 배열 바인딩 실패
- **증상**: `createFeature`, `createScenario` 호출 시 owners/tags가 빈 배열이면 `Conversion Error: Type VARCHAR with value '' can't be cast to VARCHAR[]`
- **원인**: DuckDB 드라이버가 JS 빈 배열 `[]`을 VARCHAR[]로 변환 불가. `null`은 정상 처리됨
- **수정**: `data.owners?.length ? data.owners : null` — 빈 배열 대신 null 사용
- **파일**: `packages/server/src/db/database.ts`
- **교훈**: DuckDB 파라미터 바인딩 시 배열 타입은 null로 처리, RowConverter에서 `row.owners || []`로 복원

### [2026-02-19] DuckDB undefined 파라미터 바인딩 실패
- **증상**: `createService({ name, baseUrl })` 호출 시 "Values were not provided for prepared statement parameters: 7"
- **원인**: `data.defaultTimeout`이 undefined일 때 DuckDB 파라미터 카운트 오류 발생
- **수정**: `data.defaultTimeout ?? 30000` — 명시적 기본값 제공
- **파일**: `packages/server/src/db/database.ts`
- **교훈**: DuckDB 파라미터 바인딩 시 undefined 값은 에러 유발; 항상 null 또는 기본값으로 처리

### [2026-02-19] delete* 메서드가 항상 true 반환
- **증상**: 존재하지 않는 ID로 DELETE 호출 시 200 OK 반환 (404 대신)
- **원인**: `deleteService/Feature/Scenario/Component` 모두 `return true`로 하드코딩
- **수정**: 삭제 전 존재 여부 확인, 없으면 false 반환
- **파일**: `packages/server/src/db/database.ts`
- **교훈**: DuckDB의 DELETE는 0행 영향 시에도 에러 없음; 비즈니스 로직에서 존재 확인 필요
