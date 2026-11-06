# 아키텍처

> 원칙: **사람이 눈으로 디버깅할 수 있을 것.** 폴더만 보고 기능을 찾고, 이 문서만 보고 데이터·이벤트 흐름을 따라갈 수 있어야 한다.

## 폴더 구조 (FSD — Feature-Sliced Design 스타일)

루트는 최소 폴더, 들어갈수록 세분화. 기능 코드는 `frontend/features/<기능>/` 한 폴더에 JS+CSS 공존(colocation).

```
/
├── frontend/               프론트엔드 전체
│   ├── index.html          마크업 (기능 DOM엔 data-feature 속성)
│   ├── app/                조립 계층 — 여기만 feature 를 안다
│   │   ├── main.js         부트스트랩: 설정 읽기 → 켜진 기능만 init
│   │   ├── app.config.js   ★ 기능 on/off 플래그 · dataSource 선택
│   │   └── steps.js        1→2→3 단계 내비게이션
│   ├── features/           기능 단위 (서로 직접 import 금지)
│   │   ├── teams/          티어 입력 · 팀 랜덤 배정(사다리)
│   │   ├── maps/           맵 룰렛 · 맵 풀
│   │   ├── sides/          공수 코인토스
│   │   ├── summary/        매치 요약 · 스코어 · 저장 · 한판 더
│   │   ├── history/        기록 테이블 · 인라인 수정 · 수동 추가 · 내보내기
│   │   └── keyboard/       Space 단축키
│   ├── shared/             공용 인프라 (feature 를 모름)
│   │   ├── state.js        공유 상태 (JSON 직렬화 가능 유지)
│   │   ├── bus.js          이벤트 버스 — feature 간 유일한 통신로
│   │   ├── storage.js      localStorage 키·래퍼
│   │   ├── session.js      새로고침 복원
│   │   └── dom.js          $ / esc / toast
│   ├── data/               데이터 접근 계층
│   │   ├── index.js        adapter 팩토리 (dataSource 로 선택)
│   │   ├── adapters/       local(현재) · http(백엔드 연동 지점)
│   │   └── maps.json       맵 마스터 데이터
│   └── styles/             전역 CSS (토큰 · 레이아웃 · 컴포넌트)
├── backend/                 백엔드 (계획 — README 에 API 계약)
├── docs/                   이 문서 · ADR(의사결정 기록)
└── legacy/                 초기 단일 HTML (기능 동일 · 참고용)
```

의존 방향(한 방향만): `features → shared/app/data`, `app → 전부`, `shared/data → (feature 모름)`

## 워크플로우 (이벤트 흐름)

```mermaid
flowchart LR
  U[사용자 액션] --> F[feature 모듈]
  F -->|상태 변경| S[shared/state]
  F -->|emit| B[shared/bus]
  B -->|app:refresh| R[각 feature 가 자기 DOM 재렌더]
  B -->|app:sync| Y[각 feature 가 자기 버튼 동기화]
  F -->|저장/조회| A[data/adapter]
  A -->|local| L[(localStorage + maps.json)]
  A -.->|http(추후)| API[(백엔드 API)]
  S --> P[shared/session → 새로고침 복원]
```

버스 이벤트 전체 목록과 의미는 `frontend/shared/bus.js` 상단 주석이 단일 출처(SSOT)다.

## 디버깅 가이드 (어디를 보면 되나)

| 증상 | 보는 곳 |
|---|---|
| 기능이 아예 안 뜸 | `frontend/app/app.config.js` 플래그 → `main.js` 의 FEATURES 배열 |
| 버튼이 안 눌림/비활성 | 해당 feature 의 `sync()` (busy·상태 조건) |
| 렌더가 갱신 안 됨 | 그 feature 가 `on('app:refresh', ...)` 구독하는지 |
| 기록이 이상함 | `frontend/data/adapters/local.js` (+ DevTools localStorage `vb.history.v1`) |
| 새로고침 복원 문제 | `frontend/shared/session.js` (`vb.session.v1`) |
| 단계 이동 문제 | `frontend/app/steps.js` 가드 |

## 데이터 스키마

매치 레코드(schemaVersion 2) — localStorage `vb.history.v1`, JSON 내보내기, 추후 DB 모두 동일:

```json
{
  "id": "m_xxxx", "createdAt": "ISO8601", "manual": true,
  "map": "split", "mapName": "SPLIT",
  "teams": {
    "A": {"name": "박상팀", "side": "DEF", "players": [{"tier": 1, "tierName": "밸런스 1", "name": "박상"}]},
    "B": {"name": "기웅팀", "side": "ATK", "players": []}
  },
  "score": {"A": 13, "B": 6}, "winner": "A",
  "schemaVersion": 2
}
```

필드는 **추가만** 허용. 삭제/의미 변경 시 schemaVersion 올리고 마이그레이션을 adapter 에 둔다.
