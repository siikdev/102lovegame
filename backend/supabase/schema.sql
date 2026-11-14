-- =========================================================
-- VAL Balance — 실시간 내전 세션 스키마 (ADR-0002)
-- Supabase SQL Editor 에 통째로 붙여넣고 Run 하면 끝.
-- 보안 모델: 읽기=링크 가진 누구나 / 쓰기=host_token 아는 방장만(RPC 경유)
-- =========================================================

-- 세션: 행 1개 = 내전 세션 1개. state 에 진행 상태(JSON) 통째로.
create table public.sessions (
  id         text primary key,                      -- URL 에 들어갈 짧은 id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  host_token text not null,                         -- 방장 증명 (방장 브라우저만 보관)
  state      jsonb not null default '{}'::jsonb     -- {teams, map, mapLocked, sides, score...}
);

-- 세션에 저장된 매치 기록 (record = 프론트 레코드 schemaVersion 2 그대로)
create table public.session_matches (
  id         text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  record     jsonb not null
);

-- RLS 켜기 (★ 필수 — 없으면 전체 공개)
alter table public.sessions enable row level security;
alter table public.session_matches enable row level security;

-- 읽기: 세션 링크를 아는 누구나 (id 가 사실상 비밀값)
create policy sessions_read on public.sessions for select using (true);
create policy matches_read  on public.session_matches for select using (true);
-- 직접 INSERT/UPDATE/DELETE 정책은 없음 = 전부 거부. 쓰기는 아래 RPC 함수로만.

-- [RPC] 세션 생성 — 누구나 가능 (만든 사람이 host_token 을 생성해 보관)
create or replace function public.create_session(p_id text, p_host_token text, p_state jsonb)
returns void language sql security definer set search_path = public as $$
  insert into sessions (id, host_token, state) values (p_id, p_host_token, coalesce(p_state, '{}'::jsonb));
$$;

-- [RPC] 상태 갱신 — host_token 일치하는 방장만. 성공 여부 반환
create or replace function public.update_session_state(p_id text, p_host_token text, p_state jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update sessions set state = p_state, updated_at = now()
  where id = p_id and host_token = p_host_token;
  return found;
end $$;

-- [RPC] 매치 기록 추가/수정 — 방장만
create or replace function public.add_session_match(p_session_id text, p_host_token text, p_match_id text, p_record jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from sessions where id = p_session_id and host_token = p_host_token) then
    return false;
  end if;
  insert into session_matches (id, session_id, record) values (p_match_id, p_session_id, p_record)
  on conflict (id) do update set record = excluded.record, created_at = session_matches.created_at;
  return true;
end $$;

-- [RPC] 매치 기록 삭제 — 방장만
create or replace function public.delete_session_match(p_session_id text, p_host_token text, p_match_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from session_matches m using sessions s
  where m.id = p_match_id and m.session_id = p_session_id
    and s.id = m.session_id and s.host_token = p_host_token;
  return found;
end $$;

-- Realtime 발행: 이 두 테이블의 변경을 WebSocket 으로 중계
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_matches;
