/* feature: maps — 2단계 맵 룰렛 · 맵 풀 관리 */
import { $, rnd, toast } from '../../shared/dom.js';
import { state, mapById } from '../../shared/state.js';
import { LS, save } from '../../shared/storage.js';
import { persistSession } from '../../shared/session.js';
import { setStep } from '../../app/steps.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'maps';

function renderPool() {
  const p = $('#pool'); p.innerHTML = '';
  state.maps.forEach(m => {
    const onPool = state.pool.includes(m.id);
    const b = document.createElement('button');
    b.className = 'chip ' + (onPool ? 'on' : 'off');
    b.dataset.id = m.id; b.style.setProperty('--mc', m.color);
    b.innerHTML = `<span class="ck"></span><span class="sw"></span><span class="en rj">${m.en}</span><span class="ko">${m.ko}</span>`;
    b.addEventListener('click', () => {
      if (state.busy) return;
      if (onPool && state.pool.length === 1) return toast('맵은 최소 1개 이상 남겨야 합니다');
      state.pool = onPool ? state.pool.filter(x => x !== m.id) : [...state.pool, m.id];
      save(LS.pool, state.pool);
      if (!state.pool.includes(state.map) && !state.mapLocked) { state.map = null; renderMap(); }
      renderPool(); emit('app:sync');
    });
    p.appendChild(b);
  });
  $('#poolCount').textContent = `${state.pool.length}/${state.maps.length}`;
}

function renderMap(rollingId) {
  const id = rollingId || state.map;
  const m = id ? mapById(id) : null;
  const st = $('#mapStage'), n = $('#mapName'), k = $('#mapKo');
  st.classList.toggle('locked', state.mapLocked);
  n.className = 'mname rj ' + (rollingId ? 'rolling' : state.mapLocked ? 'locked' : '');
  if (m) {
    n.textContent = m.en;
    k.textContent = m.ko + (state.mapLocked ? ' · 확정됨' : rollingId ? '' : ' · 마음에 안 들면 다시 돌리기');
    st.style.setProperty('--mapbg', m.bg);
  } else {
    n.textContent = '?';
    k.textContent = '맵 풀에서 랜덤으로 뽑습니다';
    st.style.removeProperty('--mapbg');
  }
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('hot', !!id && c.dataset.id === id));
}

function rollMap() {
  if (state.busy || state.mapLocked || state.liveViewer) return;
  if (state.pool.length === 0) return toast('맵 풀이 비어 있습니다');
  state.busy = true; emit('app:sync'); state.sides = null;
  const pool = [...state.pool];
  // 다시 돌리기 시 같은 맵 방지 (풀이 1개면 불가)
  const cand = pool.length > 1 && state.map ? pool.filter(x => x !== state.map) : pool;
  const finalId = cand[rnd(cand.length)];
  // 룰렛: 빠르게 → 느리게
  let i = 0, delay = 50, cur = rnd(pool.length);
  const steps = 14 + rnd(6);
  const tickFn = () => {
    cur = (cur + 1) % pool.length;
    const showId = i >= steps ? finalId : pool[cur];
    renderMap(showId);
    i++;
    if (i <= steps) { delay = Math.min(260, delay * 1.15); setTimeout(tickFn, delay); }
    else { state.map = finalId; state.busy = false; renderMap(); emit('app:sync'); persistSession(); }
  };
  tickFn();
}

function lockMap() {
  if (!state.map || state.busy) return;
  state.mapLocked = true;
  renderMap(); emit('app:refresh'); emit('app:sync');
  setStep(3);
  toast(`${mapById(state.map).ko} 확정!`);
}

function sync() {
  const b = state.busy;
  $('#btnRollMap').disabled = b || state.mapLocked || !!state.map;
  $('#btnRerollMap').disabled = b || state.mapLocked || !state.map;
  $('#btnLockMap').disabled = b || state.mapLocked || !state.map;
}

export function init() {
  renderPool(); renderMap();

  $('#btnRollMap').addEventListener('click', rollMap);
  $('#btnRerollMap').addEventListener('click', rollMap);
  $('#btnLockMap').addEventListener('click', lockMap);
  $('#poolAll').addEventListener('click', () => {
    state.pool = state.maps.map(m => m.id);
    save(LS.pool, state.pool); renderPool();
  });
  $('#poolActive').addEventListener('click', () => {
    state.pool = state.maps.filter(m => m.active).map(m => m.id);
    save(LS.pool, state.pool);
    if (!state.pool.includes(state.map) && !state.mapLocked) { state.map = null; renderMap(); }
    renderPool(); emit('app:sync');
  });

  on('app:refresh', () => { if (!state.busy) { renderPool(); renderMap(); } });
  on('app:sync', sync);
  on('shortcut:primary', () => { if (state.step === 2) rollMap(); });
  sync();
}
