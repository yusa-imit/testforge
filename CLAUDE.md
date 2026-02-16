# TestForge - Claude Code 프로젝트 가이드

## ⚠️ CRITICAL: PRD 필독 규칙

**모든 구현 작업 전에 PRD를 반드시 읽어야 합니다.**

```
🔴 MANDATORY: 어떤 코드도 작성하기 전에 먼저 docs/PRD.md를 읽으세요
```

**적용 범위:**
- ✅ 새로운 기능 구현
- ✅ UI 컴포넌트 작성 (특히!)
- ✅ API 엔드포인트 개발
- ✅ 데이터 모델 변경
- ✅ 아키텍처 설계
- ✅ 모든 서브 에이전트 작업

**PRD에는 다음이 명시되어 있습니다:**
- 완전한 데이터 모델 (TypeScript 인터페이스)
- API 엔드포인트 스펙 (경로, 메서드, 요청/응답)
- UI 화면 상세 설계 (와이어프레임, 동작)
- 스텝 타입별 설정 (config 구조)
- 기술 스택 및 사용법

**절대 하지 말 것:**
- ❌ PRD를 읽지 않고 추측으로 구현
- ❌ 타입을 임의로 정의
- ❌ API 경로를 임의로 정의
- ❌ UI 구조를 임의로 변경

---

## 프로젝트 개요

QA 엔지니어와 기획자를 위한 Self-Healing 자동화 테스트 플랫폼.

**핵심 기능:**
- 계층적 테스트 관리 (Service → Feature → Scenario → Step)
- 재사용 가능한 컴포넌트 시스템
- 다층 셀렉터 기반 Self-Healing
- 브라우저 + API 테스트 지원

**PRD 위치:** `docs/PRD.md` ← **모든 작업 전에 필수 확인**

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Runtime | Bun |
| Frontend | React, Rsbuild, Zustand, Tailwind, shadcn/ui |
| Backend | Hono, Hono RPC, Zod |
| Database | DuckDB |
| Test Engine | Playwright |
| HTTP Client | Axios |

---

## 프로젝트 구조

```
testforge/
├── packages/
│   ├── core/           # 테스트 실행 엔진, Self-Healing 로직
│   ├── server/         # Hono API 서버
│   └── web/            # React 프론트엔드
├── scripts/            # 개발 스크립트
├── docs/               # 문서 (PRD 등)
└── .claude/
    └── agents/         # 서브 에이전트 정의
```

---

## 개발 워크플로우

**🔴 모든 Phase 작업 전에: PRD 해당 섹션을 먼저 읽으세요!**

### Phase 1: 기반 구축
**PRD 참조:** Section 3 (데이터 모델), Section 4 (API 설계)

1. 모노레포 설정 (Bun workspace)
2. DB 스키마 및 마이그레이션 ← PRD Section 3 참조
3. 기본 CRUD API ← PRD Section 4 참조
4. 프론트엔드 기본 구조 ← PRD Section 6 참조

### Phase 2: 핵심 기능
**PRD 참조:** Section 5 (핵심 기능 상세), Section 3.1 (ElementLocator, HealingRecord)

1. 테스트 실행 엔진 ← PRD Section 5.1 참조
2. 다층 셀렉터 시스템 ← PRD Section 3.1, 5.1 참조
3. Self-Healing 로직 ← PRD Section 5.2 참조

### Phase 3: 컴포넌트 & API 테스트
**PRD 참조:** Section 5.3 (컴포넌트 시스템), 부록 A (스텝 타입)

1. 컴포넌트 시스템 ← PRD Section 5.3 참조
2. API 테스트 스텝 ← PRD 부록 A (api-request, api-assert) 참조

### Phase 4: 안정화
**PRD 참조:** Section 4.2 (실시간 통신), Section 8 (기술적 고려사항)

1. 에러 처리 ← PRD Section 8.5 참조
2. 실시간 상태 (SSE) ← PRD Section 4.2 참조
3. UX 개선 ← PRD Section 6 참조

---

## 최근 완료된 작업

### ✅ Healing Dashboard UI Enhancement (완료)

**완료일:** 2026-02-10
**관련 PRD:** Section 6.2.4 (Self-Healing 대시보드)

#### 작업 내용

Self-Healing 대시보드의 UI를 PRD 스펙에 맞춰 전면 개선했습니다.

**Backend 개선:**
- `GET /api/healing` - status 필터 파라미터 지원
- `POST /api/healing/:id/propagate` - 로케이터 전파 로직 구현
  - 동일한 displayName을 가진 로케이터를 다른 시나리오에서 자동 탐색
  - healed strategy를 최우선(priority: 1)으로 적용
  - 전파된 시나리오 ID 목록 반환

**Frontend 개선:**
1. **Stats Cards**: 통계 카드에 Rejected 카운트 추가, 아이콘 및 컬러 코딩
2. **Filters Section**: Status 필터 드롭다운, 검색 박스 추가
3. **Healing Records List**:
   - 로케이터 표시명, 상태 배지, 트리거 이유 배지
   - 전략 변경 시각화 (original → healed)
   - Confidence 프로그레스 바 (색상 코딩: 90%+ 녹색, 70-89% 노란색, <70% 빨간색)
   - 상대 시간 표시 (date-fns 사용)
   - 확장 가능한 상세 뷰 (Accordion)
4. **Action Buttons**: Approve, Reject, 전체 승인, 전파 버튼
5. **Detail View**: 전체 전략 JSON, 시나리오/실행 링크, 리뷰 정보, 전파 정보

**새로운 shadcn/ui 컴포넌트:**
- `accordion.tsx` - 확장/축소 가능한 상세 뷰
- `dropdown-menu.tsx` - 필터 드롭다운
- `progress.tsx` - Confidence 진행률 표시

**새로운 의존성:**
- `date-fns` ^3.3.0 - 상대 시간 포맷팅
- `@radix-ui/react-accordion` ^1.2.2
- `@radix-ui/react-dropdown-menu` ^2.1.4
- `@radix-ui/react-progress` ^1.1.1

**파일 변경:**
- `packages/server/src/routes/healing.ts` - 필터링, 전파 로직
- `packages/web/src/pages/Healing.tsx` - 전체 UI 재작성
- `packages/web/src/lib/api.ts` - API 함수 업데이트
- `packages/web/package.json` - 의존성 추가
- `packages/web/tailwind.config.js` - 애니메이션 설정
- `packages/web/src/components/ui/` - 새 컴포넌트 추가

**PRD 준수:**
- ✅ PRD Section 6.2.4의 모든 요구사항 충족
- ✅ 와이어프레임 구조 정확히 반영
- ✅ PRD Section 3.1의 HealingRecord 타입 사용
- ✅ PRD Section 4의 API 엔드포인트 스펙 준수

**상세 문서:** `HEALING_DASHBOARD_ENHANCEMENTS.md` 참조

---

## 서브 에이전트 팀

복잡한 작업은 전문 에이전트에게 위임하세요.

### 🔴 에이전트 작업 시작 전 필수 체크리스트

**모든 에이전트는 작업을 시작하기 전에:**

1. ✅ `docs/PRD.md`를 읽는다
2. ✅ 관련 섹션을 정확히 파악한다
3. ✅ 타입 정의를 확인한다
4. ✅ API 스펙을 확인한다 (backend)
5. ✅ UI 설계를 확인한다 (frontend)
6. ✅ 그 다음에 코드를 작성한다

### 사용 가능한 에이전트

| 에이전트 | 역할 | 호출 상황 | PRD 참조 필수 |
|----------|------|----------|---------------|
| `architect` | 시스템 설계, 아키텍처 결정 | 새 기능 설계, 구조 변경 | ✅ 데이터 모델, 시스템 구조 |
| `backend` | API 개발, DB 스키마 | 서버 코드 작성 | ✅ API 스펙, 데이터 모델 |
| `frontend` | React UI 개발 | 컴포넌트, 페이지 작성 | ✅ UI 설계, API 스펙, 타입 |
| `test-engine` | Playwright, Self-Healing | 테스트 실행 로직 | ✅ 스텝 타입, 로케이터 시스템 |
| `reviewer` | 코드 리뷰, 품질 검토 | PR 전 검토 | ✅ 전체 스펙 준수 확인 |
| `debugger` | 버그 분석, 해결 | 에러 발생 시 | ✅ 예상 동작 파악 |
| `docs` | 문서 작성, API 문서화 | 문서 필요 시 | ✅ API 스펙, 타입 정의 |

### 에이전트 호출 방법

**올바른 호출 (PRD 확인 명시):**
```
@architect 새로운 기능 X를 추가하려고 합니다. 먼저 docs/PRD.md를 읽고 구조를 설계해주세요.

@backend scenarios CRUD API를 구현해주세요. PRD Section 4의 API 스펙을 먼저 확인하고 시작하세요.

@frontend 시나리오 에디터 페이지를 만들어주세요. PRD Section 6.2.2와 Section 3의 Scenario 타입을 먼저 읽어주세요.
```

**잘못된 호출 (PRD 확인 없음):**
```
❌ @frontend 시나리오 에디터 만들어줘
❌ @backend API 구현해줘
```

**⚠️ 중요:**
- 서브 에이전트에게 작업을 위임할 때는 **반드시** "PRD를 먼저 읽으세요"를 명시해주세요.
- 가능하면 읽어야 할 PRD의 특정 섹션을 지정해주세요.

---

## 기술적 의사결정 시스템 (투표)

중요한 기술적 결정이 필요할 때, 5명의 전문가 에이전트로부터 의견을 수집하고 투표로 결정합니다.

### 투표가 필요한 상황

- 새로운 라이브러리/프레임워크 도입
- 아키텍처 패턴 선택
- 데이터 모델 설계 변경
- 성능 최적화 전략
- 보안 관련 구현 방식

### 투표 프로세스

**1단계: 투표 요청**
```
[VOTE_REQUEST]
주제: {결정이 필요한 사항}
옵션:
  A. {옵션 A 설명}
  B. {옵션 B 설명}
  C. {옵션 C 설명} (있는 경우)
컨텍스트: {관련 배경 정보}
```

**2단계: 각 전문가에게 의견 요청**

다음 5명의 전문가 관점에서 순차적으로 분석:

1. **@architect** (아키텍처 관점)
   - 시스템 확장성
   - 유지보수성
   - 기존 구조와의 일관성

2. **@backend** (백엔드 관점)
   - 구현 복잡도
   - 성능 영향
   - 데이터 흐름

3. **@frontend** (프론트엔드 관점)
   - 사용자 경험
   - 개발 생산성
   - 번들 크기/성능

4. **@test-engine** (테스트 관점)
   - 테스트 용이성
   - 안정성
   - 디버깅 편의

5. **@reviewer** (품질 관점)
   - 코드 품질
   - 모범 사례
   - 기술 부채

**3단계: 투표 집계 및 결정**
```
[VOTE_RESULT]
주제: {주제}

투표 결과:
  @architect: A (이유: ...)
  @backend: A (이유: ...)
  @frontend: B (이유: ...)
  @test-engine: A (이유: ...)
  @reviewer: A (이유: ...)

최종 결정: A (4/5 투표)
근거 요약: ...

[반대 의견 기록]
@frontend의 B 선호 이유: ...
→ 향후 고려사항으로 기록
```

### 투표 예시

```
[VOTE_REQUEST]
주제: 상태 관리 라이브러리 선택
옵션:
  A. Zustand (경량, 단순)
  B. Jotai (atomic, React 친화적)
  C. TanStack Query만 사용 (서버 상태 중심)
컨텍스트: 
  - 클라이언트 상태는 적음 (UI 상태 정도)
  - 서버 상태가 대부분 (테스트 데이터, 실행 결과)
  - 실시간 업데이트 필요 (SSE)
```

---

## 🎨 Frontend 개발 특별 규칙

**Frontend 에이전트 및 UI 작업 시 절대 규칙:**

### 1. PRD Section 6 (UI 설계) 필독
```bash
# Frontend 작업 전에 항상 먼저 확인
Read docs/PRD.md Section 6 (UI 설계)
```

**PRD Section 6에 포함된 내용:**
- 페이지 구조 및 라우팅
- 각 화면의 와이어프레임 (ASCII art)
- 모달/다이얼로그 구조
- 버튼/액션 위치
- 폼 필드 구성

### 2. 컴포넌트 작성 전 체크리스트

- [ ] PRD Section 6에서 해당 화면 찾기
- [ ] 와이어프레임 확인
- [ ] 필요한 데이터 모델 확인 (PRD Section 3)
- [ ] API 엔드포인트 확인 (PRD Section 4)
- [ ] 그 다음 컴포넌트 작성

### 3. 절대 하지 말 것

❌ PRD를 읽지 않고 "일반적인" UI 구조로 작성
❌ 임의로 필드 추가/제거
❌ 임의로 버튼/액션 추가
❌ PRD와 다른 레이아웃 사용
❌ 임의로 타입 정의 (PRD Section 3 사용!)

### 4. Frontend 작업 예시

**올바른 순서:**
```
1. Read docs/PRD.md Section 6.2.2 (시나리오 에디터)
2. Read docs/PRD.md Section 3.1 (Scenario 타입)
3. Read docs/PRD.md Section 4 (API 엔드포인트)
4. 그 다음 ScenarioEditor.tsx 작성
```

**잘못된 순서:**
```
❌ 1. 바로 ScenarioEditor.tsx 작성
❌ 2. 타입을 임의로 정의
❌ 3. 나중에 PRD 확인
```

---

## 코딩 컨벤션

### TypeScript

```typescript
// 타입 정의는 interface 우선 (확장 가능)
interface Scenario {
  id: string;
  name: string;
  steps: Step[];
}

// 유니온 타입은 type 사용
type StepType = 'click' | 'fill' | 'navigate';

// Zod 스키마로 런타임 검증
const scenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  steps: z.array(stepSchema),
});
```

### 파일 명명

```
컴포넌트: PascalCase.tsx (ScenarioEditor.tsx)
훅: use*.ts (useScenarios.ts)
유틸: camelCase.ts (formatDate.ts)
타입: *.types.ts (scenario.types.ts)
상수: *.constants.ts (steps.constants.ts)
```

### Import 순서

```typescript
// 1. 외부 라이브러리
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. 내부 패키지
import { Scenario } from '@testforge/core';

// 3. 상대 경로 (먼 것 → 가까운 것)
import { Button } from '@/components/ui/button';
import { useScenarios } from '../hooks/useScenarios';
import { formatStep } from './utils';
```

### 에러 처리

```typescript
// 커스텀 에러 클래스 사용
class TestForgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TestForgeError';
  }
}

// API 에러는 일관된 형식
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

---

## Git 컨벤션

### 브랜치

```
main              # 안정 버전
develop           # 개발 통합
feature/*         # 기능 개발
fix/*             # 버그 수정
refactor/*        # 리팩토링
```

### 커밋 메시지

```
feat: 시나리오 CRUD API 구현
fix: Self-Healing 신뢰도 계산 오류 수정
refactor: 로케이터 해석 로직 분리
docs: API 문서 추가
chore: 의존성 업데이트
```

---

## 자주 사용하는 명령어

```bash
# 개발 서버 시작
bun run dev

# 특정 패키지만 실행
bun run dev:server
bun run dev:web

# DB 마이그레이션
bun run db:migrate

# 테스트
bun test

# 린트
bun run lint

# 타입 체크
bun run typecheck
```

---

## 디버깅 팁

### DuckDB 쿼리 확인

```bash
# DuckDB CLI로 직접 쿼리
duckdb testforge.duckdb
> SELECT * FROM scenarios LIMIT 10;
```

### Playwright 디버깅

```typescript
// headed 모드로 실행
const browser = await chromium.launch({ headless: false });

// 스텝별 일시 정지
await page.pause();
```

### API 요청 로깅

```typescript
// Axios 인터셉터로 로깅
axiosClient.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});
```

---

## 체크리스트

### 새 기능 개발 시

**🔴 Step 0: PRD 읽기 (MANDATORY)**
- [ ] **`docs/PRD.md` 전체 읽기** ← 이것부터!
- [ ] 해당 기능의 데이터 모델 확인
- [ ] API 엔드포인트 스펙 확인 (backend 작업 시)
- [ ] UI 화면 설계 확인 (frontend 작업 시)
- [ ] 스텝 타입별 config 구조 확인 (해당되는 경우)

**Step 1: 설계**
- [ ] 필요시 @architect에게 설계 요청
- [ ] PRD 스펙과 일치하는지 확인

**Step 2: 구현**
- [ ] PRD의 타입 정의 그대로 사용
- [ ] Zod 스키마 작성 (타입과 일치)
- [ ] API 구현 (@backend) - PRD의 엔드포인트 스펙 준수
- [ ] UI 구현 (@frontend) - PRD의 화면 설계 준수
- [ ] 테스트 작성

**Step 3: 검토**
- [ ] @reviewer 코드 리뷰
- [ ] PRD 스펙 준수 확인
- [ ] 문서 업데이트 (@docs)

### PR 전 확인

- [ ] `bun run typecheck` 통과
- [ ] `bun run lint` 통과
- [ ] `bun test` 통과
- [ ] 커밋 메시지 컨벤션 준수

---

## 문제 해결

### 일반적인 문제

**Q: 타입 에러가 발생해요**
→ `bun run typecheck`로 전체 확인 후 @debugger 호출

**Q: DB 스키마 변경이 필요해요**
→ 마이그레이션 파일 생성, @backend에게 검토 요청

**Q: 성능이 느려요**
→ @reviewer에게 프로파일링 요청, 필요시 투표로 최적화 전략 결정

**Q: 어떤 방식으로 구현할지 모르겠어요**
→ 투표 시스템 사용하여 5명의 전문가 의견 수집

---

## 자율 개발 프로토콜 (Autonomous Development Protocol)

Claude Code는 이 프로젝트에서 **완전 자율 개발**을 수행한다. 다음 프로토콜을 따른다:

1. **작업 수신** → PRD 또는 사용자 지시를 분석
2. **계획 수립** → `EnterPlanMode`로 구현 전략 수립, 사용자 승인
3. **팀 구성** → 작업 복잡도에 따라 동적으로 팀/서브에이전트 생성
4. **구현** → 코딩, 테스트, 리뷰를 병렬 수행
5. **검증** → `bun test` + `bun run typecheck` + `bun run build`로 통과 확인
6. **커밋** → 변경사항 커밋 (사용자 요청 시)
7. **메모리 갱신** → 학습된 내용을 `.claude/memory/`에 기록

---

## 팀 오케스트레이션 (Team Orchestration)

복잡한 작업 시 다음 패턴으로 팀을 구성한다:

```
Leader (orchestrator)
├── backend       — API/DB 구현 담당
├── frontend      — React UI 구현 담당
├── reviewer      — 코드 리뷰 & 품질 보증
├── test-engine   — 테스트 작성 & 검증
└── architect     — 설계 검토 (필요 시)
```

**팀 생성 기준**:
- 3개 이상 파일 수정이 필요한 작업 → 팀 구성
- 단일 파일 수정 → 직접 수행
- 아키텍처 변경 → architect 포함

**팀 해산**: 작업 완료 후 반드시 `shutdown_request` → `TeamDelete`로 정리

---

## 자동화 세션 실행 (Automated Session Execution)

자동화 세션(cron job 등)에서는 다음 프로토콜을 순서대로 실행한다.

### 컨텍스트 복원

세션 시작 시 다음 파일을 읽어 프로젝트 상태 파악:

1. `.claude/memory/project-context.md` — 현재 phase, 체크리스트, 진행 상황
2. `.claude/memory/architecture.md` — 아키텍처 결정사항
3. `.claude/memory/decisions.md` — 기술 결정 로그
4. `.claude/memory/debugging.md` — 알려진 이슈와 해결법
5. `.claude/memory/patterns.md` — 검증된 코드 패턴

### 8단계 실행 사이클

| Phase | 내용 | 비고 |
|-------|------|------|
| 1. 상태 파악 | `/status` 실행, git log·빌드·테스트 상태 점검 | 체크리스트에서 다음 미완료 항목 식별 |
| 2. 계획 | `EnterPlanMode`로 구현 전략 수립 | 자율 모드에서는 자체 승인 |
| 3. 구현 | 코딩 + 테스트 (복잡도에 따라 팀 구성) | 팀 구성 기준은 위 참조 |
| 4. 검증 | `bun run build` + `bun test` + `bun run typecheck` 통과 필수 | 실패 시 수정 후 재검증 |
| 5. 코드 리뷰 | `/review` — PRD 준수·타입 안전성·테스트 커버리지 확인 | 이슈 발견 시 Phase 4로 회귀 |
| 6. 커밋 & 푸시 | 기능 단위 커밋 후 `git push` 실행 | `git add -A` 금지 |
| 7. 메모리 갱신 | `.claude/memory/` 파일 업데이트 | 별도 커밋: `chore: update session memory` → push |
| 8. 세션 요약 | 구조화된 요약 출력 | 아래 템플릿 참조 |

### 작업 선택 규칙

- 테스트 실패 중이면 새 기능 추가 전에 수정
- 의존성 순서 준수: Core → Server → Web
- 사이클당 하나의 집중 작업만 수행
- 이전 세션의 미완료 작업이 있으면 먼저 완료

### 세션 요약 템플릿

```
## Session Summary
### Completed
- [이번 사이클에서 완료한 내용]
### Files Changed
- [생성/수정된 파일 목록]
### Tests
- [테스트 수, 통과/실패 상태]
### Next Priority
- [다음 사이클에서 작업할 내용]
### Issues / Blockers
- [발생한 문제 또는 미해결 이슈]
```

---

## 슬래시 커맨드 (Available Slash Commands)

| 커맨드 | 파일 | 용도 |
|--------|------|------|
| `/build` | `.claude/commands/build.md` | 프로젝트 빌드 (server/web/all) |
| `/test` | `.claude/commands/test.md` | 테스트 실행 (unit/typecheck/lint) |
| `/review` | `.claude/commands/review.md` | 현재 변경사항 코드 리뷰 |
| `/implement` | `.claude/commands/implement.md` | 기능 구현 워크플로우 |
| `/fix` | `.claude/commands/fix.md` | 버그 수정 워크플로우 |
| `/release` | `.claude/commands/release.md` | 릴리스 준비 워크플로우 |
| `/status` | `.claude/commands/status.md` | 프로젝트 상태 대시보드 |
| `/validate` | `.claude/commands/validate.md` | 프로젝트 건강 상태 검증 |

---

## 메모리 시스템 (Memory System)

### 장기 기억 보존

에이전트와 오케스트레이터는 `.claude/memory/` 디렉토리에 장기 기억을 보존한다.

**메모리 파일 구조:**

```
.claude/memory/
├── README.md             # 메모리 시스템 가이드
├── project-context.md    # 프로젝트 개요, phase, 체크리스트
├── architecture.md       # 아키텍처 결정사항
├── decisions.md          # 주요 기술 결정 로그
├── debugging.md          # 디버깅 인사이트, 해결된 문제
├── patterns.md           # 검증된 코드 패턴 (TypeScript, React, Hono)
└── session-summaries/    # 세션별 요약 (압축된 기억)
```

**메모리 프로토콜:**

1. 세션 시작 시 `.claude/memory/` 파일들을 읽어 컨텍스트 복원
2. 중요한 결정/발견 시 즉시 해당 메모리 파일에 기록
3. 세션 종료 전 `session-summaries/`에 해당 세션의 핵심 내용 요약
4. 메모리 파일이 200줄을 초과하면 핵심만 남기고 압축

**메모리 압축 규칙:**

- 해결된 문제는 1-2줄 요약으로 압축
- 반복 확인된 패턴만 유지, 일회성 발견은 제거
- 최신 정보가 과거 정보보다 우선

---

## Rules for Claude Code

1. **Always read before writing** — 파일 수정 전 반드시 Read로 현재 내용 확인
2. **PRD is source of truth** — 모든 요구사항은 `docs/PRD.md` 참조. PRD 읽지 않고 구현 금지
3. **Test after every change** — 코드 변경 후 `bun test` + `bun run typecheck` 실행
4. **Incremental commits** — 기능 단위로 작은 커밋, `git add -A` 금지
5. **Memory updates** — 중요한 발견/결정은 즉시 `.claude/memory/`에 기록
6. **No over-engineering** — 현재 필요한 것만 구현, scope creep 금지
7. **Team cleanup** — 팀 작업 완료 후 반드시 `shutdown_request` → `TeamDelete`
8. **Error messages matter** — 사용자 경험은 에러 메시지 품질로 결정됨
9. **Stop if stuck** — 동일 에러가 3회 시도 후에도 지속되면 `.claude/memory/debugging.md`에 기록하고 다음 작업으로 이동
10. **Respect dependencies** — Core → Server → Web 순서로 구현
11. **Respect CI** — CI 파이프라인이 존재하면 호환성 유지
12. **Never force push** — 파괴적 git 명령어 금지, `main` 브랜치 직접 수정 금지
