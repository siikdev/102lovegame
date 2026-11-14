---
name: review-data
description: 데이터 구조 문서(docs/DATA.md) 갱신 — Supabase 테이블/RPC/정책, localStorage 키, 레코드 스키마를 누구든(바이브 코딩 포함) 한눈에 알 수 있게 유지한다. 단독 실행 가능하며 /end-day 가 자동 호출한다.
---

# /review-data — 데이터 구조 문서 갱신

목표: `docs/DATA.md` 하나만 보면 "지금 무엇이 어디에 어떤 모양으로 기록되는지" 전부 알 수 있게. 스키마가 안 변했으면 날짜만 확인하고 통과.

## 절차

1. **실스키마 확인** (문서 아님, 실물 기준):
   - `backend/supabase/schema.sql` (SSOT) 읽기
   - 실제 반영 여부 의심되면 REST 로 1행 조회: `curl "$SUPABASE_URL/rest/v1/<table>?select=*&limit=1" -H "apikey: ..."` (키는 frontend/app/env.js)
   - localStorage 키: `frontend/shared/storage.js` 의 LS 객체
   - 레코드 스키마: `frontend/features/summary/summary.js` matchRecord() + schemaVersion 변천
2. **docs/DATA.md 갱신** — 구성 (이 순서 유지):
   - 한눈 다이어그램 (브라우저 localStorage ↔ Supabase 흐름, mermaid)
   - Supabase: 테이블별 컬럼 표 · RPC 표(누가 호출, 권한) · RLS 요약 · Realtime 발행 대상
   - localStorage: 키별 내용·소유 모듈
   - 매치 레코드 스키마 버전 표 (v1→현재, 각 버전에서 추가된 필드)
   - 용량/한도 현황 (무료 티어 대비)
3. 스키마 변경이 있었는데 `backend/supabase/schema.sql` 에 반영 안 된 SQL 이 있으면 **즉시 반영** (사용자 수동 실행분 포함 — 멱등 유지)

## 출력

- DATA.md 갱신 여부 + 스키마 변경 요약 한 줄. HANDOFF 의 '결정/주의사항' 에 스키마 변경 명시
