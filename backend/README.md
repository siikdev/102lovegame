# backend — 계획 (아직 미구현)

> 지금은 프론트엔드가 localStorage(local adapter)로 동작한다. 백엔드를 올리면
> `frontend/app/app.config.js` 에서 `dataSource: 'http'` 로 바꾸고
> `frontend/data/adapters/http.js` 를 아래 계약대로 구현하는 것이 전부다.

## 스택 (ADR-0001 결정)

- Node + 경량 프레임워크(Hono 또는 Express) + **better-sqlite3**
- DB: `backend/data/app.db` (SQLite 파일 — 컨테이너 불필요, 파일 복사 = 백업)
- 스크린샷: `backend/uploads/` 파일 저장, DB엔 경로/메타만

## API 계약 (frontend adapter 인터페이스와 1:1)

| adapter 메서드 | HTTP |
|---|---|
| `getMaps()` | `GET /api/maps` |
| `getHistory()` | `GET /api/matches` |
| `saveMatch(record)` | `POST /api/matches` |
| `updateMatch(id, patch)` | `PATCH /api/matches/:id` |
| `deleteMatch(id)` | `DELETE /api/matches/:id` |
| `clearHistory()` | `DELETE /api/matches` |
| `importMatches(records)` | `POST /api/import` |

### 라이브 세션 (현재 Supabase RPC 로 구현 — 자체 백엔드 전환 시 동일 계약)

현행 구현·상세 스키마는 `backend/supabase/schema.sql` 과 `docs/DATA.md` 참고.

| 기능 | 현행 (Supabase RPC) | 자체 백엔드 시 |
|---|---|---|
| 세션 생성/상태 push | create_session / update_session_state | `POST /api/sessions`, `PATCH /api/sessions/:id/state` |
| 세션 경기 기록 | add/delete_session_match | `PUT/DELETE /api/sessions/:id/matches/:mid` |
| 종료(아카이브)/삭제 | end_session / delete_session | `POST /api/sessions/:id/end`, `DELETE /api/sessions/:id` |
| 실시간 중계 | Supabase Realtime (postgres_changes) | WebSocket/SSE |

추후 기능용 (frontend adapter 에 메서드 추가하며 확장):

| 기능 | HTTP |
|---|---|
| 스크린샷 업로드 → 스탯 추출 | `POST /api/matches/:id/screenshot` (multipart) |
| 유저별 승률/KD (맵·요원별) | `GET /api/stats/players?groupBy=map\|agent` |

## DB 스키마 초안 (통계 요구 반영)

```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
  map TEXT NOT NULL, manual INTEGER DEFAULT 0,
  team_a_name TEXT, team_b_name TEXT,
  side_a TEXT CHECK(side_a IN ('ATK','DEF')),
  score_a INTEGER, score_b INTEGER, winner TEXT,
  screenshot_path TEXT,            -- 추후: 업로드 원본
  raw_json TEXT NOT NULL,          -- 프론트 레코드 원본 (schemaVersion 포함)
  schema_version INTEGER NOT NULL
);

-- 선수별 한 판 성적: 승률/KD를 맵별·요원별로 집계하는 핵심 테이블
CREATE TABLE match_players (
  match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
  player   TEXT NOT NULL,          -- 표준 이름 (닉네임 매핑은 players 테이블)
  team     TEXT CHECK(team IN ('A','B')),
  tier     INTEGER,
  agent    TEXT,                   -- 추후: 요원
  kills INTEGER, deaths INTEGER, assists INTEGER,
  first_kills INTEGER, plants INTEGER, defuses INTEGER
);

CREATE TABLE players (             -- 닉네임 ↔ 실명 매핑 (스크린샷 파싱용)
  name TEXT PRIMARY KEY,
  aliases TEXT                     -- JSON 배열: ["쓰레기판별기", ...]
);
```

승률 예시: `SELECT player, map, AVG(team = winner) ... GROUP BY player, map`

## 마이그레이션 계획

1. 프론트 "JSON 내보내기" 파일을 `POST /api/import` 로 받아 matches/match_players 로 적재
2. 기존 localStorage 기록 손실 없이 이전
