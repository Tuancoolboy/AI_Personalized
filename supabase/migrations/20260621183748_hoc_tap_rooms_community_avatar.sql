-- =====================================================================
-- AI Tro Ly — Hardening hoc_tap rooms + community leaderboard constraints
-- =====================================================================
-- Adds durable company-scoped quiz room tables and expands points_ledger
-- so leaderboard XP can be backfilled and awarded idempotently from real
-- learning data.
-- =====================================================================

create table if not exists public.hoc_tap_rooms (
  id                      uuid primary key default gen_random_uuid(),
  code                    text not null,
  organization_id         uuid not null references public.organizations on delete cascade,
  created_by_user_id      uuid not null references auth.users on delete cascade,
  quiz_id                 text not null,
  title                   text not null,
  category                text not null,
  status                  text not null default 'waiting'
                          check (status in ('waiting', 'playing', 'finished')),
  phase                   text not null default 'waiting'
                          check (phase in ('waiting', 'question', 'reveal', 'leaderboard', 'finished')),
  mode                    text not null default 'classic'
                          check (mode in ('classic', 'team-battle')),
  room_type               text not null default 'host-review'
                          check (room_type in ('host-review', 'ai-secret')),
  host_mode               text not null default 'human'
                          check (host_mode in ('human', 'system')),
  locked                  boolean not null default false,
  max_players             integer not null default 20
                          check (max_players between 2 and 50),
  questions_json          jsonb not null default '[]'::jsonb,
  current_question_index  integer not null default 0 check (current_question_index >= 0),
  phase_ends_at           timestamptz,
  question_ends_at        timestamptz,
  last_activity_at        timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index if not exists hoc_tap_rooms_org_code_key
  on public.hoc_tap_rooms (organization_id, code);

create unique index if not exists hoc_tap_rooms_code_key
  on public.hoc_tap_rooms (code);

create table if not exists public.hoc_tap_room_participants (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.hoc_tap_rooms on delete cascade,
  organization_id   uuid not null references public.organizations on delete cascade,
  user_id           uuid references auth.users on delete cascade,
  display_name      text not null,
  avatar_choice     text,
  score             integer not null default 0 check (score >= 0),
  is_host           boolean not null default false,
  joined_at         timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists hoc_tap_room_participants_room_user_key
  on public.hoc_tap_room_participants (room_id, user_id)
  where user_id is not null;

create index if not exists hoc_tap_room_participants_room_joined_idx
  on public.hoc_tap_room_participants (room_id, joined_at);

create table if not exists public.hoc_tap_room_answers (
  id                uuid primary key default gen_random_uuid(),
  room_id           uuid not null references public.hoc_tap_rooms on delete cascade,
  participant_id    uuid not null references public.hoc_tap_room_participants on delete cascade,
  organization_id   uuid not null references public.organizations on delete cascade,
  question_index    integer not null check (question_index >= 0),
  answer_index      integer not null check (answer_index >= 0),
  is_correct        boolean not null,
  points            integer not null default 0 check (points >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists hoc_tap_room_answers_room_participant_question_key
  on public.hoc_tap_room_answers (room_id, participant_id, question_index);

create index if not exists hoc_tap_room_answers_room_question_idx
  on public.hoc_tap_room_answers (room_id, question_index);

alter table public.hoc_tap_rooms enable row level security;
alter table public.hoc_tap_room_participants enable row level security;
alter table public.hoc_tap_room_answers enable row level security;

drop policy if exists hoc_tap_rooms_select_org on public.hoc_tap_rooms;
create policy hoc_tap_rooms_select_org on public.hoc_tap_rooms
  for select using (public.is_organization_member(organization_id));

drop policy if exists hoc_tap_rooms_insert_member on public.hoc_tap_rooms;
create policy hoc_tap_rooms_insert_member on public.hoc_tap_rooms
  for insert with check (
    created_by_user_id = auth.uid()
    and public.is_organization_member(organization_id)
  );

drop policy if exists hoc_tap_rooms_update_owner on public.hoc_tap_rooms;
create policy hoc_tap_rooms_update_owner on public.hoc_tap_rooms
  for update using (
    created_by_user_id = auth.uid()
    and public.is_organization_member(organization_id)
  )
  with check (
    public.is_organization_member(organization_id)
  );

drop policy if exists hoc_tap_rooms_delete_owner on public.hoc_tap_rooms;
create policy hoc_tap_rooms_delete_owner on public.hoc_tap_rooms
  for delete using (
    created_by_user_id = auth.uid()
    and public.is_organization_member(organization_id)
  );

drop policy if exists hoc_tap_room_participants_select_org on public.hoc_tap_room_participants;
create policy hoc_tap_room_participants_select_org on public.hoc_tap_room_participants
  for select using (public.is_organization_member(organization_id));

drop policy if exists hoc_tap_room_participants_insert_self on public.hoc_tap_room_participants;
create policy hoc_tap_room_participants_insert_self on public.hoc_tap_room_participants
  for insert with check (
    public.is_organization_member(organization_id)
    and (
      user_id = auth.uid()
      or user_id is null
    )
  );

drop policy if exists hoc_tap_room_participants_update_self on public.hoc_tap_room_participants;
create policy hoc_tap_room_participants_update_self on public.hoc_tap_room_participants
  for update using (
    public.is_organization_member(organization_id)
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.hoc_tap_rooms rooms
        where rooms.id = room_id
          and rooms.created_by_user_id = auth.uid()
      )
    )
  )
  with check (public.is_organization_member(organization_id));

drop policy if exists hoc_tap_room_answers_select_org on public.hoc_tap_room_answers;
create policy hoc_tap_room_answers_select_org on public.hoc_tap_room_answers
  for select using (public.is_organization_member(organization_id));

drop policy if exists hoc_tap_room_answers_insert_self on public.hoc_tap_room_answers;
create policy hoc_tap_room_answers_insert_self on public.hoc_tap_room_answers
  for insert with check (
    public.is_organization_member(organization_id)
    and exists (
      select 1
      from public.hoc_tap_room_participants participants
      where participants.id = participant_id
        and participants.room_id = room_id
        and participants.user_id = auth.uid()
    )
  );

-- Expand points_ledger source options and make ref-based awards idempotent.
do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.points_ledger'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%source%';

  if constraint_name is not null then
    execute format(
      'alter table public.points_ledger drop constraint if exists %I',
      constraint_name
    );
  end if;
end;
$$;

alter table public.points_ledger
  add constraint points_ledger_source_check
  check (source in ('lesson', 'share', 'challenge', 'quiz'));

create unique index if not exists points_ledger_user_source_ref_key
  on public.points_ledger (user_id, source, ref_id)
  where ref_id is not null;

-- rollback:
-- drop index if exists points_ledger_user_source_ref_key;
-- alter table public.points_ledger drop constraint if exists points_ledger_source_check;
-- create table rollback intentionally omitted for legacy points_ledger constraint;
-- drop policy if exists hoc_tap_room_answers_insert_self on public.hoc_tap_room_answers;
-- drop policy if exists hoc_tap_room_answers_select_org on public.hoc_tap_room_answers;
-- drop policy if exists hoc_tap_room_participants_update_self on public.hoc_tap_room_participants;
-- drop policy if exists hoc_tap_room_participants_insert_self on public.hoc_tap_room_participants;
-- drop policy if exists hoc_tap_room_participants_select_org on public.hoc_tap_room_participants;
-- drop policy if exists hoc_tap_rooms_delete_owner on public.hoc_tap_rooms;
-- drop policy if exists hoc_tap_rooms_update_owner on public.hoc_tap_rooms;
-- drop policy if exists hoc_tap_rooms_insert_member on public.hoc_tap_rooms;
-- drop policy if exists hoc_tap_rooms_select_org on public.hoc_tap_rooms;
-- drop table if exists public.hoc_tap_room_answers;
-- drop table if exists public.hoc_tap_room_participants;
-- drop table if exists public.hoc_tap_rooms;
