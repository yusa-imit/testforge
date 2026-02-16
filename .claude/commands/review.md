# /review — 코드 리뷰

현재 변경사항에 대한 코드 리뷰를 수행합니다.

## 실행 절차

### 1. 변경사항 파악

```bash
git diff --stat
git diff
git log --oneline -5
```

### 2. 리뷰 체크리스트

변경된 각 파일에 대해 다음을 검사:

**TypeScript / 코드 품질:**
- [ ] 타입 안전성 (any 사용 금지, 적절한 타입 정의)
- [ ] 에러 처리 (try-catch, 적절한 에러 응답)
- [ ] 코딩 컨벤션 준수 (네이밍, import 순서)
- [ ] 불필요한 코드 없음 (console.log, 미사용 import)

**React / Frontend:**
- [ ] 컴포넌트 구조 (적절한 분리, 재사용성)
- [ ] 훅 사용 규칙 (의존성 배열 정확성)
- [ ] 상태 관리 적절성
- [ ] 접근성 (aria 속성, 키보드 내비게이션)

**Hono / Backend:**
- [ ] API 스펙 준수 (PRD Section 4)
- [ ] Zod 스키마 검증
- [ ] 에러 응답 일관성
- [ ] SQL 인젝션 방지

**보안:**
- [ ] XSS 취약점 없음
- [ ] 민감 정보 노출 없음
- [ ] 입력 검증 충분

**PRD 준수:**
- [ ] 데이터 모델 일치 (PRD Section 3)
- [ ] API 스펙 일치 (PRD Section 4)
- [ ] UI 설계 일치 (PRD Section 6)

### 3. 리뷰 결과 출력

```
## Code Review Results

### Summary
- Files reviewed: X
- Issues found: X (critical: X, warning: X, suggestion: X)

### Issues

#### Critical
- [파일:라인] 설명

#### Warnings
- [파일:라인] 설명

#### Suggestions
- [파일:라인] 설명

### Verdict
✓ APPROVED / ⚠️ CHANGES REQUESTED / ✗ BLOCKED
```

### 4. reviewer 에이전트 활용

복잡한 변경사항은 `reviewer` 에이전트에게 상세 리뷰를 위임한다.
