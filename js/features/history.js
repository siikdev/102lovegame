/* feature: history — 매치 기록 테이블 · 수동 추가 · JSON 내보내기 */
import { $, esc, toast } from '../core/dom.js';
import { state, mapById } from '../core/state.js';
import { adapter } from '../data/index.js';
import { on } from '../core/bus.js';

export const id = 'history';

function render() {
  const tb = $('#histBody'); tb.innerHTML = '';
  if (!state.history.length) {
    tb.innerHTML = '<tr><td colspan="8" class="empty-row">저장된 매치가 없습니다</td></tr>';
    return;
  }
  state.history.forEach((h, i) => {
    const m = mapById(h.map) || {en: h.mapName, ko: '', color: '#888'};
    const d = new Date(h.createdAt);
    const ds = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const pl = k => h.teams[k].players.map(p => p.name).join(', ');
    const sc = h.score
      ? `<span class="${h.winner === 'A' ? 'w' : ''}">${h.score.A}</span> : <span class="${h.winner === 'B' ? 'w' : ''}">${h.score.B}</span>`
      : '<span style="color:var(--muted)">–</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="sm">${state.history.length - i}</td><td class="sm hide-m">${ds}${h.manual ? ' ✍' : ''}</td>
      <td class="mp"><span class="pill" style="background:${m.color};color:#0f1419;margin-right:6px">${m.en}</span></td>
      <td class="score rj" data-sc="${h.id}" title="클릭해서 스코어 입력/수정">${sc}</td>
      <td><span class="pill ${h.teams.A.side.toLowerCase()}">${h.teams.A.side}</span> ${esc(h.teams.A.name)}</td>
      <td><span class="pill ${h.teams.B.side.toLowerCase()}">${h.teams.B.side}</span> ${esc(h.teams.B.name)}</td>
      <td class="sm hide-m">${esc(pl('A'))} <span style="color:var(--muted)">vs</span> ${esc(pl('B'))}</td>
      <td><button class="btn ghost sm" data-del="${h.id}">삭제</button></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    state.history = await adapter.deleteMatch(b.dataset.del);
    render();
  }));
  tb.querySelectorAll('td[data-sc]').forEach(td => td.addEventListener('click', () => editScore(td.dataset.sc, td)));
}

/* 기록 표의 스코어 칸 클릭 → 인라인 수정 (기존 기록에 스코어 추가/변경) */
function editScore(id, td) {
  if (td.querySelector('input')) return; // 이미 편집 중
  const h = state.history.find(x => x.id === id); if (!h) return;
  td.innerHTML = `<input type="number" min="0" max="99" value="${h.score ? h.score.A : ''}" placeholder="A"> : <input type="number" min="0" max="99" value="${h.score ? h.score.B : ''}" placeholder="B"> <button class="btn teal sm" title="저장">✓</button>`;
  const [ia, ib] = td.querySelectorAll('input'), btn = td.querySelector('button');
  const done = async () => {
    const sa = ia.value.trim(), sb = ib.value.trim();
    let patch;
    if (sa === '' && sb === '') patch = {score: null, winner: null};
    else if (sa !== '' && sb !== '') {
      const score = {A: +sa, B: +sb};
      patch = {score, winner: score.A > score.B ? 'A' : score.B > score.A ? 'B' : 'draw'};
    } else return toast('양쪽 스코어를 모두 입력해주세요 (비우려면 둘 다 비우기)');
    state.history = await adapter.updateMatch(id, patch);
    render(); toast('스코어 저장됨');
  };
  btn.addEventListener('click', e => { e.stopPropagation(); done(); });
  [ia, ib].forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') done();
    if (e.key === 'Escape') render();
  }));
  ia.focus();
}

function exportJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 2,
    maps: state.maps.map(({id, en, ko}) => ({id, en, ko})),
    matches: state.history,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `val-balance-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---- 수동 추가: 저장 못 한 판을 수기로 기록 (현재 매치 정보 프리필) ---- */
function toLocalDT(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function openManual() {
  const f = $('#manualForm');
  if (!f.hidden) { f.hidden = true; return; }
  $('#mfMap').innerHTML = state.maps.map(m => `<option value="${m.id}">${m.en} (${m.ko})</option>`).join('');
  if (state.map) $('#mfMap').value = state.map;
  $('#mfDate').value = toLocalDT(new Date());
  $('#mfNameA').value = state.teamNames[0]; $('#mfNameB').value = state.teamNames[1];
  $('#mfSideA').value = state.sides ? state.sides.A : 'ATK';
  $('#mfScoreA').value = ''; $('#mfScoreB').value = '';
  $('#mfPlayersA').value = state.teams ? state.teams.A.map(p => p.name).filter(n => n && n !== '-').join(', ') : '';
  $('#mfPlayersB').value = state.teams ? state.teams.B.map(p => p.name).filter(n => n && n !== '-').join(', ') : '';
  f.hidden = false;
}

async function saveManual() {
  const m = mapById($('#mfMap').value);
  if (!m) return toast('맵을 선택해주세요');
  const sideA = $('#mfSideA').value, sideB = sideA === 'ATK' ? 'DEF' : 'ATK';
  const sa = $('#mfScoreA').value.trim(), sb = $('#mfScoreB').value.trim();
  const score = (sa !== '' && sb !== '') ? {A: +sa, B: +sb} : null;
  const parse = v => v.split(',').map(s => s.trim()).filter(Boolean).map((name, i) => ({tier: i + 1, tierName: '', name}));
  const dt = $('#mfDate').value ? new Date($('#mfDate').value) : new Date();
  const rec = {
    id: 'm_' + Date.now().toString(36),
    createdAt: dt.toISOString(),
    manual: true,
    map: m.id, mapName: m.en,
    teams: {
      A: {name: $('#mfNameA').value || 'TEAM A', side: sideA, players: parse($('#mfPlayersA').value)},
      B: {name: $('#mfNameB').value || 'TEAM B', side: sideB, players: parse($('#mfPlayersB').value)},
    },
    score,
    winner: score ? (score.A > score.B ? 'A' : score.B > score.A ? 'B' : 'draw') : null,
    schemaVersion: 2,
  };
  state.history = await adapter.saveMatch(rec);
  render();
  $('#manualForm').hidden = true;
  toast('수동 기록 추가됨');
}

export async function init() {
  state.history = await adapter.getHistory();
  render();

  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnClearHist').addEventListener('click', async () => {
    if (!state.history.length) return;
    if (confirm('매치 기록을 모두 삭제할까요?')) {
      state.history = await adapter.clearHistory();
      render();
    }
  });
  $('#btnManual').addEventListener('click', openManual);
  $('#mfCancel').addEventListener('click', () => { $('#manualForm').hidden = true; });
  $('#mfSave').addEventListener('click', saveManual);

  on('history:changed', render);
}
