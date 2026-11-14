/* feature: teams — 1단계 티어 입력 · 팀 랜덤 배정(사다리) */
import { $, $$, esc, rnd, toast } from '../../shared/dom.js';
import { state, TIERS } from '../../shared/state.js';
import { LS, save } from '../../shared/storage.js';
import { persistSession } from '../../shared/session.js';
import { setStep } from '../../app/steps.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'teams';

const nm = (t, p) => state.players[t][p] || '-';

function renderTiers() {
  const g = $('#tierGrid'); g.innerHTML = '';
  for (let t = 0; t < TIERS; t++) {
    const el = document.createElement('div'); el.className = 'tier';
    el.innerHTML = `
      <div class="th"><span class="badge">${t + 1}</span><input data-tn="${t}" value="${esc(state.tierNames[t])}" maxlength="12" title="티어 이름 수정"></div>
      <div class="tb">
        <div class="pin" data-i="P1"><input data-t="${t}" data-p="0" placeholder="플레이어 1" value="${esc(state.players[t][0])}" maxlength="20" autocomplete="off"></div>
        <div class="pin" data-i="P2"><input data-t="${t}" data-p="1" placeholder="플레이어 2" value="${esc(state.players[t][1])}" maxlength="20" autocomplete="off"></div>
      </div>`;
    g.appendChild(el);
  }
  g.querySelectorAll('input[data-t]').forEach(inp => {
    inp.addEventListener('input', () => {
      state.players[+inp.dataset.t][+inp.dataset.p] = inp.value.trim();
      save(LS.players, state.players);
      invalidateTeams();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const all = [...g.querySelectorAll('input[data-t]')];
        const i = all.indexOf(inp);
        (all[i + 1] || $('#btnShuffle')).focus();
      }
    });
  });
  g.querySelectorAll('input[data-tn]').forEach(inp => inp.addEventListener('input', () => {
    state.tierNames[+inp.dataset.tn] = inp.value;
    save(LS.tierNames, state.tierNames);
    renderTeams();
  }));
}

/* 플레이어가 바뀌면 진행 중 매치 무효화 */
function invalidateTeams() {
  if (!state.teams) return;
  state.teams = null; state.map = null; state.mapLocked = false; state.sides = null;
  state.savedCurrent = false;
  emit('score:clear');
  emit('app:refresh'); emit('app:sync');
  persistSession();
}

function renderTeams() {
  const build = (ul, key) => {
    ul.innerHTML = '';
    for (let t = 0; t < TIERS; t++) {
      const li = document.createElement('li');
      const name = state.teams ? state.teams[key][t].name : '';
      li.innerHTML = `<span class="t">${t + 1}</span><span class="nm ${!name ? 'empty' : ''}">${name ? esc(name) : '대기 중'}</span><span class="tl">${esc(state.tierNames[t])}</span>`;
      ul.appendChild(li);
    }
  };
  build($('#listA'), 'A'); build($('#listB'), 'B');
  $('#vs').classList.toggle('done', !!state.teams);
  renderSideTags();
}

function renderSideTags() {
  const a = $('#tagA'), b = $('#tagB');
  a.className = 'side-tag'; b.className = 'side-tag'; a.textContent = ''; b.textContent = '';
  if (state.sides) {
    a.classList.add(state.sides.A.toLowerCase()); a.textContent = state.sides.A;
    b.classList.add(state.sides.B.toLowerCase()); b.textContent = state.sides.B;
  }
}

function buildLadders() {
  ['#ladderA', '#ladderB'].forEach(sel => {
    const l = $(sel); l.innerHTML = '';
    for (let i = 0; i < TIERS; i++) {
      const s = document.createElement('i');
      s.style.top = (52 + i * 42 + 20) + 'px';
      l.appendChild(s);
    }
  });
}

function shuffleTeams() {
  if (state.busy || state.liveViewer) return;
  const filled = state.players.flat().filter(Boolean).length;
  if (filled === 0) return toast('플레이어를 한 명 이상 입력해주세요');
  state.busy = true; emit('app:sync');
  state.teams = null; state.map = null; state.mapLocked = false; state.sides = null;
  $('#ladderA').classList.add('on'); $('#ladderB').classList.add('on');

  // 최종 결과 미리 결정 (티어별 코인 플립 — crypto 난수)
  const flips = Array.from({length: TIERS}, () => rnd(2));
  const final = {A: [], B: []};
  for (let t = 0; t < TIERS; t++) {
    const a = flips[t], b = 1 - a;
    final.A.push({tier: t + 1, tierName: state.tierNames[t], name: nm(t, a)});
    final.B.push({tier: t + 1, tierName: state.tierNames[t], name: nm(t, b)});
  }
  // 사다리 애니메이션: 이름이 왔다갔다 하다가 윗 티어부터 순차 확정
  let tick = 0; const settled = new Array(TIERS).fill(false);
  const listA = $('#listA'), listB = $('#listB');
  const iv = setInterval(() => {
    tick++;
    const settleIdx = Math.floor(tick / 6) - 1; // 6틱(~480ms)마다 한 티어 확정
    if (settleIdx >= 0 && settleIdx < TIERS) settled[settleIdx] = true;
    const rows = [...listA.children], rowsB = [...listB.children];
    for (let t = 0; t < TIERS; t++) {
      const r = rows[t].querySelector('.nm'), rb = rowsB[t].querySelector('.nm');
      if (settled[t]) {
        r.textContent = final.A[t].name; rb.textContent = final.B[t].name;
        r.className = 'nm'; rb.className = 'nm';
      } else {
        const f = tick % 2;
        r.textContent = nm(t, f); rb.textContent = nm(t, 1 - f);
        r.className = 'nm rolling'; rb.className = 'nm rolling';
      }
    }
    if (settled.every(Boolean)) {
      clearInterval(iv);
      state.teams = final; state.busy = false; state.savedCurrent = false;
      emit('score:clear');
      $('#ladderA').classList.remove('on'); $('#ladderB').classList.remove('on');
      emit('app:refresh'); emit('app:sync');
      setStep(1);
      toast('팀 배정 완료!');
    }
  }, 80);
}

function sync() {
  const b = state.busy;
  $('#btnShuffle').disabled = b;
  $('#btnReshuffle').disabled = b || !state.teams;
  $('#btnToMap').disabled = b || !state.teams;
}

export function init() {
  renderTiers(); buildLadders(); renderTeams();

  $('#btnShuffle').addEventListener('click', shuffleTeams);
  $('#btnReshuffle').addEventListener('click', shuffleTeams);
  $('#btnToMap').addEventListener('click', () => { setStep(2); emit('app:refresh'); });
  $('#btnClearPlayers').addEventListener('click', () => {
    if (!confirm('플레이어 입력을 모두 지울까요?')) return;
    state.players = Array.from({length: TIERS}, () => ['', '']);
    save(LS.players, state.players);
    renderTiers(); invalidateTeams();
  });
  ['#nameA', '#nameB'].forEach((sel, i) => {
    const inp = $(sel); inp.value = state.teamNames[i];
    inp.addEventListener('input', () => {
      state.teamNames[i] = inp.value || (i ? 'TEAM B' : 'TEAM A');
      save(LS.teamNames, state.teamNames);
      emit('app:refresh');
    });
  });

  on('app:refresh', renderTeams);
  on('app:sync', sync);
  on('shortcut:primary', () => { if (state.step === 1) shuffleTeams(); });
  sync();
}
