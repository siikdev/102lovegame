/* 전적 집계 (순수 함수 — DOM 없음) — 확장 지점은 이 파일 하나.
   레코드에 필드가 추가되면 여기서만 집계를 늘린다:
   - byAgent:  record.teams[side].players[].agent 가 생기면 byMap 과 동일 패턴으로
   - kda:      players[].kills/deaths/assists 가 생기면 player.kda 누적
   멤버는 유동적 — 이름은 기록에서 동적으로 수집한다 (하드코딩 금지). */

export const MIN_GAMES_FOR_RANK = 3; // 👑 승률 1위 자격 최소 경기 수

/* matches: [{session_id, record}], sessions: [{id, created_at, ended_at, state}] */
export function buildStats(matches, sessions) {
  const sessionById = new Map(sessions.map(s => [s.id, s]));
  const players = new Map(); // name -> stat

  const getP = name => {
    if (!players.has(name)) {
      players.set(name, {
        name, games: 0, w: 0, l: 0, d: 0,
        byMap: new Map(),   // mapId -> {g,w,l,d}
        matches: [],        // {record, side, result:'W'|'L'|'D'|null, session}
      });
    }
    return players.get(name);
  };

  // 최신순 정렬된 레코드 기준으로 순회
  const sorted = [...matches].sort((a, b) =>
    String(b.record?.createdAt).localeCompare(String(a.record?.createdAt)));

  for (const { session_id, record: r } of sorted) {
    if (!r?.teams) continue;
    const session = sessionById.get(session_id) || null;
    for (const side of ['A', 'B']) {
      for (const p of r.teams[side]?.players || []) {
        const name = p?.name;
        if (!name || name === '-') continue;
        const st = getP(name);
        const result = r.winner === side ? 'W' : r.winner === 'draw' ? 'D' : r.winner ? 'L' : null;
        st.games++;
        if (result === 'W') st.w++;
        else if (result === 'L') st.l++;
        else if (result === 'D') st.d++;
        // 맵별
        if (r.map) {
          if (!st.byMap.has(r.map)) st.byMap.set(r.map, { g: 0, w: 0, l: 0, d: 0 });
          const m = st.byMap.get(r.map);
          m.g++;
          if (result === 'W') m.w++; else if (result === 'L') m.l++; else if (result === 'D') m.d++;
        }
        st.matches.push({ record: r, side, result, session });
      }
    }
  }
  return players;
}

export const winRate = s => (s.w + s.l) ? s.w / (s.w + s.l) : null; // 무승부 제외
export const pct = v => v === null ? null : Math.round(v * 100);

/* 랭킹: 승률 내림차순(동률이면 다승), MIN_GAMES 미만은 뒤로 */
export function ranking(players) {
  return [...players.values()].sort((a, b) => {
    const qa = a.games >= MIN_GAMES_FOR_RANK, qb = b.games >= MIN_GAMES_FOR_RANK;
    if (qa !== qb) return qa ? -1 : 1;
    return (winRate(b) ?? -1) - (winRate(a) ?? -1) || b.w - a.w || b.games - a.games;
  });
}

/* 최근 N경기 폼 (최신이 앞) */
export const recentForm = (s, n = 5) =>
  s.matches.slice(0, n).map(m => m.result).filter(Boolean);
