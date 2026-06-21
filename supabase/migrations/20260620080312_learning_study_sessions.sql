-- Track authenticated learning time without conflating it with time_logs
-- (time saved by AI). Each row represents one visible lesson-page session.

create table if not exists public.learning_study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  module_id         text not null,
  started_at        timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  integer not null default 0
    check (duration_seconds >= 0 and duration_seconds <= 28800)
);

create index if not exists learning_study_sessions_user_started_idx
  on public.learning_study_sessions (user_id, started_at desc);

alter table public.learning_study_sessions enable row level security;

drop policy if exists learning_study_sessions_select_own
  on public.learning_study_sessions;
create policy learning_study_sessions_select_own
  on public.learning_study_sessions
  for select using (auth.uid() = user_id);

drop policy if exists learning_study_sessions_insert_own
  on public.learning_study_sessions;
create policy learning_study_sessions_insert_own
  on public.learning_study_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists learning_study_sessions_update_own
  on public.learning_study_sessions;
create policy learning_study_sessions_update_own
  on public.learning_study_sessions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rollback:
-- drop policy if exists learning_study_sessions_update_own on public.learning_study_sessions;
-- drop policy if exists learning_study_sessions_insert_own on public.learning_study_sessions;
-- drop policy if exists learning_study_sessions_select_own on public.learning_study_sessions;
-- drop table if exists public.learning_study_sessions;
