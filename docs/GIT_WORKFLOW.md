# Git 워크플로우

> 모델: **기능별 Claude Code 세션 = 워크트리 1개 = 피처 브랜치 1개**, 별도의 **브랜치 관리 세션**이 rebase·병합·버전을 담당한다. 이력은 항상 **선형**(merge commit 금지).

## 브랜치 모델

```
main                안정 브랜치 — 항상 동작하는 상태만. 직접 커밋 금지
feat/<기능>         새 기능   (예: feat/stats, feat/screenshot)
fix/<버그>          버그 수정
docs/<주제> chore/  문서·잡일
```

- 브랜치는 **항상 최신 main 에서** 분기
- 커밋 컨벤션: Conventional Commits (`feat:` `fix:` `refactor:` `docs:` `chore:`) — 한국어 본문 OK

## 기능 세션 (병렬 작업)

```bash
# 세션 시작: 워크트리 + 브랜치 생성 (Claude 에게 "워크트리에서 feat/stats 작업해줘")
git worktree add .claude/worktrees/stats -b feat/stats main

# 작업 → 작은 단위로 커밋 (검증: node --check, 로컬 서버 확인)
# 세션 종료 전 반드시 커밋 (워크트리는 삭제될 수 있음)
```

- 워크트리 위치는 `.claude/worktrees/<이름>` 통일 (.gitignore 처리됨)
- 세션 간 파일 충돌 최소화는 FSD 구조가 보장 — **공유 접점은 3곳뿐**:
  `frontend/app/app.config.js`(플래그 추가) · `frontend/app/main.js`(FEATURES 배열) · `frontend/index.html`(DOM/링크)
  → rebase 충돌은 대부분 여기서 나고, 해결은 "두 기능 다 남기기"

## 브랜치 관리 세션 (통합·버전)

메인 체크아웃(`~/102_naejeon`)에서:

```bash
git fetch . # (로컬만이면 생략)
# 1) 피처를 최신 main 위로 rebase (선형 유지)
git -C .claude/worktrees/stats rebase main
# 2) 검증 후 fast-forward 병합만 허용
git merge --ff-only feat/stats
# 3) 끝난 브랜치·워크트리 정리
git worktree remove .claude/worktrees/stats
git branch -d feat/stats
```

- `--ff-only` 가 실패하면 = rebase 가 안 된 것 → 병합하지 말고 rebase 부터
- force-push 금지 (원격 생기면 피처 브랜치만 `--force-with-lease` 허용, main 절대 금지)

## 버전 관리

- 의미 있는 묶음이 main 에 합쳐지면 태그: `git tag -a v0.2.0 -m "요약"`
- 규칙: v0.MINOR.PATCH — MINOR=기능 추가, PATCH=수정. v1.0.0 은 백엔드+통계 가동 시점
- 릴리스 내용은 태그 메시지에 요약 (별도 CHANGELOG 없이 `git tag -n9` 로 열람)

## Claude 세션 규칙

- 기능 세션: 자기 워크트리 밖(다른 워크트리·메인 체크아웃)의 파일을 건드리지 않는다
- 병합·rebase·태그·브랜치 삭제는 **브랜치 관리 세션(또는 사용자)** 만 수행
- 병합 전 체크: CLAUDE.md 검증 체크리스트 + 플래그 on/off 확인
