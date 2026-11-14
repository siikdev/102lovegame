/* DOM 헬퍼 · 토스트 */
export const $  = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
/* 암호학적 난수 (Math.random 대체) — 모듈로 편향까지 제거한 0..n-1 균등 추출 */
export const rnd = n => {
  if (n <= 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % n;
};
export const esc = s => String(s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let toastT;
export const toast = m => {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 1800);
};
