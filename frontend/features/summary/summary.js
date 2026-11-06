/* feature: summary — 매치 요약 · 스코어 입력 · 기록 저장 · 같은 팀 한판 더 */
import { $, esc, toast } from '../../shared/dom.js';
import { state, mapById } from '../../shared/state.js';
import { persistSession } from '../../shared/session.js';
import { setStep } from '../../app/steps.js';
import { adapter } from '../../data/index.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'summary';

const clearScore = () => { $('#scoreA').value = ''; $('#scoreB').value = ''; };

function matchRecord() {
  const sa = $('#scoreA').value.trim(), sb = $('#scoreB').value.trim();
  const score = (sa !== '' && sb !== '') ? {A: +sa, B: +sb} : null;
  return {
    id: 'm_' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    map: state.map, mapName: mapById(state.map).en,
    teams: {
      A: {name: state.teamNames[0], side: state.sides.A, players: state.teams.A},
      B: {name: state.teamNames[1], side: state.sides.B, players: state.teams.B},
    },
    score,
    winner: score ? (score.A > score.B ? 'A' : score.B > score.A ? 'B' : 'draw') : null,
    schemaVersion: 2,
  };
}

function render() {
  const s = $('#summary');
  if (!(state.teams && state.mapLocked && state.sides)) { s.style.display = 'none'; return; }
  s.style.display = 'block';
  const team = (key, idx) => `
    <div class="ht"><span class="pill ${state.sides[key].toLowerCase()}">${state.sides[key]}</span>${esc(state.teamNames[idx])}</div>
    ${state.teams[key].map(p => `<div class="pl"><span>${esc(p.name)}</span><span class="tt">${esc(p.tierName)}</span></div>`).join('')}`;
  $('#sumA').innerHTML = team('A', 0); $('#sumB').innerHTML = team('B', 1);
  $('#scNameA').textContent = state.teamNames[0]; $('#scNameB').textContent = state.teamNames[1];
  const m = mapById(state.map);
  $('#sumMap').innerHTML = `<span class="dot" style="background:${m.color}"></span><span class="rj">${m.en}</span><span class="hint">${m.ko}</span>`;
}

function summaryText() {
  const m = mapById(state.map);
  const line = (key, idx) => `[${state.sides[key]}] ${state.teamNames[idx]}: ` + state.teams[key].map(p => p.name).join(', ');
  const sa = $('#scoreA').value.trim(), sb = $('#scoreB').value.trim();
  const sc = (sa !== '' && sb !== '') ? `\n🏁 ${state.teamNames[0]} ${sa} : ${sb} ${state.teamNames[1]}` : '';
  return `🗺️ ${m.en} (${m.ko})\n${line('A', 0)}\n${line('B', 1)}${sc}`;
}

async function copySummary() {
  try { await navigator.clipboard.writeText(summaryText()); toast('클립보드에 복사됨'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = summaryText(); document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove();
    toast('클립보드에 복사됨');
  }
}

async function saveMatch() {
  state.history = await adapter.saveMatch(matchRecord());
  state.savedCurrent = true;
  emit('history:changed'); emit('app:sync');
  persistSession();
  toast('기록 저장됨');
}

/* 같은 팀 그대로 한판 더: 팀 유지, 맵/공수/스코어만 초기화 후 맵 선택으로 */
function rematch() {
  if (state.busy || !state.teams) return;
  state.map = null; state.mapLocked = false; state.sides = null; state.savedCurrent = false;
  clearScore();
  emit('coin:reset'); emit('app:refresh'); emit('app:sync');
  setStep(2);
  toast('같은 팀으로 한판 더 — 맵부터 다시!');
}

function sync() {
  const b = state.busy;
  $('#btnSave').disabled = b || !state.sides || state.savedCurrent;
  $('#btnRematch').disabled = b || !state.teams;
}

export function init() {
  render();

  $('#btnCopy').addEventListener('click', copySummary);
  $('#btnSave').addEventListener('click', saveMatch);
  $('#btnRematch').addEventListener('click', rematch);
  ['#scoreA', '#scoreB'].forEach(s => $(s).addEventListener('input', persistSession));

  on('app:refresh', render);
  on('app:sync', sync);
  on('score:clear', clearScore);
  on('session:restored', ses => {
    if (Array.isArray(ses.score)) {
      $('#scoreA').value = ses.score[0] || '';
      $('#scoreB').value = ses.score[1] || '';
    }
  });
  sync();
}
