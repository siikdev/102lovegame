/* 세션 복원 — 진행 중 매치(팀/맵/공수/스코어/단계)를 localStorage에 저장해
   새로고침해도 이어서 진행. APP_CONFIG.features.sessionRestore 로 on/off. */
import { LS, load, save } from './storage.js';
import { state } from './state.js';
import { $ } from './dom.js';
import { APP_CONFIG } from '../config/app.config.js';

export function persistSession() {
  if (APP_CONFIG.features.sessionRestore === false) return;
  save(LS.session, {
    teams: state.teams, map: state.map, mapLocked: state.mapLocked, sides: state.sides,
    step: state.step, savedCurrent: state.savedCurrent,
    score: [$('#scoreA')?.value ?? '', $('#scoreB')?.value ?? ''],
  });
}

/* 복원되면 세션 데이터를 반환, 없거나 꺼져 있으면 null */
export function restoreSession() {
  if (APP_CONFIG.features.sessionRestore === false) return null;
  const s = load(LS.session, null);
  if (!s || !s.teams) return null;
  state.teams = s.teams;
  state.map = s.map ?? null;
  state.mapLocked = !!s.mapLocked;
  state.sides = s.sides ?? null;
  state.savedCurrent = !!s.savedCurrent;
  return s;
}
