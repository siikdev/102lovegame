/* 단계 내비게이션 — feature 를 import 하지 않음 (순환 의존 방지) */
import { $$, toast } from '../core/dom.js';
import { state } from '../core/state.js';
import { persistSession } from '../core/session.js';

export function setStep(n) {
  state.step = n;
  $$('section.step').forEach(s => s.classList.toggle('show', s.id === 'step' + n));
  $$('#nav .tab').forEach(t => {
    const s = +t.dataset.step;
    t.classList.toggle('active', s === n);
    const done = (s === 1 && state.teams) || (s === 2 && state.mapLocked) || (s === 3 && state.sides);
    t.classList.toggle('done', !!done && s !== n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  persistSession();
}

export function initNav() {
  $$('#nav .tab').forEach(t => t.addEventListener('click', () => {
    const s = +t.dataset.step;
    if (s === 2 && !state.teams) return toast('먼저 팀을 섞어주세요');
    if (s === 3 && !state.mapLocked) return toast('먼저 맵을 확정해주세요');
    setStep(s);
  }));
}
