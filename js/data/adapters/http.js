/* http adapter — 추후 백엔드 서버 / 외부 API / MCP 연동 지점.
   local.js 와 동일한 인터페이스를 유지할 것:
   getMaps() / getHistory() / saveMatch(record) / deleteMatch(id) / clearHistory()
   레코드 스키마는 schemaVersion 필드로 버전 관리. */
export function createHttpAdapter({ baseUrl }) {
  const notReady = () => {
    throw new Error('http adapter 미구현 — app.config.js 의 dataSource 를 "local" 로 두세요');
  };
  // 구현 예시 (백엔드 준비 후):
  // async getHistory(){ const r = await fetch(`${baseUrl}/matches`); return r.json(); }
  return {
    getMaps: notReady,
    getHistory: notReady,
    saveMatch: notReady,
    deleteMatch: notReady,
    clearHistory: notReady,
  };
}
