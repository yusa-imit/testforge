# /release — 릴리스 준비

릴리스를 준비합니다. $ARGUMENTS에 버전 번호를 지정합니다 (예: `0.2.0`).

## 실행 절차

### 1. 릴리스 준비 상태 확인

```bash
# 빌드 확인
bun run build

# 테스트 확인
bun test
bun run typecheck
bun run lint

# 미커밋 변경사항 확인
git status
git diff
```

모든 검사를 통과해야 릴리스 진행 가능.

### 2. 버전 업데이트

`package.json`의 버전을 업데이트:
- 루트 `package.json`
- 필요시 각 패키지의 `package.json`

### 3. 변경 로그 작성

최근 커밋에서 변경 내용 수집:

```bash
git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~20)..HEAD
```

변경 로그 형식:
```markdown
## [버전] - YYYY-MM-DD

### Added
- [새 기능]

### Changed
- [변경사항]

### Fixed
- [버그 수정]
```

### 4. 릴리스 커밋

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v{version}"
```

### 5. PR 생성

```bash
gh pr create --title "chore: release v{version}" --body "..."
```

### 6. 완료 보고

```
## Release Prepared

### Version: v{version}
### Changes
- [변경 요약]
### PR
- [PR URL]
### Next Steps
- PR 리뷰 후 머지
- 태그 생성: git tag v{version}
```
