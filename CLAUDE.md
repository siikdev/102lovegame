# VAL Balance — 발로란트 내전 팀 밸런스 & 기록 도구

티어별 팀 랜덤 배정(사다리) → 맵 룰렛 → 공수 코인토스 → 매치 기록/통계. 빌드 도구 없는 바닐라 ES 모듈.

## 작업 하네스 (사용자가 정한 불변 규칙 — 항상 준수)

1. **사람이 눈으로 디버깅 가능하게**: 폴더만 보고 기능을 찾을 수 있는 배치, 워크플로우(데이터·이벤트 흐름)가 문서로 보여야 함 → `docs/ARCHITECTURE.md` 를 코드 변경 시 함께 갱신.
2. **모든 기능은 켜고 끌 수 있게**: 새 기능 = feature 모듈 + `frontend/app/app.config.js` 플래그. 꺼져도 나머지는 정상 동작.
3. **루트 폴더 최소화, 안으로 들어갈수록 세분화** (FSD/수직 슬라이스): 루트는 `frontend/ backend/ docs/ legacy/` + md 파일만. 새 최상위 폴더 추가는 사용자 승인 필요.
4. 목업 우선 → adapter 교체로 실데이터 연동 (JSON/localStorage → API/DB). 데이터 접근은 반드시 adapter 경유.

## 실행

```bash
python3 -m http.server 8787   # 리포 루트에서
# http://localhost:8787/            → frontend 로 리다이렉트
# http://localhost:8787/legacy/valorant-balance.html  → 단일파일 원본
```

file:// 로 열면 ES 모듈·fetch 차단 → 반드시 로컬 서버.

## 구조 (상세: docs/ARCHITECTURE.md)

```
frontend/
  app/        부트스트랩·app.config.js(플래그·dataSource)·env.js(비밀값, gitignore)·단계 내비
  features/   기능별 폴더(js+css 공존): teams maps sides summary history keyboard live-session archive
  shared/     state·bus(이벤트 버스)·storage·session·dom — feature 를 모름
  data/       adapter 팩토리 + adapters/(local=현행, http=백엔드 연동 지점) + maps.json
  styles/     전역 토큰·레이아웃·컴포넌트
backend/      README.md(API 계약·SQLite 스키마) + supabase/schema.sql (라이브 세션, ADR-0002)
docs/         ARCHITECTURE.md · adr/
.github/      Pages 배포(Secrets→env.js 주입)·keep-alive — 플랫폼 고정 경로(루트 최소화 예외)
```

비밀값 규칙: Supabase 키 등은 `frontend/app/env.js` (gitignore) 에만. 리포·커밋에 절대 넣지 않는다. 배포는 Actions Secrets 가 주입.

## 코드 규칙

- feature 간 직접 import 금지 — 통신은 `shared/bus.js` 이벤트만 (목록은 bus.js 주석이 SSOT)
- 데이터 읽기/쓰기는 `adapter.*` 만 (`getMaps/getHistory/saveMatch/updateMatch/deleteMatch/clearHistory`); localStorage 직접 접근은 UI 설정(플레이어 입력·팀명·맵 풀)만 허용
- localStorage 키(`vb.*.v1`)와 레코드 스키마(schemaVersion)는 하위 호환 — 필드는 추가만, 변경 시 버전 올리고 마이그레이션. **사용자 실데이터가 들어있음**
- 색·간격은 `frontend/styles/base.css` 토큰만 사용
- 새 기능 추가 절차: `/new-feature` 스킬

## Git 관리 (상세: docs/GIT_WORKFLOW.md)

- **기능별 세션 = 워크트리(`.claude/worktrees/<이름>`) = `feat/<기능>` 브랜치** (main 에서 분기)
- 이력은 선형: rebase 후 `--ff-only` 병합만. merge commit·force-push 금지
- 병합·rebase·태그는 브랜치 관리 세션/사용자만. 기능 세션은 자기 워크트리만 수정
- 버전: `v0.MINOR.PATCH` 태그 (기능=MINOR, 수정=PATCH)

## 로드맵 (사용자 확정)

1. 스크린샷 기반 결과 기록 (업로드 → 스탯 추출 → match_players)
2. 유저별 승률/KD 관리 — 맵별·요원별 집계 (backend/README.md 스키마 참고)
3. 백엔드: Node + SQLite (Phase 2), 외부 배포 시에만 Postgres+Docker (Phase 3, ADR-0001)

## 검증 체크리스트

사다리 → 맵 룰렛/확정 → 코인 → 스코어 입력 → 저장 → 기록 표(일시/맵/스코어 인라인 수정, 수동 추가, 내보내기) → 같은 팀 한판 더 → 새 매치 → **새로고침 복원** → Space 단축키 → 640px. 플래그 하나 꺼보고 나머지 정상 확인. JS 변경 시 `node --check` (`.mjs` 복사 후).
