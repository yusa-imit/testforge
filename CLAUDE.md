# TestForge - Claude Code 프로젝트 가이드

## 프로젝트 개요

QA 엔지니어와 기획자를 위한 Self-Healing 자동화 테스트 플랫폼.

**핵심 기능:**
- 계층적 테스트 관리 (Service → Feature → Scenario → Step)
- 재사용 가능한 컴포넌트 시스템
- 다층 셀렉터 기반 Self-Healing
- 브라우저 + API 테스트 지원

**PRD 위치:** `docs/PRD.md`

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

### Phase 1: 기반 구축
1. 모노레포 설정 (Bun workspace)
2. DB 스키마 및 마이그레이션
3. 기본 CRUD API
4. 프론트엔드 기본 구조

### Phase 2: 핵심 기능
1. 테스트 실행 엔진
2. 다층 셀렉터 시스템
3. Self-Healing 로직

### Phase 3: 컴포넌트 & API 테스트
1. 컴포넌트 시스템
2. API 테스트 스텝

### Phase 4: 안정화
1. 에러 처리
2. 실시간 상태 (SSE)
3. UX 개선

---

## 서브 에이전트 팀

복잡한 작업은 전문 에이전트에게 위임하세요.

### 사용 가능한 에이전트

| 에이전트 | 역할 | 호출 상황 |
|----------|------|----------|
| `architect` | 시스템 설계, 아키텍처 결정 | 새 기능 설계, 구조 변경 |
| `backend` | API 개발, DB 스키마 | 서버 코드 작성 |
| `frontend` | React UI 개발 | 컴포넌트, 페이지 작성 |
| `test-engine` | Playwright, Self-Healing | 테스트 실행 로직 |
| `reviewer` | 코드 리뷰, 품질 검토 | PR 전 검토 |
| `debugger` | 버그 분석, 해결 | 에러 발생 시 |
| `docs` | 문서 작성, API 문서화 | 문서 필요 시 |

### 에이전트 호출 방법

```
@architect 새로운 기능 X를 추가하려고 합니다. 구조를 설계해주세요.
@backend scenarios CRUD API를 구현해주세요.
@frontend 시나리오 에디터 페이지를 만들어주세요.
```

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

- [ ] PRD 확인
- [ ] 필요시 @architect에게 설계 요청
- [ ] 타입 정의 먼저
- [ ] Zod 스키마 작성
- [ ] API 구현 (@backend)
- [ ] UI 구현 (@frontend)
- [ ] 테스트 작성
- [ ] @reviewer 코드 리뷰
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
