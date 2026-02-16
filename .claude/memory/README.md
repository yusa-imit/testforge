# TestForge Memory System

이 디렉토리는 Claude Code 에이전트의 장기 기억을 보존합니다.

## 파일 구조

| 파일 | 용도 |
|------|------|
| `project-context.md` | 프로젝트 개요, 현재 phase, 체크리스트, 진행 상황 |
| `architecture.md` | 아키텍처 결정사항, 모듈 의존성 |
| `decisions.md` | 주요 기술 결정 로그 |
| `debugging.md` | 디버깅 인사이트, 해결된/미해결 문제 |
| `patterns.md` | 검증된 코드 패턴 (TypeScript, React, Hono) |
| `session-summaries/` | 세션별 요약 (압축된 기억) |

## 프로토콜

### 세션 시작

모든 메모리 파일을 읽어 컨텍스트 복원:

```
1. project-context.md — 현재 상태 파악
2. architecture.md — 아키텍처 이해
3. decisions.md — 최근 결정사항 확인
4. debugging.md — 알려진 이슈 확인
5. patterns.md — 검증된 패턴 참조
```

### 세션 중

- 중요한 결정/발견 시 즉시 해당 파일에 기록
- 버그 해결 시 `debugging.md` 업데이트
- 새 패턴 발견 시 `patterns.md` 업데이트

### 세션 종료

`session-summaries/YYYY-MM-DD-[topic].md`에 핵심 내용 요약.

## 압축 규칙

- 각 파일 200줄 초과 시 핵심만 남기고 압축
- 해결된 문제는 1-2줄 요약으로 축소
- 반복 확인된 패턴만 유지, 일회성 발견은 제거
- 최신 정보가 과거 정보보다 우선
