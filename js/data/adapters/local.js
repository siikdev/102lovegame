/* local adapter — 목업용: 맵은 data/maps.json, 기록은 localStorage.
   모든 메서드는 async — http adapter 와 인터페이스 동일. */
import { LS, load, save } from '../../core/storage.js';

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
    async deleteMatch(id) {
      const h = load(LS.history, []).filter(m => m.id !== id);
      save(LS.history, h);
      return h;
    },
    async clearHistory() {
      save(LS.history, []);
      return [];
    },
  };
}
