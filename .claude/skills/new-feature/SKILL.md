---
name: new-feature
description: VAL Balance에 새 기능 모듈을 추가하는 절차. 기능 추가/확장 요청 시 이 절차를 따라 feature flag·bus·adapter 규칙을 지킨다.
---

# 새 기능(feature) 추가 절차

이 프로젝트의 기능은 전부 켜고 끌 수 있는 feature 모듈이다. 새 기능 `<id>` 를 추가할 때:

1. **폴더 생성** — `frontend/features/<id>/<id>.js` (+ 필요하면 `<id>.css` 같은 폴더에)

   ```js
   import { on, emit } from '../../shared/bus.js';
   export const id = '<id>';
   export function init() {
     // DOM 바인딩·초기 렌더. 다른 feature 를 직접 import 하지 말 것.
     // 통신은 bus 이벤트(app:refresh / app:sync / history:changed ...)로.
     on('app:refresh', render);
     on('app:sync', sync);
   }
   ```

2. **플래그 등록** — `frontend/app/app.config.js` 의 `features` 에 `<id>: true` + 한 줄 주석.

3. **조립** — `frontend/app/main.js` 에서 import 하고 `FEATURES` 배열에 추가 (배열 순서 = init 순서).

4. **마크업** — `frontend/index.html` 에 전용 DOM 추가, 루트 요소에 `data-feature="<id>"` (꺼지면 자동 숨김). CSS는 `features/<id>/<id>.css` 로 `<link>` 추가.

5. **데이터** — 저장이 필요하면 adapter 인터페이스(`frontend/data/adapters/local.js`)에 메서드 추가 + `http.js` 스텁에 같은 시그니처 + `backend/README.md` API 계약 표에 한 줄. localStorage 키는 `frontend/shared/storage.js` 의 `LS` 에만. 레코드 필드는 추가만(schemaVersion 하위 호환).

6. **문서** — `docs/ARCHITECTURE.md` 구조/흐름이 바뀌면 함께 갱신 (하네스 룰 1).

7. **검증** — `.mjs` 로 복사해 `node --check`, 로컬 서버에서 플래그 on/off 양쪽 확인, CLAUDE.md 체크리스트.
