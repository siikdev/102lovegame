---
name: review-docs
description: 문서 신선도 감사 — ARCHITECTURE/README/CLAUDE/backend 계약이 실제 코드와 일치하는지 대조하고 불일치는 즉시 수정한다. 단독 실행 가능하며 /end-day 가 자동 호출한다.
---

# /review-docs — 문서 신선도 감사

목표: "폴더만 보고 찾고, 문서만 보고 흐름을 안다"(하네스 룰 1)가 오늘 변경 후에도 참이 되게 한다. **불일치는 발견 즉시 수정 커밋** — 미루면 썩는다.

## 대조 항목

1. **docs/ARCHITECTURE.md 폴더 트리** vs `find frontend -maxdepth 2 -type d` 실제 — 폴더 추가/이동 반영됐는지
2. **README.md 기능 목록** vs `frontend/features/` + 최근 커밋(`git log --oneline -15`) — 새 기능이 소개됐는지, 라이브 URL·실행법 유효한지
3. **CLAUDE.md 구조/규칙 섹션** vs 현재 구조 — 다음 Claude 세션이 처음 읽는 문서이므로 최우선
4. **backend/README.md API 계약 표** vs ① `frontend/data/adapters/local.js` 메서드 목록 ② `backend/supabase/schema.sql` 의 RPC 목록 — 표에 없는 메서드/RPC 는 추가
5. **docs/adr/** — 오늘 뒤집힌 결정이 있으면 해당 ADR 상태 갱신 또는 새 ADR
6. **스킬 문서** (`.claude/skills/*/SKILL.md`) — 절차가 실제 워크플로우와 어긋나면 갱신

## 출력

- 수정한 파일 목록 한 줄씩. 전부 일치하면 "문서 감사 통과"
- 큰 재작성이 필요한 문서는 BACKLOG 에 등록하고 HANDOFF 에 명시
