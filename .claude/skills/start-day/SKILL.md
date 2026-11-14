---
name: start-day
description: 작업 세션 시작 브리핑 — 지난 작업·현재 상태·오늘 할 일을 정리해 보고하고 작업 환경을 준비한다. 사용자가 /start-day 를 치거나 "오늘 작업 시작하자", "이어서 하자"라고 하면 실행.
---

# /start-day — 세션 시작 브리핑

목표: 사용자가 **언제 어디서든** 마지막 기획 그대로 이어서 작업할 수 있게, 상태를 복원해 브리핑한다.

## 절차

1. **핸드오프 읽기**: `docs/HANDOFF.md` (마지막 세션이 남긴 상태) + `docs/BACKLOG.md` 상위 항목. 없거나 오래됐으면 git log 로 재구성.
2. **리포 상태 수집** (병렬로):
   - `git fetch origin -q && git status -sb` — 로컬/원격 동기화·미커밋 확인
   - `git branch -a && git worktree list` — 진행 중인 피처 브랜치/워크트리
   - `git log --oneline -5` + `git tag | tail -3`
   - 라이브 확인: `curl -s -o /dev/null -w "%{http_code}" https://siikdev.github.io/102lovegame/`
3. **브리핑 출력** (이 형식 고정):
   ```
   ## 📋 데일리 브리핑 (YYYY-MM-DD)
   ### 지난 세션: <HANDOFF 요약 2-3줄>
   ### 현재 상태: 브랜치/워크트리/미커밋/배포(라이브 200?) 한 줄씩
   ### 예정 작업: <HANDOFF '다음 할 일' 우선순위대로>
   ### ⚠️ 주의/결정사항: <HANDOFF에서 승계>
   ### 오늘 첫 작업 제안: <구체적 1개 + 시작 명령>
   ```
4. **환경 준비**:
   - 로컬 서버 안 떠 있으면 리포 루트에서 `python3 -m http.server 8787` 백그라운드 실행
   - 진행 중 피처가 있으면 해당 워크트리로, 새 기능이면 `git worktree add .claude/worktrees/<이름> -b feat/<이름> main`
5. 사용자가 방향을 고르면 바로 작업 시작. HANDOFF 와 실제 git 상태가 다르면(예: 수동 커밋) **git 을 진실로** 보고 차이를 브리핑에 명시.

## 규칙

- 브리핑은 간결하게 — 파일 덤프 금지, 결론만
- CLAUDE.md 하네스 4규칙과 docs/GIT_WORKFLOW.md 를 전제로 움직인다
