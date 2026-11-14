-- =========================================================
-- VAL Balance — 실시간 내전 세션 스키마 (ADR-0002)
-- Supabase SQL Editor 에 통째로 붙여넣고 Run. 여러 번 실행해도 안전(멱등).
-- 보안 모델: 읽기=링크 가진 누구나 / 쓰기=host_token 아는 방장만(RPC 경유)
-- =========================================================

create table if not exists public.sessions (
  id         text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  host_token text not null,
  state      jsonb not null default '{}'::jsonb
);

create table if not exists public.session_matches (
  id         text primary key,
  session_id text not null references public.sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  record     jsonb not null
);

alter table public.sessions enable row level security;
alter table public.session_matches enable row level security;

drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions for select using (true);
drop policy if exists matches_read on public.session_matches;
create policy matches_read on public.session_matches for select using (true);
-- 직접 INSERT/UPDATE/DELETE 정책 없음 = 전부 거부. 쓰기는 아래 RPC 로만.

create or replace function public.create_session(p_id text, p_host_token text, p_state jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into sessions (id, host_token, state)
  values (p_id, p_host_token, coalesce(p_state, '{}'::jsonb));
$$;

create or replace function public.update_session_state(p_id text, p_host_token text, p_state jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update sessions set state = p_state, updated_at = now()
  where id = p_id and host_token = p_host_token;
  return found;
end;
$$;

create or replace function public.add_session_match(p_session_id text, p_host_token text, p_match_id text, p_record jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from sessions where id = p_session_id and host_token = p_host_token) then
    return false;
  end if;
  insert into session_matches (id, session_id, record)
  values (p_match_id, p_session_id, p_record)
  on conflict (id) do update set record = excluded.record;
  return true;
end;
$$;

create or replace function public.delete_session_match(p_session_id text, p_host_token text, p_match_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from session_matches m using sessions s
  where m.id = p_match_id and m.session_id = p_session_id
    and s.id = m.session_id and s.host_token = p_host_token;
  return found;
end;
$$;

-- Realtime 발행 (이미 추가돼 있으면 건너뜀)
do $$
begin
  begin
    alter publication supabase_realtime add table public.sessions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.session_matches;
  exception when duplicate_object then null;
  end;
end;
$$;
