/* DOM 헬퍼 · 토스트 */
export const $  = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const rnd = n => Math.floor(Math.random() * n);
export const esc = s => String(s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let toastT;
export const toast = m => {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 1800);
};
