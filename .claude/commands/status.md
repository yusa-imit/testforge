# /status — 프로젝트 상태 확인

프로젝트의 현재 상태를 종합적으로 보고합니다.

## 실행 절차

### 1. Git 상태

```bash
git status
git log --oneline -10
git branch -a
```

### 2. 빌드 상태

```bash
bun run build
```

### 3. 테스트 상태

```bash
bun test
bun run typecheck
```

### 4. 프로젝트 진행 상태

`.claude/memory/project-context.md` 읽어서 현재 phase와 체크리스트 확인.

### 5. 메모리 요약

`.claude/memory/` 파일들에서 최근 활동 요약:
- `decisions.md` — 최근 결정사항
- `debugging.md` — 미해결 이슈
- `patterns.md` — 검증된 패턴

### 6. 결과 출력

```
## Project Status Dashboard

### Git
- Branch: [현재 브랜치]
- Last commit: [최근 커밋]
- Uncommitted changes: [있음/없음]

### Build
- Status: ✓ Pass / ✗ Fail

### Tests
- Unit: X passed, X failed
- Typecheck: ✓ / ✗
- Lint: ✓ / ✗

### Project Phase
- Current: [현재 phase]
- Progress: [완료율]
- Next task: [다음 작업]

### Recent Decisions
- [최근 결정사항]

### Known Issues
- [미해결 이슈]
```
