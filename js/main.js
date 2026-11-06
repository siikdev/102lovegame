/* =========================================================
   main.js — 엔트리. 설정을 읽어 켜진 기능만 조립한다.
   새 기능 추가 절차는 .claude/skills/new-feature/SKILL.md 참고.
   ========================================================= */
import { APP_CONFIG } from './config/app.config.js';
import { state } from './core/state.js';
import { $, toast } from './core/dom.js';
import { emit } from './core/bus.js';
import { adapter } from './data/index.js';
import { restoreSession } from './core/session.js';
import { setStep, initNav } from './app/steps.js';

import * as teams from './features/teams.js';
import * as maps from './features/maps.js';
import * as sides from './features/sides.js';
import * as summary from './features/summary.js';
import * as history from './features/history.js';
import * as keyboard from './features/keyboard.js';

const FEATURES = [teams, maps, sides, summary, history, keyboard];
const enabled = f => APP_CONFIG.features[f.id] !== false;

async function boot() {
  // 꺼진 기능의 DOM 숨김
  for (const f of FEATURES) {
    if (!enabled(f)) {
      document.querySelectorAll(`[data-feature="${f.id}"]`).forEach(el => { el.hidden = true; });
    }
  }

  // 맵 데이터 로드 (adapter 경유 — 추후 API/백엔드로 교체 가능)
  try {
    state.maps = await adapter.getMaps();
  } catch (e) {
    console.error(e);
    toast('맵 데이터를 불러오지 못했습니다 — 로컬 서버로 열었는지 확인하세요');
    return;
  }

  // 맵 풀 기본값/정합성 (저장된 풀에 없어진 맵이 있으면 제거)
  if (!Array.isArray(state.pool)) state.pool = state.maps.filter(m => m.active).map(m => m.id);
  state.pool = state.pool.filter(pid => state.maps.some(m => m.id === pid));
  if (!state.pool.length) state.pool = state.maps.map(m => m.id);

  // 새로고침 복원 (feature 렌더 전에 state 복구)
  const restored = restoreSession();

  initNav();
  for (const f of FEATURES) {
    if (enabled(f)) await f.init();
  }

  // 헤더 공통: 새 매치 (팀까지 초기화, 플레이어 입력은 유지)
  $('#btnReset').addEventListener('click', () => {
    if (state.busy) return;
    state.teams = null; state.map = null; state.mapLocked = false; state.sides = null;
    state.savedCurrent = false;
    emit('score:clear'); emit('coin:reset'); emit('app:refresh'); emit('app:sync');
    setStep(1);
    toast('새 매치 시작 (플레이어 입력은 유지)');
  });

  if (restored) emit('session:restored', restored);
  emit('app:refresh'); emit('app:sync');

  // 복원된 단계로 이동 (가드: 팀 없으면 1, 맵 미확정이면 최대 2)
  let st = (restored && restored.step) || 1;
  if (st === 3 && !state.mapLocked) st = state.teams ? 2 : 1;
  if (st === 2 && !state.teams) st = 1;
  setStep(st);
}

boot();
