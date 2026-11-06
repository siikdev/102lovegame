# ADR-0002: 실시간 내전 세션 공유 — Supabase 채택

날짜: 2026-11-07 · 상태: 승인 (구현 예정 — feat/live-session)

## 맥락

내전 시 디스코드 화면공유 대신, **세션별 링크**(`#/s/<id>`)로 멤버 전원이 사다리·맵 룰렛·코인토스를 **실시간으로 같이 보는** 기능이 필요. GitHub Pages는 정적 호스팅이라 중계 서버가 없음.

## 결정: Supabase (BaaS) — 자체 백엔드(ADR-0001 Phase 2)보다 먼저

| 근거 | |
|---|---|
| 서버 무운영 | 무료 티어(500MB DB·실시간 포함)로 충분, Pages 배포 그대로 유지 |
| 교체 가능 | `frontend/data/adapters/supabase.js` 로 격리 — 자체 백엔드 전환 시 adapter만 교체 |
| 가용성 | 방장 PC 꺼져도 세션·기록 접근 가능 (자가 호스팅의 약점 회피) |

자체 Node+SQLite+WebSocket 안은 호스팅 셋업 비용과 "방장 PC 의존" 때문에 보류 — ADR-0001 Phase 3 조건 도달 시 재평가.

## 설계 스케치 (상세는 구현 시 확정)

- **테이블**: `sessions(id, created_at, host_token, state jsonb, updated_at)` + `matches(id, session_id, record jsonb, created_at)`
- **실시간**: Supabase Realtime — `sessions.state` 변경을 채널 구독으로 브로드캐스트 (방장이 쓰고, 멤버는 구독)
- **권한**: 방장 = `host_token`(localStorage 보관) 보유자만 쓰기, RLS로 강제. 멤버 = 읽기 전용 뷰 (버튼 숨김)
- **URL**: `#/s/<session_id>` 해시 라우팅 (정적 호스팅 호환). 세션 없이 접속하면 기존 로컬 모드 그대로 (**feature flag: `liveSession`** — 끄면 현행과 100% 동일)
- **키 관리**: `SUPABASE_URL` + `anon key`는 공개 가능(RLS 전제) — `frontend/app/app.config.js` 에 둠

## 구현 단계 (feat/live-session)

1. [사용자] supabase.com 가입 → 새 프로젝트 → URL/anon key 확보 (5분)
2. 테이블·RLS 생성 (SQL 제공 예정) → config에 키 입력
3. `adapters/supabase.js` + `features/live-session/` (세션 생성/참여 UI, 상태 구독·브로드캐스트)
4. 방장/뷰어 모드 분기 → 검증 → 배포
