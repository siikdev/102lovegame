/* feature: archive — 📊 전적 (Supabase 아카이브 기반)
   화면: 히어로 타일 → [🏆 랭킹 | 📅 세션] 탭.
   랭킹 행 클릭 → 플레이어 상세(요약·맵별 승률·경기 목록·어느 세션인지).
   집계 로직은 stats.js (순수 함수) — 요원별/K/D 확장도 거기서만. */
import { $, esc, toast } from '../../shared/dom.js';
import { mapById } from '../../shared/state.js';
import { getSupabase } from '../../data/supabase.js';
import { on, emit } from '../../shared/bus.js';
import { buildStats, ranking, winRate, pct, recentForm, MIN_GAMES_FOR_RANK } from './stats.js';

export const id = 'archive';

let cache = null;      // {players, sessions, matches}
let tab = 'rank';      // 'rank' | 'sessions'
let selected = null;   // 플레이어 상세 (이름) — null 이면 목록

function openArchive() {
  document.body.classList.add('in-archive');
  const a = $('#archive'); if (a) a.hidden = false;
  selected = null;
  loadData();
}

function closeArchive() {
  document.body.classList.remove('in-archive');
  const a = $('#archive'); if (a) a.hidden = true;
  emit('lobby:open');
}

async function loadData() {
  try {
    const sb = await getSupabase();
    const [sessRes, msRes] = await Promise.all([
      sb.from('sessions').select('id, created_at, ended_at, state').order('created_at', { ascending: false }).limit(100),
      sb.from('session_matches').select('session_id, record').limit(1000),
    ]);
    if (sessRes.error) throw sessRes.error;
    if (msRes.error) throw msRes.error;
    const sessions = sessRes.data || [], matches = msRes.data || [];
    cache = { sessions, matches, players: buildStats(matches, sessions) };
    render();
  } catch (e) { console.error(e); toast('기록을 불러오지 못했습니다'); }
}

/* ---------- 공통 조각 ---------- */
const fmtDate = iso => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};
const meter = (v, label) => `
  <span class="meter"><span class="meter-fill" style="width:${v ?? 0}%"></span></span>
  <span class="meter-val">${v === null ? '–' : v + '%'}</span>${label ?? ''}`;
const formDots = form => `<span class="form">${form.map(r =>
  `<i class="fd fd-${r.toLowerCase()}">${r}</i>`).join('')}</span>`;
const sessTitle = s => Array.isArray(s?.state?.teamNames) ? s.state.teamNames.join(' vs ') : (s?.id ?? '');

/* ---------- 렌더 ---------- */
function render() {
  if (!cache) return;
  renderHero();
  $('#archTabs').hidden = !!selected;
  $('#archRank').hidden = !!selected || tab !== 'rank';
  $('#archSessions').hidden = !!selected || tab !== 'sessions';
  $('#archPlayer').hidden = !selected;
  document.querySelectorAll('#archTabs .atab').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === tab));
  if (selected) renderPlayer(selected);
  else if (tab === 'rank') renderRank();
  else renderSessions();
}

function renderHero() {
  const { players, matches, sessions } = cache;
  const ranked = ranking(players).filter(p => p.games >= MIN_GAMES_FOR_RANK);
  const top = ranked[0];
  const most = [...players.values()].sort((a, b) => b.games - a.games)[0];
  $('#archHero').innerHTML = `
    <button class="tile tile-top" ${top ? `data-player="${esc(top.name)}"` : ''}>
      <span class="tl">👑 승률 1위</span>
      <span class="tv">${top ? esc(top.name) : '–'}</span>
      <span class="ts">${top ? pct(winRate(top)) + '% · ' + top.games + '경기' : MIN_GAMES_FOR_RANK + '경기 이상부터'}</span>
    </button>
    <div class="tile"><span class="tl">총 경기</span><span class="tv">${matches.length}</span><span class="ts">세션 ${sessions.length}개</span></div>
    <button class="tile" ${most ? `data-player="${esc(most.name)}"` : ''}>
      <span class="tl">최다 출전</span>
      <span class="tv">${most ? esc(most.name) : '–'}</span>
      <span class="ts">${most ? most.games + '경기' : ''}</span>
    </button>`;
  $('#archHero').querySelectorAll('[data-player]').forEach(b =>
    b.addEventListener('click', () => { selected = b.dataset.player; render(); }));
}

function renderRank() {
  const rows = ranking(cache.players);
  $('#archRank').innerHTML = rows.length ? rows.map((p, i) => {
    const q = p.games >= MIN_GAMES_FOR_RANK;
    return `<button class="rrow ${i === 0 && q ? 'first' : ''}" data-player="${esc(p.name)}">
      <span class="rn">${q ? i + 1 : '·'}</span>
      <span class="rname">${esc(p.name)}</span>
      <span class="rg">${p.games}경기</span>
      <span class="rwl">${p.w}승 ${p.l}패${p.d ? ' ' + p.d + '무' : ''}</span>
      ${meter(pct(winRate(p)))}
      ${formDots(recentForm(p))}
    </button>`;
  }).join('') + `<p class="hint rfoot">승률 랭킹은 ${MIN_GAMES_FOR_RANK}경기 이상부터 · 행을 누르면 개인 전적</p>`
    : '<div class="arch-empty">아직 기록된 경기가 없습니다<br><span class="hint">라이브 중 💾 저장한 판이 여기 쌓입니다</span></div>';
  $('#archRank').querySelectorAll('[data-player]').forEach(b =>
    b.addEventListener('click', () => { selected = b.dataset.player; render(); }));
}

function renderPlayer(name) {
  const p = cache.players.get(name);
  if (!p) { selected = null; return render(); }
  const wr = pct(winRate(p));
  // 맵별 승률 (출전 많은 순)
  const maps = [...p.byMap.entries()].sort((a, b) => b[1].g - a[1].g);
  const mapRows = maps.map(([mid, s]) => {
    const m = mapById(mid) || { en: mid, color: '#888' };
    return `<div class="mrow">
      <span class="sw" style="background:${m.color}"></span>
      <span class="mname rj">${esc(m.en)}</span>
      <span class="mg">${s.w}승 ${s.l}패${s.d ? ' ' + s.d + '무' : ''}</span>
      ${meter(pct(winRate(s)))}
    </div>`;
  }).join('') || '<div class="hint">맵 기록 없음</div>';
  // 경기 목록 (최신순) — 어느 세션의 판인지 포함
  const games = p.matches.map(({ record: r, side, result, session }) => {
    const m = mapById(r.map) || { en: r.mapName || '?', color: '#888' };
    const my = r.teams[side], op = r.teams[side === 'A' ? 'B' : 'A'];
    const sc = r.score ? (side === 'A' ? `${r.score.A} : ${r.score.B}` : `${r.score.B} : ${r.score.A}`) : '–';
    return `<div class="grow">
      <i class="fd fd-${(result ?? 'd').toLowerCase()}">${result ?? '–'}</i>
      <span class="pill" style="background:${m.color};color:#0f1419">${esc(m.en)}</span>
      <span class="gsc rj">${sc}</span>
      <span class="gteam">${esc(my?.name ?? '')} <span class="hint">vs ${esc(op?.name ?? '')}</span></span>
      <span class="gsess hint">${esc(sessTitle(session))} · ${fmtDate(r.createdAt)}</span>
    </div>`;
  }).join('');
  $('#archPlayer').innerHTML = `
    <div class="prow-head">
      <button class="btn ghost sm" id="btnPlayerBack">← 랭킹</button>
      <h3 class="pname">${esc(name)}</h3>
      <span class="psum">${p.games}경기 · ${p.w}승 ${p.l}패${p.d ? ' ' + p.d + '무' : ''} · 승률 ${wr === null ? '–' : wr + '%'}</span>
      ${formDots(recentForm(p, 8))}
    </div>
    <div class="pgrid">
      <div class="card"><div class="ch"><h3>맵별 승률</h3></div><div class="cb">${mapRows}</div></div>
      <div class="card"><div class="ch"><h3>경기 기록</h3></div><div class="cb pgames">${games}</div></div>
    </div>`;
  $('#btnPlayerBack').addEventListener('click', () => { selected = null; render(); });
}

function renderSessions() {
  const { sessions, matches } = cache;
  const bySess = new Map();
  for (const m of matches) {
    if (!bySess.has(m.session_id)) bySess.set(m.session_id, []);
    bySess.get(m.session_id).push(m.record);
  }
  $('#archSessions').innerHTML = sessions.length ? sessions.map(s => {
    const recs = (bySess.get(s.id) || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const rows = recs.map(r => {
      const m = mapById(r.map) || { en: r.mapName || '?', color: '#888' };
      const sc = r.score
        ? `<span class="${r.winner === 'A' ? 'aw' : ''}">${r.score.A}</span> : <span class="${r.winner === 'B' ? 'aw' : ''}">${r.score.B}</span>`
        : '–';
      const pl = side => (r.teams?.[side]?.players || []).map(p => p.name).filter(n => n && n !== '-').join(', ');
      return `<div class="arch-match">
        <span class="pill" style="background:${m.color};color:#0f1419">${esc(m.en)}</span>
        <span class="am-score rj">${sc}</span>
        <span class="am-teams">${esc(r.teams?.A?.name ?? 'A')} vs ${esc(r.teams?.B?.name ?? 'B')}</span>
        <span class="am-pl hint">${esc(pl('A'))} ⟷ ${esc(pl('B'))}</span>
      </div>`;
    }).join('') || '<div class="hint" style="padding:8px 2px">저장된 경기 없음</div>';
    return `<details class="arch-sess"${s.ended_at ? '' : ' open'}>
      <summary><b>${esc(sessTitle(s))}</b><span class="hint">${fmtDate(s.created_at)} · ${s.ended_at ? '종료' : '🔴 진행 중'} · ${recs.length}판</span></summary>
      ${rows}
    </details>`;
  }).join('') : '<div class="arch-empty">세션 기록이 없습니다</div>';
}

export function init() {
  $('#btnArchBack')?.addEventListener('click', closeArchive);
  document.querySelectorAll('#archTabs .atab').forEach(b =>
    b.addEventListener('click', () => { tab = b.dataset.tab; selected = null; render(); }));
  on('archive:open', openArchive);
}
