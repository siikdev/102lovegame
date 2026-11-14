---
name: review-arch
description: 코드 구조 감사 — 모듈화(FSD)·feature flag·bus 통신·adapter 경유·백엔드 전환 용이성을 점검한다. 단독 실행 가능하며 /end-day 가 자동 호출한다.
---

# /review-arch — 코드 구조 감사

목표: 하네스 4규칙과 백엔드 전환 용이성이 **지금도** 지켜지는지 기계적으로 확인하고, 위반은 즉시 수정하거나 BACKLOG 에 올린다.

## 점검 항목 (grep/명령 수준)

1. **feature 간 직접 import 금지**:
   `grep -rn "from '\.\./\(teams\|maps\|sides\|summary\|history\|live-session\|archive\|keyboard\)/" frontend/features/` → 0건이어야 함 (자기 폴더 제외)
2. **flag 등록**: `frontend/features/` 폴더 목록 vs `app.config.js` features 키 vs `main.js` FEATURES 배열 — 셋이 일치해야 함
3. **bus 이벤트 SSOT**: 코드의 `emit('x')` 목록 vs `shared/bus.js` 주석 — 누락 이벤트는 주석에 추가
4. **데이터 접근 규율**: `grep -rn "localStorage" frontend/ | grep -v shared/storage.js` → shared/storage 경유 외 직접 접근 0건.
   Supabase 호출은 `data/supabase.js` 제공자 경유만 (`grep -rn "createClient" frontend/ | grep -v data/supabase.js` → 0건)
5. **백엔드 전환 용이성**: 레코드 쓰기/읽기가 adapter(`data/adapters/*`) 또는 RPC(`backend/supabase/schema.sql` 정의) 경유인지. 새 서버 데이터가 생겼다면 http.js 스텁·backend/README 계약 표에 시그니처가 있는지
6. **비대 파일 경고**: `wc -l frontend/features/*/*.js` 에서 **300줄 초과** → 하위 모듈 분할 후보로 BACKLOG 등록
7. **하드코딩 검사**: 멤버 이름·세션 id 등 데이터성 값이 코드에 박혀있지 않은지 (`grep -rn "박상\|기웅" frontend/` 류 — 멤버는 유동적)

## 출력

- 위반 0건이면 "구조 감사 통과" 한 줄
- 위반 발견 시: 경미(주석·문서 누락)는 즉시 수정, 구조적(파일 분할 등)은 `docs/BACKLOG.md` 에 항목 추가
- 발견사항 요약을 /end-day 의 HANDOFF '결정/주의사항' 에 반영
