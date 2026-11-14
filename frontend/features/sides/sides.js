/* feature: sides — 3단계 공수 코인토스 */
import { $, rnd } from '../../shared/dom.js';
import { state, mapById } from '../../shared/state.js';
import { persistSession } from '../../shared/session.js';
import { on, emit } from '../../shared/bus.js';

export const id = 'sides';

function renderSide() {
  $('#sideNameA').textContent = state.teamNames[0];
  $('#sideNameB').textContent = state.teamNames[1];
  const A = $('#sideA'), B = $('#sideB');
  A.className = 'side-card'; B.className = 'side-card';
  if (state.sides) {
    A.classList.add(state.sides.A.toLowerCase()); B.classList.add(state.sides.B.toLowerCase());
    $('#sideSdA').textContent = state.sides.A; $('#sideSdB').textContent = state.sides.B;
    $('#sideSkA').textContent = state.sides.A === 'ATK' ? '공격 시작' : '수비 시작';
    $('#sideSkB').textContent = state.sides.B === 'ATK' ? '공격 시작' : '수비 시작';
    const m = mapById(state.map);
    $('#sideSub').textContent = `${m ? m.ko : ''} · 1라운드 ${state.sides.A === 'ATK' ? state.teamNames[0] : state.teamNames[1]} 공격`;
  } else {
    $('#sideSdA').textContent = '—'; $('#sideSdB').textContent = '—';
    $('#sideSkA').innerHTML = '&nbsp;'; $('#sideSkB').innerHTML = '&nbsp;';
    $('#sideSub').textContent = '코인을 던져 첫 라운드 공격/수비를 랜덤으로 정합니다';
  }
}

function flipSide() {
  if (state.busy || state.liveViewer) return;
  state.busy = true; emit('app:sync');
  const aAtk = rnd(2) === 0;
  const coin = $('#coin'), inner = coin.querySelector('.inner');
  coin.classList.remove('idle');
  inner.style.transition = 'none'; inner.style.transform = 'rotateY(90deg)';
  requestAnimationFrame(() => {
    inner.style.transition = '';
    const spins = 5 + rnd(3);
    inner.style.transform = `rotateY(${spins * 360 + (aAtk ? 0 : 180)}deg)`;
  });
  setTimeout(() => {
    state.sides = aAtk ? {A: 'ATK', B: 'DEF'} : {A: 'DEF', B: 'ATK'};
    state.savedCurrent = false;
    state.busy = false;
    emit('app:refresh'); emit('app:sync');
    persistSession();
  }, 1700);
}

/* 복원 시 코인을 애니메이션 없이 결과 면으로 */
function showCoinInstant() {
  if (!state.sides) return;
  const coin = $('#coin'), inner = coin.querySelector('.inner');
  coin.classList.remove('idle');
  inner.style.transition = 'none';
  inner.style.transform = `rotateY(${state.sides.A === 'ATK' ? 0 : 180}deg)`;
  requestAnimationFrame(() => { inner.style.transition = ''; });
}

function sync() {
  const b = state.busy;
  $('#btnFlip').disabled = b || !!state.sides;
  $('#btnReflip').disabled = b || !state.sides;
}

export function init() {
  renderSide();

  $('#btnFlip').addEventListener('click', flipSide);
  $('#btnReflip').addEventListener('click', () => {
    state.sides = null;
    emit('app:refresh');
    $('#coin').classList.add('idle');
    flipSide();
  });

  on('app:refresh', renderSide);
  on('app:sync', sync);
  on('coin:reset', () => $('#coin').classList.add('idle'));
  on('session:restored', showCoinInstant);
  on('shortcut:primary', () => { if (state.step === 3 && !state.sides) flipSide(); });
  sync();
}
