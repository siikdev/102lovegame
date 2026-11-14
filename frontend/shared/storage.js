/* localStorage 래퍼 — 키는 전부 여기서만 관리 (단일 파일 시절 키 그대로 유지해 기록 호환) */
export const LS = {
  players:   'vb.players.v1',
  tierNames: 'vb.tierNames.v1',
  teamNames: 'vb.teamNames.v1',
  pool:      'vb.pool.v1',
  history:   'vb.history.v1',
  session:   'vb.session.v1',
  liveHost:  'vb.liveHost.v1', // {세션id: host_token} — 라이브 세션 방장 증명
};

export const load = (k, d) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }
  catch { return d; }
};

export const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};
