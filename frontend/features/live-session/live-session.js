/* feature: live-session — 🔴 실시간 내전 세션 공유 (ADR-0002, Supabase)
   방장: 상태 변화('state:changed')를 debounce 해 sessions.state 로 push,
         기록 변화는 diff 로 session_matches 에 upsert (+8초 주기 안전망)
   뷰어: #/s/<id> 접속 → 초기 fetch + Realtime(postgres_changes) 구독, 조작 불가
   Supabase 접속 정보는 app/env.js (gitignore) — 없으면 기능이 조용히 비활성.
   supabase-js 는 세션을 실제로 쓸 때만 CDN 에서 동적 로드 (기본 앱은 무의존성 유지) */
import { $, toast } from '../../shared/dom.js';
import { state } from '../../shared/state.js';
import { LS, load, save } from '../../shared/storage.js';
import { setStep } from '../../app/steps.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'liveSession';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const PUSH_DEBOUNCE_MS = 300;
const MATCH_SYNC_MS = 8000;

let client = null;        // supabase client (lazy)
let sessionId = null;
let hostToken = null;     // 방장일 때만 존재
let channel = null;       // 뷰어 realtime 채널
let pushTimer = null;
let matchTimer = null;
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
  let env = null;
  try { env = (await import('../../app/env.js')).ENV; } catch { /* env.js 없음 */ }
  if (!env?.SUPABASE_URL || !env?.SUPABASE_PUBLISHABLE_KEY) {
    toast('Supabase 설정이 없습니다 — frontend/app/env.js (env.example.js 참고)');
    throw new Error('live-session: env.js 없음');
  }
  const { createClient } = await import(SUPABASE_ESM);
  client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);
  return client;
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
  try {
    const sb = await getClient();
    const sid = rnd36(8), token = crypto.randomUUID();
    const { error } = await sb.rpc('create_session', { p_id: sid, p_host_token: token, p_state: snapshot() });
    if (error) throw error;
    sessionId = sid; hostToken = token;
    const tokens = load(LS.liveHost, {}); tokens[sid] = token; save(LS.liveHost, tokens);
    location.hash = '#/s/' + sid;
    startHostLoops(); renderBar(); setLiveDot(true);
    await pushMatches();
    copyLink();
  } catch (e) { console.error(e); toast('세션 생성 실패 — 네트워크/DB 스키마 확인'); }
}

function startHostLoops() {
  clearInterval(matchTimer);
  matchTimer = setInterval(pushMatches, MATCH_SYNC_MS); // 인라인 수정 등 놓치는 변화 안전망
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
    const cur = new Map(state.history.map(h => [h.id, JSON.stringify(h)]));
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

function endSession() {
  clearTimeout(pushTimer); clearInterval(matchTimer);
  sessionId = null; hostToken = null; lastPushed = new Map();
  location.hash = '';
  renderBar();
  toast('송출 종료 (기록은 그대로 보존됨)');
}

/* ---------- 뷰어 (시청) ---------- */
async function joinAsViewer(sid) {
  try {
    const sb = await getClient();
    const { data: row, error } = await sb.from('sessions').select('state').eq('id', sid).single();
    if (error || !row) throw (error || new Error('세션 없음'));
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
  channel?.unsubscribe();
  location.hash = '';
  location.reload(); // 내 로컬 상태로 깔끔히 복귀
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
      <button class="btn ghost sm" id="btnLiveEnd" data-live-allow>송출 종료</button>`;
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
  $('#btnLive')?.addEventListener('click', startSession);
  on('state:changed', schedulePush);                       // 방장: 상태 push
  on('history:changed', () => { if (hostToken) pushMatches(); }); // 방장: 기록 push
  const sid = parseHash();
  if (sid) {
    const tokens = load(LS.liveHost, {});
    if (tokens[sid]) { // 방장이 새로고침한 경우 — 송출 재개
      sessionId = sid; hostToken = tokens[sid];
      startHostLoops(); schedulePush();
    } else {
      await joinAsViewer(sid);
    }
  }
  renderBar();
}
