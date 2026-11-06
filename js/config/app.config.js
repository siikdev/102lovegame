/* =========================================================
   app.config.js — 앱 전역 설정 · 기능 플래그
   기능을 끄려면 false 로 바꾸면 된다. main.js 가 켜진 기능만
   init 하고, 꺼진 기능의 DOM([data-feature=...])은 숨긴다.
   ========================================================= */
export const APP_CONFIG = {
  // 데이터 소스: 'local' = data/maps.json + localStorage (현재 목업)
  //            'http'  = 백엔드/외부 API (adapters/http.js — 추후 구현)
  dataSource: 'local',
  api: {
    baseUrl: '', // http adapter 사용 시 백엔드 주소
  },

  // 기능 플래그 — false 로 바꾸면 해당 기능 비활성 + DOM 숨김
  // 주의: teams/maps/sides 는 3단계 핵심 플로우라 끄면 흐름이 끊긴다.
  //       (부가 기능용 패턴: summary/history/keyboard/sessionRestore 등)
  features: {
    teams: true,          // 1단계: 티어 입력·팀 랜덤 배정
    maps: true,           // 2단계: 맵 룰렛·맵 풀
    sides: true,          // 3단계: 공수 코인토스
    summary: true,        // 매치 요약·스코어 입력·기록 저장·한판 더
    history: true,        // 매치 기록 테이블·수동 추가·JSON 내보내기
    keyboard: true,       // Space 단축키
    sessionRestore: true, // 새로고침 시 진행 중 매치 복원
  },
};
