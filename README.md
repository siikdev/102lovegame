# VAL Balance

발로란트 내전 도구 — 티어별 팀 랜덤 배정(사다리), 맵 룰렛, 공수 코인토스, 매치 기록/수정/통계(예정).

**🌐 라이브: https://siikdev.github.io/102lovegame/** (GitHub Pages — main 에 push 하면 1~2분 내 자동 재배포)

## 실행 (로컬 개발)

```bash
python3 -m http.server 8787
```

→ **http://localhost:8787/** (frontend 로 자동 이동)

> ⚠️ file:// 로 열면 ES 모듈·fetch가 차단됩니다. 반드시 로컬 서버로.
> `legacy/valorant-balance.html` 은 동일 기능의 단일 파일 원본(서버 없이 동작).

## 기능

- **팀 밸런스**: 티어별 2명 입력 → 팀당 티어 1명 랜덤 배정 (사다리 애니메이션)
- **맵 선택**: 맵 풀 관리(전체/현 로테), 룰렛 + 리롤, 확정
- **공수 결정**: 코인토스
- **매치 요약**: 스코어 입력, 복사, 저장, 🔁 같은 팀 한판 더
- **매치 기록**: 일시/맵/스코어 **클릭 인라인 수정**(일시 변경 시 자동 재정렬), ✍️ 수동 추가, 📥 JSON 가져오기(병합·중복 자동 건너뜀), JSON 내보내기
- **세션 복원**: 진행 중 매치가 새로고침에도 유지
- **🔴 라이브 세션**: 방장이 "라이브" 버튼 → 링크(`#/s/<id>`) 공유 **또는** 사이트 접속 시 뜨는 **진행 중 라이브 목록에서 클릭 입장** → 사다리·룰렛·코인·기록 **실시간 시청** (Supabase Realtime, 뷰어는 조작 불가, 내 세션이면 송출 재개)
- 단축키: `Space` 현재 단계 랜덤 액션

## 데이터 (중요)

- 기록은 **브라우저 localStorage** 에 저장 — **주소(origin)·기기별로 따로** 쌓입니다 (localhost 기록 ≠ Pages 기록)
- 옮기기/백업: **JSON 내보내기** → 다른 기기·주소에서 **📥 가져오기** (id 기준 병합이라 여러 번 해도 안전)
- 모두가 보는 공유 기록은 백엔드 단계(로드맵)에서 지원 예정

## 구조 (루트 최소화 · 들어갈수록 상세 — FSD)

```
frontend/   앱 (app/ features/ shared/ data/ styles/) — 기능별 폴더에 js+css 공존
backend/    백엔드 계획(API 계약·SQLite 스키마) + supabase/schema.sql (라이브 세션 DB)
docs/       ARCHITECTURE.md(워크플로우·디버깅 가이드) · GIT_WORKFLOW.md · adr/(의사결정)
legacy/     초기 단일 HTML
.github/    Pages 배포(Secrets→env 주입) · Supabase keep-alive 워크플로우
```

- **기능 켜고 끄기**: `frontend/app/app.config.js` 의 `features` 에서 true/false
- **데이터 소스 교체**: 같은 파일 `dataSource: 'local' | 'http'` — 백엔드 붙일 때 adapter만 구현
- **비밀값**: `frontend/app/env.js` (gitignore — `env.example.js` 복사해 생성). 배포는 Actions Secrets(`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`)가 자동 주입
- 기여 방식: 기능별 `feat/<이름>` 브랜치 + 워크트리, rebase 후 ff-only 병합 (docs/GIT_WORKFLOW.md)

## 로드맵

- [ ] 스크린샷 기반 결과 기록 (스탯 자동 추출)
- [ ] 유저별 승률/KD — 맵별·요원별 통계
- [ ] backend: Node + SQLite (ADR-0001 — 지금 규모엔 Docker 불필요, 조건 충족 시 Postgres 전환)
- [x] GitHub Pages 배포 · JSON 가져오기/내보내기
