# HANDOFF — 마지막 세션: 2026-11-14

## ✅ 이번에 한 것
- **라이브 방송 시스템 완성** (v0.2.0): Supabase 기반 — 로비(접속 첫 화면, 방송 카드 목록)
  → 방 이름 입력 후 생성 → 송출(상태 debounce push + 기록 diff + 30s 하트비트)
  → 시청(Realtime 구독, 조작 차단, 모바일 생존폴링) → ⏹ 방송 종료
- **공정성** (v0.3.0): crypto 난수 전면 적용, 오늘(06시 경계) 나온 맵 룰렛 자동 제외
- **아카이브/전적** (v0.4.0): 종료=ended_at 보존(경기 0판이면 자동 삭제) ·
  📊 전적 화면(히어로 타일·랭킹·개인별 맵 승률·최근 폼 W/L·세션별 경기) · 로고 클릭=로비
- 배포 개선: frontend/ 를 사이트 루트로 조립(URL에서 /frontend 제거), env.js 분리(gitignore+Actions Secrets)
- 데이터: 11/6 내전 5판 백필(`naejeon1106` 세션), 빈 테스트 세션 정리 완료

## 🔨 진행 중 (멈춘 지점)
없음 — 클린. 모든 브랜치 병합·정리, main=origin, 라이브 정상.

## ⏭️ 다음 할 일 (우선순위)
0. **보안+운영 (2026-11-14 사용자 지시 — 다음 세션 여기부터)**:
   - 🔑 세션 생성 초대 코드 (BACKLOG 승인됨 — RPC 서버측 검증, 반나절)
   - 🛡️ 프로덕션급 데이터 운영: dev/prod Supabase 분리 → 자동 백업 → 마이그레이션 절차 (BACKLOG 상세)
1. **스크린샷 기반 결과 기록** (로드맵 1순위):
   - 매치에 스코어보드 스크린샷 업로드 → K/D/A·선수 추출 → 레코드에 `stats`/`agent` 필드 추가 (schemaVersion 3)
   - 닉네임↔실명 매핑: Claude 메모리에 시드 있음. **멤버는 유동적 — 하드코딩 금지**
   - 집계 확장은 `frontend/features/archive/stats.js` 한 곳만 (byAgent/kda 주석된 확장 지점)
2. 뷰어 수 표시(Realtime presence), 전적 기간 필터 — 여유 있을 때
3. 백엔드(Node+SQLite)는 Supabase 무료 티어 한계 도달 시 (ADR-0001/0002)

## 🧠 결정/주의사항
- 실시간=Supabase(ADR-0002): url/key 는 `frontend/app/env.js`(gitignore) — 로컬에 이미 존재, 배포는 Actions Secrets 주입
- DB 스키마 SSOT = `backend/supabase/schema.sql` (멱등 — 통째로 재실행 안전). 변경 시 사용자가 SQL Editor 에서 실행
- 방송 종료: 기록 있으면 아카이브 / 0판이면 삭제. 세션엔 "세션 시작 이후 저장된 기록"만 push(sessionStartAt)
- localStorage 키 `vb.*.v1`·레코드 스키마 하위 호환 (실데이터!) / 로컬 서버 포트 8787 고정
- 전적 UI 원칙: 미터 단일 색, W/L 색+글자, 금색=1위 전용 (dataviz 규칙 준수)
- 아카이브 세션 `naejeon1106` host_token 은 Claude 메모리에 보관

## ❌ 실패한 접근
- 방송 종료=세션 삭제 방식 → 전적 보존 요구로 ended_at 아카이브로 전환 (18dc116→657b643)
- 세션에 방장 전체 히스토리 push → 세션 전적 오염 → sessionStartAt 필터로 수정

## 🌐 상태
- main `8149ac1` = origin/main, 태그 v0.1.0~v0.4.0, 라이브 200: https://siikdev.github.io/102lovegame/
- 열린 워크트리 없음. Supabase: 세션 1개(naejeon1106, 5판)만 존재
