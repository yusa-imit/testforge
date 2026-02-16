# /implement — 기능 구현 워크플로우

기능 구현을 체계적으로 수행합니다. $ARGUMENTS에 구현할 기능을 설명합니다.

## 실행 절차

### 1. 요구사항 분석

1. `docs/PRD.md`에서 관련 섹션 읽기
2. 현재 코드베이스 상태 파악
3. 구현 범위 확정

### 2. 계획 수립

`EnterPlanMode`로 구현 전략 수립:
- 수정/생성할 파일 목록
- 의존성 순서 (Backend → Frontend)
- 테스트 전략

### 3. 팀 구성 (필요 시)

**3개 이상 파일 수정** → 팀 구성:

```
Leader (orchestrator)
├── backend      — API/DB 구현
├── frontend     — UI 구현
├── reviewer     — 코드 리뷰
└── architect    — 설계 검토 (필요 시)
```

**단일 파일 수정** → 직접 수행

### 4. 구현

1. **Backend 먼저**: DB 스키마 → API 엔드포인트 → 서비스 로직
2. **Frontend 다음**: 타입 정의 → API 클라이언트 → 컴포넌트 → 페이지
3. **테스트**: 각 구현 단계마다 `bun test` + `bun run typecheck`

### 5. 검증

```bash
bun run typecheck   # 타입 체크
bun run lint        # 린트
bun test            # 테스트
bun run build       # 빌드
```

### 6. 리뷰

`/review` 실행하여 변경사항 검토

### 7. 완료 보고

```
## Implementation Complete

### Feature: [기능명]
### Files Changed
- [파일 목록]
### Tests
- [테스트 결과]
### PRD Compliance
- [PRD 준수 확인]
```
