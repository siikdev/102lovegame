/* local adapter — 목업용: 맵은 data/maps.json, 기록은 localStorage.
   모든 메서드는 async — http adapter 와 인터페이스 동일. */
import { LS, load, save } from '../../shared/storage.js';

const MAX_HISTORY = 200;
const sortDesc = h => h.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

export function createLocalAdapter() {
  return {
    async getMaps() {
      const r = await fetch('./data/maps.json');
      if (!r.ok) throw new Error(`maps.json 로드 실패 (${r.status})`);
      return r.json();
    },
    async getHistory() {
      return load(LS.history, []);
    },
    async saveMatch(record) {
      const h = load(LS.history, []);
      h.unshift(record);
      const trimmed = sortDesc(h).slice(0, MAX_HISTORY);
      save(LS.history, trimmed);
      return trimmed;
    },
    async updateMatch(id, patch) {
      const h = load(LS.history, []);
      const i = h.findIndex(m => m.id === id);
      if (i >= 0) h[i] = {...h[i], ...patch};
      const sorted = sortDesc(h); // createdAt 변경 시 순서 유지
      save(LS.history, sorted);
      return sorted;
    },
    async deleteMatch(id) {
      const h = load(LS.history, []).filter(m => m.id !== id);
      save(LS.history, h);
      return h;
    },
    async clearHistory() {
      save(LS.history, []);
      return [];
    },
    /* JSON 내보내기 파일을 병합 가져오기 — id 중복은 건너뜀, 일시순 재정렬 */
    async importMatches(records) {
      const h = load(LS.history, []);
      const ids = new Set(h.map(m => m.id));
      let added = 0;
      for (const r of records) {
        if (!r || !r.id || ids.has(r.id)) continue;
        h.push(r); ids.add(r.id); added++;
      }
      const sorted = sortDesc(h).slice(0, MAX_HISTORY);
      save(LS.history, sorted);
      return { history: sorted, added };
    },
  };
}
