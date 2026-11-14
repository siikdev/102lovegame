/* Supabase 클라이언트 제공자 — live-session·archive 등 여러 feature 가 공유.
   접속 정보는 app/env.js (gitignore). supabase-js 는 실제 사용 시점에 CDN 동적 로드. */
const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

let client = null;

export async function getSupabase() {
  if (client) return client;
  let env = null;
  try { env = (await import('../app/env.js')).ENV; } catch { /* env.js 없음 */ }
  if (!env?.SUPABASE_URL || !env?.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase 설정 없음 — frontend/app/env.js (env.example.js 참고)');
  }
  const { createClient } = await import(SUPABASE_ESM);
  client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);
  return client;
}
