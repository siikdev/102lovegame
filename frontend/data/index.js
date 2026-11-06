/* data adapter 팩토리 — APP_CONFIG.dataSource 로 구현체 선택 */
import { APP_CONFIG } from '../app/app.config.js';
import { createLocalAdapter } from './adapters/local.js';
import { createHttpAdapter } from './adapters/http.js';

export const adapter = APP_CONFIG.dataSource === 'http'
  ? createHttpAdapter(APP_CONFIG.api)
  : createLocalAdapter();
