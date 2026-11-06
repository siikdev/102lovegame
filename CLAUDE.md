# VAL Balance — 발로란트 내전 팀 밸런스 도구

티어별 팀 랜덤 배정(사다리) → 맵 룰렛 → 공수 코인토스 → 매치 기록. 빌드 도구 없는 바닐라 ES 모듈 목업.

## 실행

```bash
python3 -m http.server 8787
# http://localhost:8787/          ← 모듈화 버전 (index.html)
# http://localhost:8787/valorant-balance.html ← 레거시 단일 파일 (동작 동일, 참고용)
```

file:// 로 열면 ES 모듈과 fetch가 막혀서 **반드시 로컬 서버로** 연다.

## 아키텍처 규칙 (중요)

1. **기능은 전부 feature 모듈** (`js/features/*.js`): `export const id`, `export function init()`.
   `js/config/app.config.js` 의 `features` 플래그로 on/off — **새 기능은 반드시 플래그를 추가**하고, 꺼졌을 때 나머지가 정상 동작해야 한다. HTML 쪽 전용 DOM에는 `data-feature="<id>"` 를 달아 꺼지면 자동 숨김.
2. **feature 간 직접 import 금지** — 통신은 `js/core/bus.js` 이벤트로 (이벤트 목록은 bus.js 주석). feature → core/app 방향 import만 허용 (순환 의존 방지).
3. **데이터 접근은 adapter 경유** (`js/data/`): 맵/기록 읽기·쓰기는 `adapter.getMaps()/getHistory()/saveMatch()/deleteMatch()/clearHistory()` 만 사용. localStorage 직접 접근은 UI 설정(플레이어 입력, 팀명, 맵 풀)만 허용. 백엔드/외부 API/MCP 연동 시 `adapters/http.js` 를 구현하고 `dataSource` 만 바꾼다.
4. **localStorage 키(`vb.*.v1`)와 매치 레코드 스키마(schemaVersion)는 하위 호환 유지** — 필드는 추가만, 삭제/의미 변경 시 schemaVersion 올리고 마이그레이션 추가. 사용자 실데이터(내전 기록)가 들어있다.
5. CSS는 토큰(`css/base.css` 의 `:root`) 기반. feature 전용 스타일은 `css/features/<id>.css` 로 분리하고 index.html 에 링크.
6. 새 기능 추가 절차는 `/new-feature` 스킬(.claude/skills/new-feature) 참고.

## 검증 체크리스트

사다리 돌리기/다시 섞기 → 맵 룰렛/확정 → 코인 플립 → 스코어 입력 → 저장 → 히스토리 표시/삭제/수동 추가/JSON 내보내기 → 새 매치/같은 팀 한판 더 → **새로고침해도 진행 중 매치 유지** → Space 단축키 → 640px 모바일 레이아웃. 기능 플래그 하나 꺼보고 나머지 정상 동작 확인.
