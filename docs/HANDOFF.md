# HANDOFF — 마지막 세션: 2026-11-07

## ✅ 이번에 한 것
- 목업 → FSD 구조 전환 완료 (frontend/backend/docs/legacy), v0.1.0 태그
- 기능: 스코어/맵/일시 인라인 수정, 수동 추가, 📥 JSON 가져오기, 세션 복원, 같은 팀 한판 더
- GitHub 연동(siikdev/102lovegame) + **Pages 배포**: https://siikdev.github.io/102lovegame/
- Git 워크플로우 확정(docs/GIT_WORKFLOW.md), /start-day·/end-day 스킬 생성
- 어제 내전 4판 기록은 사용자 브라우저 localStorage(localhost:8787)에 있음 → Pages로는 내보내기→가져오기로 이전

## 🔨 진행 중 (멈춘 지점)
없음 — 클린. 모든 브랜치 병합·정리됨.

## ⏭️ 다음 할 일 (우선순위)
1. **feat/live-session 시작** (ADR-0002 승인됨 — Supabase 채택):
   1. [사용자 액션] supabase.com 가입 → 새 프로젝트 생성 → Project URL + anon key 받아오기
   2. sessions/matches 테이블 + RLS 생성 (SQL은 작업 시 Claude가 제공)
   3. `frontend/data/adapters/supabase.js` + `frontend/features/live-session/` 구현
   4. `#/s/<id>` 해시 라우팅, 방장(host_token)/뷰어 분기, `liveSession` feature flag
2. (후순위) 스크린샷 기반 기록, 유저별 승률/KD — backend/README.md 스키마 참고

## 🧠 결정/주의사항
- 실시간 세션 = **Supabase** (ADR-0002, 자체 서버는 보류 이유 포함) / DB = ADR-0001 (컨테이너 불필요)
- localStorage 키 `vb.*.v1`·레코드 스키마(v2)는 하위 호환 유지 — 사용자 실데이터 있음
- 로컬 서버는 **반드시 포트 8787** (origin 바뀌면 기록 안 보임)
- 하네스 4규칙은 CLAUDE.md, git 규칙은 docs/GIT_WORKFLOW.md

## 🌐 상태
- main = origin/main, 라이브 정상. 열린 워크트리 없음 (이 커밋 기준)
- 멤버 닉네임↔실명 매핑은 Claude 메모리에 보관됨 (스크린샷 파싱 기능용)
