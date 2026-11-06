/* 초경량 이벤트 버스 — feature 간 직접 import 없이 통신 (순환 의존 방지, 기능 on/off 안전)
   이벤트 목록:
   - 'app:refresh'      전체 재렌더 (각 feature가 자기 영역만 다시 그림)
   - 'app:sync'         버튼 활성/비활성 동기화
   - 'history:changed'  기록 변경 → history 테이블 재렌더
   - 'score:clear'      스코어 입력 초기화 (summary 구독)
   - 'coin:reset'       코인을 idle 상태로 (sides 구독)
   - 'session:restored' 새로고침 복원 직후 (payload: 세션 데이터)
   - 'shortcut:primary' Space 단축키 (현재 단계 feature가 처리)
*/
const handlers = {};
export const on = (ev, fn) => { (handlers[ev] ??= []).push(fn); };
export const emit = (ev, data) => { (handlers[ev] || []).forEach(fn => fn(data)); };
