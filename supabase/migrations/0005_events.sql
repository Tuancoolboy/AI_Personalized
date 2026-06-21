-- Migration 0003: bảng events cho KPI tracking (BE-11)

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  event_name      text not null,
  properties_json jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists events_user_event_created_idx
  on public.events (user_id, event_name, created_at desc);

alter table public.events enable row level security;

drop policy if exists events_select_own on public.events;
create policy events_select_own on public.events
  for select using (auth.uid() = user_id);

drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events
  for insert with check (auth.uid() = user_id);

comment on table public.events is 'Sự kiện người dùng — đo KPI activation, retention, journal';
