# VAL Balance

발로란트 내전용 팀 밸런스 도구 — 티어별 팀 랜덤 배정(사다리), 맵 룰렛, 공수 코인토스, 매치 기록.

## 실행

```bash
python3 -m http.server 8787
```

→ **http://localhost:8787/** (모듈화 버전 `index.html`)

> ⚠️ 파일을 더블클릭(file://)으로 열면 ES 모듈·fetch가 차단됩니다. 반드시 로컬 서버로 여세요.
> `valorant-balance.html` 은 동일 기능의 레거시 단일 파일(서버 없이도 동작)입니다.

## 기능

- **팀 밸런스**: 티어(기본 5개)별 2명 입력 → 각 팀에 티어당 1명 랜덤 배정, 사다리 애니메이션
- **맵 선택**: 맵 풀 체크(전체/현 로테), 룰렛 랜덤 + 리롤, 확정
- **공수 결정**: 코인토스로 1라운드 공격/수비
- **매치 요약**: 스코어 입력(A:B), 결과 클립보드 복사, 기록 저장, 🔁 같은 팀 한판 더
- **매치 기록**: 로컬 저장(최대 200개), 수동 추가(놓친 판 수기 입력), JSON 내보내기, 삭제
- **세션 복원**: 진행 중 매치(팀/맵/공수/입력 중 스코어/단계)가 새로고침에도 유지
- 단축키: `Space` = 현재 단계의 랜덤 액션, `Enter` = 다음 입력칸

## 구조

```
index.html            마크업 (기능별 data-feature 속성)
css/                  base(토큰·리셋) / layout / components + features/<기능>.css
js/
  config/app.config.js  ← 기능 on/off 플래그 · 데이터 소스 선택
  core/                 state · bus(이벤트) · storage · session · dom
  app/steps.js          단계 내비게이션
  data/                 adapter 팩토리 + local(JSON/localStorage) · http(스텁)
  features/             teams · maps · sides · summary · history · keyboard
data/maps.json        맵 데이터 (로테이션 active 플래그 포함)
```

### 기능 켜고 끄기

`js/config/app.config.js` 의 `features` 에서 `true/false` 만 바꾸면 됩니다. 꺼진 기능은 init 되지 않고 DOM도 숨겨집니다.

### 데이터 / 백업

- 기록은 브라우저 localStorage(origin 기준)에 저장 → **JSON 내보내기**로 수시 백업 권장
- 매치 레코드: `{id, createdAt, map, teams:{A,B:{name,side,players[]}}, score, winner, manual?, schemaVersion}`

## 로드맵

- [ ] `adapters/http.js` 구현 → 백엔드 서버/외부 API 연동 (`dataSource: 'http'` 전환만으로 교체)
- [ ] 전적 통계 (플레이어별 승률, 맵별 분포)
- [ ] MCP 연동 (기록 조회/입력 자동화)
