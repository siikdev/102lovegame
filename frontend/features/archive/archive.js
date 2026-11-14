/* feature: archive — 📊 전적/기록 (Supabase 아카이브 기반)
   종료(ended_at)된 세션 포함 모든 세션의 경기 기록으로
   ① 플레이어별 승률 ② 세션별 경기 목록을 보여준다.
   현재는 클라이언트 집계 (수천 경기 규모까지 충분) — 그 이상은 SQL 뷰/백엔드 집계로 이전. */
import { $, esc, toast } from '../../shared/dom.js';
import { mapById } from '../../shared/state.js';
import { getSupabase } from '../../data/supabase.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'archive';

function openArchive() {
  document.body.classList.add('in-archive');
  const a = $('#archive'); if (a) a.hidden = false;
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
    renderPlayers(msRes.data || []);
    renderSessions(sessRes.data || [], msRes.data || []);
  } catch (e) {
    console.error(e);
    toast('기록을 불러오지 못했습니다');
  }
}

/* ① 플레이어별 승률 — 세션에 기록된 모든 경기 기준 */
function renderPlayers(ms) {
  const stats = new Map();
  for (const { record: r } of ms) {
    if (!r?.teams) continue;
    for (const side of ['A', 'B']) {
      for (const p of r.teams[side]?.players || []) {
        const name = p?.name;
        if (!name || name === '-') continue;
        const s = stats.get(name) || { g: 0, w: 0, l: 0, d: 0 };
        s.g++;
        if (r.winner === side) s.w++;
        else if (r.winner === 'draw') s.d++;
        else if (r.winner) s.l++;
        stats.set(name, s);
      }
    }
  }
  const rows = [...stats.entries()].sort((a, b) => b[1].g - a[1].g || b[1].w - a[1].w);
  $('#archPlayers').innerHTML = rows.length
    ? `<table><thead><tr><th>플레이어</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th></tr></thead><tbody>` +
      rows.map(([n, s]) => {
        const wr = (s.w + s.l) ? Math.round(s.w / (s.w + s.l) * 100) : null;
        return `<tr><td class="an">${esc(n)}</td><td>${s.g}</td><td class="aw">${s.w}</td><td class="al">${s.l}</td><td>${s.d}</td><td class="awr">${wr === null ? '–' : wr + '%'}</td></tr>`;
      }).join('') + '</tbody></table>'
    : '<div class="arch-empty">아직 세션에 기록된 경기가 없습니다<br><span class="hint">라이브 중 💾 기록 저장한 판이 여기 쌓입니다</span></div>';
}

/* ② 세션별 경기 목록 — 어떤 세션에서 어떤 판이 있었는지 */
function renderSessions(sess, ms) {
  const bySess = new Map();
  for (const m of ms) {
    if (!bySess.has(m.session_id)) bySess.set(m.session_id, []);
    bySess.get(m.session_id).push(m.record);
  }
  $('#archSessions').innerHTML = sess.length ? sess.map(s => {
    const title = Array.isArray(s.state?.teamNames) ? s.state.teamNames.join(' vs ') : s.id;
    const d = new Date(s.created_at);
    const ds = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const recs = (bySess.get(s.id) || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const status = s.ended_at ? '종료' : '🔴 진행 중';
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
    }).join('') || '<div class="hint" style="padding:8px 2px">이 세션엔 저장된 경기가 없습니다</div>';
    return `<details class="arch-sess"${s.ended_at ? '' : ' open'}>
      <summary><b>${esc(title)}</b><span class="hint">${ds} · ${status} · 경기 ${recs.length}판</span></summary>
      ${rows}
    </details>`;
  }).join('') : '<div class="arch-empty">세션 기록이 없습니다</div>';
}

export function init() {
  $('#btnArchBack')?.addEventListener('click', closeArchive);
  on('archive:open', openArchive);
}
