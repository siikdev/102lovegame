---
name: new-feature
description: VAL Balance에 새 기능 모듈을 추가하는 절차. 기능 추가/확장 요청 시 이 절차를 따라 feature flag·bus·adapter 규칙을 지킨다.
---

# 새 기능(feature) 추가 절차

이 프로젝트의 기능은 전부 켜고 끌 수 있는 feature 모듈이다. 새 기능 `<id>` 를 추가할 때:

1. **모듈 생성** — `js/features/<id>.js`

   ```js
   import { on, emit } from '../core/bus.js';
   export const id = '<id>';
   export function init() {
     // DOM 바인딩·초기 렌더. 다른 feature 를 직접 import 하지 말 것.
     // 통신은 bus 이벤트(app:refresh / app:sync / history:changed ...)로.
     on('app:refresh', render);
     on('app:sync', sync);
   }
   ```

2. **플래그 등록** — `js/config/app.config.js` 의 `features` 에 `<id>: true` 추가 + 한 줄 주석.

3. **조립** — `js/main.js` 에서 import 하고 `FEATURES` 배열에 추가 (배열 순서 = init 순서).

4. **마크업** — index.html 에 전용 DOM을 추가하고 루트 요소에 `data-feature="<id>"` 를 단다 (꺼지면 자동 숨김).

5. **스타일** — `css/features/<id>.css` 생성, index.html 에 `<link>` 추가. 색·간격은 `css/base.css` 토큰만 사용.

6. **데이터** — 서버에 저장될 데이터면 adapter 인터페이스(`js/data/adapters/local.js`)에 메서드를 추가하고 http.js 스텁에도 같은 시그니처를 추가. localStorage 키는 `js/core/storage.js` 의 `LS` 에만 정의. 매치 레코드 필드 추가 시 schemaVersion 하위 호환 유지.

7. **검증** — `node --check` (`.mjs` 로 복사해서), 로컬 서버로 열어 플래그 on/off 양쪽 모두 동작 확인. CLAUDE.md 체크리스트 수행.
