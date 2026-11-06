/* feature: keyboard — Space = 현재 단계의 랜덤 액션 (입력 중이 아닐 때) */
import { emit } from '../core/bus.js';

export const id = 'keyboard';

export function init() {
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.target.matches('input,textarea,select,button')) return;
    e.preventDefault();
    emit('shortcut:primary');
  });
}
