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

_(현재 미해결 이슈가 있을 때 여기에 기록)_

## 해결된 이슈

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
