/* feature: live-session — 🔴 실시간 내전 세션 공유 (ADR-0002, Supabase)
   방장: 상태 변화('state:changed')를 debounce 해 sessions.state 로 push,
         기록 변화는 diff 로 session_matches 에 upsert (+8초 주기 안전망)
   뷰어: #/s/<id> 접속 → 초기 fetch + Realtime(postgres_changes) 구독, 조작 불가
   Supabase 접속 정보는 app/env.js (gitignore) — 없으면 기능이 조용히 비활성.
   supabase-js 는 세션을 실제로 쓸 때만 CDN 에서 동적 로드 (기본 앱은 무의존성 유지) */
import { $, esc, toast } from '../../shared/dom.js';
import { state } from '../../shared/state.js';
import { LS, load, save } from '../../shared/storage.js';
import { getSupabase } from '../../data/supabase.js';
import { setStep } from '../../app/steps.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'liveSession';

const PUSH_DEBOUNCE_MS = 300;
const MATCH_SYNC_MS = 8000;
const HEARTBEAT_MS = 30000;        // 방장 생존 신호 (updated_at 갱신 → 목록의 "활동 중" 판별)
const ACTIVE_WINDOW_MS = 30 * 60 * 1000; // 최근 30분 내 활동 세션만 목록에 표시

let client = null;        // supabase client (lazy)
let sessionId = null;
let hostToken = null;     // 방장일 때만 존재
let channel = null;       // 뷰어 realtime 채널
let pushTimer = null;
let matchTimer = null;
let heartbeatTimer = null;
let viewerTimer = null;    // 뷰어 생존 확인 폴링 (모바일 WS 끊김 대비)
let endedNotified = false; // 종료 안내 중복 방지
let sessionStartAt = '';   // 방장: 이 세션 시작 시각 — 이후 저장된 기록만 세션에 push
let lastPushed = new Map(); // matchId -> JSON string (방장 diff 용)

/* ---------- 공통 ---------- */
const parseHash = () => (location.hash.match(/^#\/s\/([a-z0-9]{4,16})$/) || [])[1] || null;
const sessionUrl = sid => location.origin + location.pathname + '#/s/' + sid;
const rnd36 = len => {
  const a = new Uint8Array(len); crypto.getRandomValues(a);
  return [...a].map(b => (b % 36).toString(36)).join('');
};

async function getClient() {
  if (client) return client;
  try { client = await getSupabase(); return client; }
  catch (e) { toast('Supabase 설정이 없습니다 — frontend/app/env.js (env.example.js 참고)'); throw e; }
}

/* LS.liveHost 항목: {token, at} (at = 세션 시작 시각 — 세션 중 저장된 기록만 push 하는 기준)
   구버전(문자열 토큰)도 호환 */
function hostEntry(sid) {
  const v = load(LS.liveHost, {})[sid];
  if (!v) return null;
  return typeof v === 'string' ? { token: v, at: '' } : v;
}

function snapshot() {
  return {
    players: state.players, tierNames: state.tierNames, teamNames: state.teamNames,
    pool: state.pool, teams: state.teams, map: state.map, mapLocked: state.mapLocked,
    sides: state.sides, step: state.step, savedCurrent: state.savedCurrent,
    score: [$('#scoreA')?.value ?? '', $('#scoreB')?.value ?? ''],
  };
}

function setLiveDot(ok) { $('#liveDot')?.classList.toggle('on', !!ok); }

async function copyLink() {
  const url = sessionUrl(sessionId);
  try { await navigator.clipboard.writeText(url); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast('세션 링크 복사됨 — 디코에 공유하세요!');
}

/* ---------- 방장 (송출) ---------- */
async function startSession() {
  if (state.busy) return;
  if (sessionId && hostToken) return copyLink(); // 이미 송출 중이면 링크만
  hideLobby();
  try {
    const sb = await getClient();
    const sid = rnd36(8), token = crypto.randomUUID();
    const { error } = await sb.rpc('create_session', { p_id: sid, p_host_token: token, p_state: snapshot() });
    if (error) throw error;
    sessionId = sid; hostToken = token;
    sessionStartAt = new Date().toISOString();
    const tokens = load(LS.liveHost, {}); tokens[sid] = { token, at: sessionStartAt }; save(LS.liveHost, tokens);
    location.hash = '#/s/' + sid;
    startHostLoops(); renderBar(); setLiveDot(true);
    await pushMatches();
    copyLink();
  } catch (e) { console.error(e); toast('세션 생성 실패 — 네트워크/DB 스키마 확인'); }
}

function startHostLoops() {
  clearInterval(matchTimer);
  matchTimer = setInterval(pushMatches, MATCH_SYNC_MS); // 인라인 수정 등 놓치는 변화 안전망
  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(schedulePush, HEARTBEAT_MS); // 하트비트 (세션 목록 노출 유지)
}

function schedulePush() {
  if (!sessionId || !hostToken) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      const sb = await getClient();
      const { data, error } = await sb.rpc('update_session_state',
        { p_id: sessionId, p_host_token: hostToken, p_state: snapshot() });
      if (error || data === false) throw (error || new Error('권한 거부'));
      setLiveDot(true);
    } catch (e) { console.error(e); setLiveDot(false); }
  }, PUSH_DEBOUNCE_MS);
}

/* 기록 diff push: 새 기록/수정 upsert, 삭제 반영 */
async function pushMatches() {
  if (!sessionId || !hostToken) return;
  try {
    const sb = await getClient();
    // 이 세션 시작 이후 저장된 기록만 세션에 올림 (과거 기록으로 세션 전적 오염 방지)
    const sessionRecords = state.history.filter(h => String(h.createdAt) >= sessionStartAt);
    const cur = new Map(sessionRecords.map(h => [h.id, JSON.stringify(h)]));
    for (const [mid, json] of cur) {
      if (lastPushed.get(mid) !== json) {
        await sb.rpc('add_session_match',
          { p_session_id: sessionId, p_host_token: hostToken, p_match_id: mid, p_record: JSON.parse(json) });
      }
    }
    for (const mid of lastPushed.keys()) {
      if (!cur.has(mid)) {
        await sb.rpc('delete_session_match',
          { p_session_id: sessionId, p_host_token: hostToken, p_match_id: mid });
      }
    }
    lastPushed = cur;
  } catch (e) { console.error(e); }
}

/* 방송 종료 = 아카이브: ended_at 마킹(세션·경기 기록은 영구 보존, 📊 전적에서 조회).
   시청자는 ended 플래그를 받고 로비로 안내된다. */
async function endSession() {
  const sid = sessionId, token = hostToken;
  clearTimeout(pushTimer); clearInterval(matchTimer); clearInterval(heartbeatTimer);
  await pushMatches(); // 마지막 기록까지 올리고 종료
  sessionId = null; hostToken = null; lastPushed = new Map(); sessionStartAt = '';
  try {
    const sb = await getClient();
    await sb.rpc('end_session', { p_id: sid, p_host_token: token });
    const tokens = load(LS.liveHost, {}); delete tokens[sid]; save(LS.liveHost, tokens);
  } catch (e) { console.error(e); }
  location.hash = '';
  renderBar();
  toast('방송 종료 — 세션과 경기 기록은 📊 전적에 보존됩니다');
  showLobby(); // 방송 끝 → 로비로
}

/* ---------- 뷰어 (시청) ---------- */
/* 종료 감지 공통 처리 */
function endedByHost() {
  if (endedNotified) return;
  endedNotified = true;
  toast('방송이 종료되었습니다 — 로비로 이동합니다');
  setTimeout(leaveSession, 1500);
}

/* 생존 확인: 세션 행이 사라졌거나 ended 면 로비로.
   모바일에서 화면 꺼짐 등으로 Realtime 이벤트를 놓쳐도 10초 내 복구 */
async function checkAlive(sid) {
  if (!state.liveViewer || endedNotified) return;
  try {
    const sb = await getClient();
    const { data } = await sb.from('sessions').select('state').eq('id', sid).maybeSingle();
    if (!data || data.state?.ended) endedByHost();
  } catch { /* 일시 네트워크 오류는 무시 */ }
}

function startViewerWatch(sid) {
  clearInterval(viewerTimer);
  viewerTimer = setInterval(() => checkAlive(sid), 10000);
  document.addEventListener('visibilitychange', () => { // 화면 복귀 즉시 확인
    if (document.visibilityState === 'visible') checkAlive(sid);
  });
}

async function joinAsViewer(sid) {
  try {
    const sb = await getClient();
    const { data: row, error } = await sb.from('sessions').select('state').eq('id', sid).single();
    if (error || !row) throw (error || new Error('세션 없음'));
    if (row.state?.ended) { toast('이미 종료된 방송입니다'); location.hash = ''; showLobby(); return; }
    sessionId = sid;
    state.liveViewer = true;
    document.body.classList.add('live-viewer');
    applyState(row.state);
    const { data: ms } = await sb.from('session_matches').select('record').eq('session_id', sid);
    state.history = (ms || []).map(r => r.record)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    emit('history:changed');
    channel = sb.channel('live:' + sid)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: 'id=eq.' + sid },
        p => applyState(p.new?.state))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_matches', filter: 'session_id=eq.' + sid },
        p => applyMatchChange(p))
      .subscribe(status => setLiveDot(status === 'SUBSCRIBED'));
    startViewerWatch(sid);
    renderBar();
    toast('라이브 시청 시작!');
  } catch (e) {
    console.error(e);
    toast('세션을 찾을 수 없습니다 — 링크를 확인해주세요');
    sessionId = null; location.hash = '';
  }
}

function applyState(s) {
  if (!s) return;
  if (s.ended) { endedByHost(); return; } // 방장이 방송을 종료함
  state.players = s.players ?? state.players;
  state.tierNames = s.tierNames ?? state.tierNames;
  state.teamNames = s.teamNames ?? state.teamNames;
  state.pool = Array.isArray(s.pool) && s.pool.length ? s.pool : state.pool;
  state.teams = s.teams ?? null;
  state.map = s.map ?? null;
  state.mapLocked = !!s.mapLocked;
  state.sides = s.sides ?? null;
  state.savedCurrent = !!s.savedCurrent;
  if (!state.sides) emit('coin:reset');
  emit('session:restored', { score: s.score }); // 코인 면·스코어 입력 복원 로직 재사용
  emit('app:refresh'); emit('app:sync');
  let st = s.step || 1;
  if (st === 3 && !state.mapLocked) st = state.teams ? 2 : 1;
  if (st === 2 && !state.teams) st = 1;
  setStep(st);
}

function applyMatchChange(p) {
  if (p.eventType === 'DELETE') {
    const mid = p.old?.id;
    if (mid) state.history = state.history.filter(h => h.id !== mid);
  } else {
    const rec = p.new?.record;
    if (!rec) return;
    state.history = [rec, ...state.history.filter(h => h.id !== rec.id)];
  }
  state.history.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  emit('history:changed');
}

function leaveSession() {
  clearInterval(viewerTimer);
  channel?.unsubscribe();
  location.hash = '';
  location.reload(); // 내 로컬 상태로 깔끔히 복귀
}

/* ---------- 로비 (접속 첫 화면 — 인터넷 방송처럼 방송 선택/시작) ---------- */
let lobbyTimer = null;

async function showLobby() {
  if (state.liveViewer || (sessionId && hostToken)) return; // 방송/시청 중엔 로비 금지
  document.body.classList.add('in-lobby');
  const lb = $('#lobby'); if (lb) lb.hidden = false;
  refreshLobby();
  clearInterval(lobbyTimer);
  lobbyTimer = setInterval(refreshLobby, 10000); // 로비에 있는 동안 10초마다 갱신
}

function hideLobby() {
  clearInterval(lobbyTimer); lobbyTimer = null;
  document.body.classList.remove('in-lobby');
  const lb = $('#lobby'); if (lb) lb.hidden = true;
}

async function refreshLobby() {
  try {
    const sb = await getClient();
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
    const { data, error } = await sb.from('sessions')
      .select('id, updated_at, state')
      .is('ended_at', null) // 아카이브(종료)된 세션 제외
      .gt('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(12);
    if (error) throw error;
    renderLobbyCards((data || []).filter(s => !s.state?.ended));
  } catch (e) { console.error(e); renderLobbyCards([]); }
}

function renderLobbyCards(list) {
  const g = $('#lobbyGrid'); if (!g) return;
  const tokens = load(LS.liveHost, {});
  g.innerHTML = list.length ? list.map(s => {
    const st = s.state || {};
    const title = Array.isArray(st.teamNames) ? st.teamNames.join('  vs  ') : s.id;
    const step = st.step === 3 ? '⚔️ 경기 진행' : st.step === 2 ? '🗺️ 맵 선택 중' : '🎲 팀 구성 중';
    const min = Math.max(0, Math.round((Date.now() - new Date(s.updated_at).getTime()) / 60000));
    const mine = !!tokens[s.id];
    return `<button class="lobby-card" data-sid="${esc(s.id)}">
      <span class="lc-live">${mine ? '🎙 내 방송' : '🔴 LIVE'}</span>
      <span class="lc-title">${esc(title)}</span>
      <span class="lc-meta">${step} · ${min ? min + '분 전' : '방금'} 활동</span>
      <span class="lc-join">${mine ? '송출 재개 →' : '시청하기 →'}</span>
    </button>`;
  }).join('') : '<div class="lobby-empty">지금 진행 중인 라이브가 없습니다 — 새 라이브를 시작해보세요!</div>';
  g.querySelectorAll('.lobby-card').forEach(b =>
    b.addEventListener('click', () => { hideLobby(); selectSession(b.dataset.sid); }));
}

/* 목록에서 세션 선택: 내 세션이면 송출 재개, 아니면 시청 입장 */
async function selectSession(sid) {
  const he = hostEntry(sid);
  location.hash = '#/s/' + sid;
  if (he) {
    sessionId = sid; hostToken = he.token; sessionStartAt = he.at || '';
    startHostLoops(); schedulePush(); renderBar();
    toast('내 세션 송출 재개!');
  } else {
    await joinAsViewer(sid);
  }
}

/* ---------- UI ---------- */
function renderBar() {
  const bar = $('#liveBar'); if (!bar) return;
  const btn = $('#btnLive');
  if (!sessionId) { bar.hidden = true; btn?.removeAttribute('hidden'); return; }
  bar.hidden = false; btn?.setAttribute('hidden', '');
  if (hostToken) {
    bar.innerHTML = `<span class="live-dot on" id="liveDot"></span><b>LIVE 송출 중</b>
      <span class="sid">#/s/${sessionId}</span>
      <button class="btn ghost sm" id="btnLiveCopy" data-live-allow>🔗 링크 복사</button>
      <button class="btn ghost sm" id="btnLiveEnd" data-live-allow>⏹ 방송 종료</button>`;
    $('#btnLiveCopy').addEventListener('click', copyLink);
    $('#btnLiveEnd').addEventListener('click', endSession);
  } else {
    bar.innerHTML = `<span class="live-dot" id="liveDot"></span><b>라이브 시청 중</b>
      <span class="sid">#/s/${sessionId}</span>
      <span class="hint">방장 화면이 실시간 반영됩니다 (조작 불가)</span>
      <button class="btn ghost sm" id="btnLiveLeave" data-live-allow>나가기</button>`;
    $('#btnLiveLeave').addEventListener('click', leaveSession);
  }
}

/* ---------- init ---------- */
export async function init() {
  // 헤더 라이브 버튼: 송출 중이면 링크 복사, 아니면 로비로
  $('#btnLive')?.addEventListener('click', () => {
    if (sessionId && hostToken) copyLink();
    else showLobby();
  });
  // 로비 버튼
  $('#btnLobbyNew')?.addEventListener('click', startSession);
  $('#btnLobbyArchive')?.addEventListener('click', () => { hideLobby(); emit('archive:open'); });
  $('#btnLobbyLocal')?.addEventListener('click', () => { hideLobby(); toast('로컬 모드 — 헤더 🔴 라이브로 언제든 로비 복귀'); });
  on('lobby:open', showLobby); // 전적 화면 뒤로가기 등

  on('state:changed', schedulePush);                       // 방장: 상태 push
  on('history:changed', () => { if (hostToken) pushMatches(); }); // 방장: 기록 push

  const sid = parseHash();
  if (sid) {
    // 공유 링크로 진입 → 로비 건너뛰고 바로 해당 세션으로
    const he = hostEntry(sid);
    if (he) { // 방장이 새로고침/재접속 — 송출 재개
      sessionId = sid; hostToken = he.token; sessionStartAt = he.at || '';
      startHostLoops(); schedulePush();
    } else {
      await joinAsViewer(sid);
    }
    renderBar();
  } else {
    renderBar();
    showLobby(); // 접속 첫 화면 = 로비 (인터넷 방송 스타일)
  }
}
