/* 공유 상태 — JSON 직렬화 가능하게 유지 (추후 DB/API 연동 대비) */
import { LS, load } from './storage.js';

export const TIERS = 5;

export const state = {
  step: 1,
  players:   load(LS.players,   Array.from({length: TIERS}, () => ['', ''])),
  tierNames: load(LS.tierNames, Array.from({length: TIERS}, (_, i) => `밸런스 ${i + 1}`)),
  teamNames: load(LS.teamNames, ['TEAM A', 'TEAM B']),
  pool:      load(LS.pool, null), // maps 로드 후 main.js 에서 기본값(active 맵) 채움
  maps: [],          // data adapter 로 로드
  teams: null,       // {A:[{tier,tierName,name}], B:[...]}
  map: null,         // map id
  mapLocked: false,
  sides: null,       // {A:'ATK'|'DEF', B:...}
  history: [],
  busy: false,
  savedCurrent: false, // 현재 매치가 이미 기록 저장됐는지 (중복 저장 방지)
};

export const mapById = id => state.maps.find(m => m.id === id);
