-- =====================================================================
-- AI Tro Ly - Real Hoc Tap XP + community/company audience isolation
-- =====================================================================
-- - Personal accounts without organization_members use one shared community.
-- - Invited members use only their company organization.
-- - Quiz XP is awarded transactionally from server-graded scores.
-- - Room list/preview/join is restricted to the current audience.
-- =====================================================================

insert into public.organizations (
  name,
  slug,
  status,
  settings_json,
  created_by,
  created_at,
  updated_at
)
select
  'Cộng đồng AI Trợ Lý',
  'ai-tro-ly-community',
  'active',
  '{"hocTapMode":"community","system":true}'::jsonb,
  null,
  now(),
  now()
where not exists (
  select 1
  from public.organizations
  where slug = 'ai-tro-ly-community'
     or name in ('Cộng đồng AI Trợ Lý', 'AI Tro Ly Community')
);

update public.organizations
set name = 'Cộng đồng AI Trợ Lý',
    slug = 'ai-tro-ly-community',
    status = 'active',
    settings_json = coalesce(settings_json, '{}'::jsonb)
      || '{"hocTapMode":"community","system":true}'::jsonb,
    created_by = null,
    updated_at = now()
where slug = 'ai-tro-ly-community'
   or name in ('Cộng đồng AI Trợ Lý', 'AI Tro Ly Community');

-- Migration 0008 backfilled every legacy account into this placeholder
-- organization. It is not an accepted company invite, so remove it before
-- resolving the new Community audience. Real invited/company memberships are
-- stored in their own organizations and remain untouched.
delete from public.organization_members members
using public.organizations organizations
where members.organization_id = organizations.id
  and organizations.name = 'Tổ chức mặc định';

create or replace function public.current_hoc_tap_audience_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select members.organization_id
      from public.organization_members members
      where members.user_id = auth.uid()
      order by members.created_at
      limit 1
    ),
    (
      select organizations.id
      from public.organizations organizations
      where organizations.slug = 'ai-tro-ly-community'
      limit 1
    )
  )
  where auth.uid() is not null;
$$;

revoke all on function public.current_hoc_tap_audience_org_id() from public;
grant execute on function public.current_hoc_tap_audience_org_id()
  to authenticated;

create or replace function public.get_hoc_tap_audience()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  membership public.organization_members%rowtype;
  organization public.organizations%rowtype;
  profile_role text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select *
  into membership
  from public.organization_members members
  where members.user_id = auth.uid()
  order by members.created_at
  limit 1;

  if found then
    select *
    into organization
    from public.organizations organizations
    where organizations.id = membership.organization_id;

    return jsonb_build_object(
      'organization_id', organization.id,
      'organization_name', organization.name,
      'audience_type', 'company',
      'department_id', coalesce(membership.department_id, 'khac')
    );
  end if;

  select profiles.role_id
  into profile_role
  from public.profiles profiles
  where profiles.id = auth.uid();

  select *
  into organization
  from public.organizations organizations
  where organizations.slug = 'ai-tro-ly-community'
  limit 1;

  if organization.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'organization_id', organization.id,
    'organization_name', organization.name,
    'audience_type', 'community',
    'department_id', coalesce(profile_role, 'khac')
  );
end;
$$;

revoke all on function public.get_hoc_tap_audience() from public;
grant execute on function public.get_hoc_tap_audience() to authenticated;

alter table public.quiz_results
  add column if not exists quiz_id text,
  add column if not exists quiz_source text not null default 'learning',
  add column if not exists organization_id uuid
    references public.organizations on delete set null,
  add column if not exists attempt_id uuid,
  add column if not exists xp_earned integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.quiz_results'::regclass
      and conname = 'quiz_results_quiz_source_check'
  ) then
    alter table public.quiz_results
      add constraint quiz_results_quiz_source_check
      check (quiz_source in ('learning', 'hoc-tap'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.quiz_results'::regclass
      and conname = 'quiz_results_xp_earned_check'
  ) then
    alter table public.quiz_results
      add constraint quiz_results_xp_earned_check
      check (xp_earned >= 0);
  end if;
end;
$$;

create unique index if not exists quiz_results_user_attempt_key
  on public.quiz_results (user_id, attempt_id)
  where attempt_id is not null;

create index if not exists quiz_results_hoc_tap_scope_idx
  on public.quiz_results (
    user_id,
    organization_id,
    quiz_source,
    quiz_id,
    created_at desc
  );

drop policy if exists quiz_results_insert_own on public.quiz_results;
create policy quiz_results_insert_own on public.quiz_results
  for insert with check (
    auth.uid() = user_id
    and quiz_source = 'learning'
    and attempt_id is null
    and xp_earned = 0
  );

drop policy if exists points_ledger_insert_own on public.points_ledger;
drop policy if exists points_ledger_select_org on public.points_ledger;
drop policy if exists points_ledger_select_audience on public.points_ledger;
create policy points_ledger_select_audience on public.points_ledger
  for select using (
    user_id = auth.uid()
    or organization_id = public.current_hoc_tap_audience_org_id()
  );

create or replace function public.record_hoc_tap_quiz_attempt(
  p_user_id uuid,
  p_quiz_id text,
  p_role_id text,
  p_score integer,
  p_max_xp integer,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := p_user_id;
  audience_id uuid;
  normalized_quiz_id text := nullif(trim(p_quiz_id), '');
  normalized_role_id text := nullif(trim(p_role_id), '');
  existing_result public.quiz_results%rowtype;
  previous_best integer := 0;
  best_score integer := 0;
  previous_xp integer := 0;
  best_xp integer := 0;
  awarded_xp integer := 0;
  total_xp integer := 0;
  level_value integer := 1;
  current_level_xp integer := 0;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if normalized_quiz_id is null
    or normalized_role_id is null
    or p_score < 0
    or p_score > 100
    or p_max_xp < 0
    or p_attempt_id is null
  then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(
    (
      select members.organization_id
      from public.organization_members members
      where members.user_id = current_user_id
      order by members.created_at
      limit 1
    ),
    (
      select organizations.id
      from public.organizations organizations
      where organizations.slug = 'ai-tro-ly-community'
      limit 1
    )
  )
  into audience_id;
  if audience_id is null then
    raise exception 'AUDIENCE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      current_user_id::text || ':' || p_attempt_id::text,
      0
    )
  );

  select *
  into existing_result
  from public.quiz_results results
  where results.user_id = current_user_id
    and results.attempt_id = p_attempt_id
  limit 1;

  if found then
    select coalesce(sum(points.points), 0)::integer
    into total_xp
    from public.points_ledger points
    where points.user_id = current_user_id
      and points.organization_id = audience_id
      and points.source = 'quiz';

    level_value := floor(total_xp / 100.0)::integer + 1;
    current_level_xp := total_xp % 100;

    return jsonb_build_object(
      'score', existing_result.score,
      'passed', existing_result.passed,
      'xp_earned', 0,
      'total_xp', total_xp,
      'level', level_value,
      'current_level_xp', current_level_xp,
      'target_level_xp', 100,
      'attempt_id', existing_result.attempt_id,
      'idempotent', true
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      current_user_id::text || ':' || audience_id::text || ':' || normalized_quiz_id,
      0
    )
  );

  select coalesce(max(results.score), 0)
  into previous_best
  from public.quiz_results results
  where results.user_id = current_user_id
    and results.organization_id = audience_id
    and results.quiz_source = 'hoc-tap'
    and results.quiz_id = normalized_quiz_id;

  best_score := greatest(previous_best, p_score);
  previous_xp := round(p_max_xp * previous_best / 100.0)::integer;
  best_xp := round(p_max_xp * best_score / 100.0)::integer;
  awarded_xp := greatest(0, best_xp - previous_xp);

  insert into public.quiz_results (
    user_id,
    role_id,
    score,
    quiz_id,
    quiz_source,
    organization_id,
    attempt_id,
    xp_earned
  )
  values (
    current_user_id,
    normalized_role_id,
    p_score,
    normalized_quiz_id,
    'hoc-tap',
    audience_id,
    p_attempt_id,
    awarded_xp
  );

  if awarded_xp > 0 then
    insert into public.points_ledger (
      user_id,
      organization_id,
      source,
      points,
      ref_id
    )
    values (
      current_user_id,
      audience_id,
      'quiz',
      awarded_xp,
      p_attempt_id::text
    )
    on conflict (user_id, source, ref_id)
      where ref_id is not null
      do nothing;
  end if;

  select coalesce(sum(points.points), 0)::integer
  into total_xp
  from public.points_ledger points
  where points.user_id = current_user_id
    and points.organization_id = audience_id
    and points.source = 'quiz';

  level_value := floor(total_xp / 100.0)::integer + 1;
  current_level_xp := total_xp % 100;

  return jsonb_build_object(
    'score', p_score,
    'passed', p_score >= 70,
    'xp_earned', awarded_xp,
    'total_xp', total_xp,
    'level', level_value,
    'current_level_xp', current_level_xp,
    'target_level_xp', 100,
    'attempt_id', p_attempt_id,
    'idempotent', false
  );
end;
$$;

revoke all on function public.record_hoc_tap_quiz_attempt(
  uuid,
  text,
  text,
  integer,
  integer,
  uuid
) from public;
revoke all on function public.record_hoc_tap_quiz_attempt(
  uuid,
  text,
  text,
  integer,
  integer,
  uuid
) from anon, authenticated;
grant execute on function public.record_hoc_tap_quiz_attempt(
  uuid,
  text,
  text,
  integer,
  integer,
  uuid
) to service_role;

create or replace function public.get_hoc_tap_leaderboard()
returns table (
  user_id uuid,
  display_name text,
  department_id text,
  total_xp bigint,
  position_rank bigint,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with audience as (
    select public.current_hoc_tap_audience_org_id() as organization_id
  ),
  totals as (
    select
      points.user_id,
      sum(points.points)::bigint as total_xp
    from public.points_ledger points
    cross join audience
    where points.organization_id = audience.organization_id
      and points.source = 'quiz'
    group by points.user_id
    having sum(points.points) > 0
  ),
  ranked as (
    select
      totals.user_id,
      totals.total_xp,
      dense_rank() over (
        order by totals.total_xp desc
      ) as position_rank
    from totals
  )
  select
    ranked.user_id,
    coalesce(
      nullif(trim(profiles.full_name), ''),
      nullif(split_part(coalesce(profiles.email, ''), '@', 1), ''),
      'Người học'
    ) as display_name,
    coalesce(members.department_id, profiles.role_id, 'khac') as department_id,
    ranked.total_xp,
    ranked.position_rank,
    ranked.user_id = auth.uid() as is_current_user
  from ranked
  left join public.profiles profiles
    on profiles.id = ranked.user_id
  left join public.organization_members members
    on members.user_id = ranked.user_id
   and members.organization_id = public.current_hoc_tap_audience_org_id()
  order by ranked.position_rank, display_name;
$$;

revoke all on function public.get_hoc_tap_leaderboard() from public;
grant execute on function public.get_hoc_tap_leaderboard() to authenticated;

create or replace function public.can_access_hoc_tap_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.hoc_tap_rooms rooms
      where rooms.id = target_room_id
        and rooms.organization_id = public.current_hoc_tap_audience_org_id()
    );
$$;

revoke all on function public.can_access_hoc_tap_room(uuid) from public;
grant execute on function public.can_access_hoc_tap_room(uuid) to authenticated;

drop policy if exists hoc_tap_rooms_select_access on public.hoc_tap_rooms;
drop policy if exists hoc_tap_rooms_insert_member on public.hoc_tap_rooms;
drop policy if exists hoc_tap_rooms_update_owner on public.hoc_tap_rooms;
drop policy if exists hoc_tap_rooms_delete_owner on public.hoc_tap_rooms;

create policy hoc_tap_rooms_select_access on public.hoc_tap_rooms
  for select using (
    organization_id = public.current_hoc_tap_audience_org_id()
  );

create policy hoc_tap_rooms_insert_member on public.hoc_tap_rooms
  for insert with check (
    created_by_user_id = auth.uid()
    and organization_id = public.current_hoc_tap_audience_org_id()
  );

create policy hoc_tap_rooms_update_owner on public.hoc_tap_rooms
  for update using (
    created_by_user_id = auth.uid()
    and organization_id = public.current_hoc_tap_audience_org_id()
  )
  with check (
    created_by_user_id = auth.uid()
    and organization_id = public.current_hoc_tap_audience_org_id()
  );

create policy hoc_tap_rooms_delete_owner on public.hoc_tap_rooms
  for delete using (
    created_by_user_id = auth.uid()
    and organization_id = public.current_hoc_tap_audience_org_id()
  );

drop policy if exists hoc_tap_room_participants_select_access
  on public.hoc_tap_room_participants;
drop policy if exists hoc_tap_room_participants_insert_self
  on public.hoc_tap_room_participants;
drop policy if exists hoc_tap_room_participants_update_self
  on public.hoc_tap_room_participants;

create policy hoc_tap_room_participants_select_access
  on public.hoc_tap_room_participants
  for select using (
    organization_id = public.current_hoc_tap_audience_org_id()
    and public.can_access_hoc_tap_room(room_id)
  );

create policy hoc_tap_room_participants_insert_self
  on public.hoc_tap_room_participants
  for insert with check (
    organization_id = public.current_hoc_tap_audience_org_id()
    and public.can_access_hoc_tap_room(room_id)
    and (
      user_id = auth.uid()
      or (
        user_id is null
        and is_host
        and exists (
          select 1
          from public.hoc_tap_rooms rooms
          where rooms.id = room_id
            and rooms.created_by_user_id = auth.uid()
        )
      )
    )
  );

create policy hoc_tap_room_participants_update_self
  on public.hoc_tap_room_participants
  for update using (
    organization_id = public.current_hoc_tap_audience_org_id()
    and public.can_access_hoc_tap_room(room_id)
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
  with check (
    organization_id = public.current_hoc_tap_audience_org_id()
    and public.can_access_hoc_tap_room(room_id)
    and (
      user_id = auth.uid()
      or exists (
        select 1
        from public.hoc_tap_rooms rooms
        where rooms.id = room_id
          and rooms.created_by_user_id = auth.uid()
      )
    )
  );

drop policy if exists hoc_tap_room_answers_select_access
  on public.hoc_tap_room_answers;
drop policy if exists hoc_tap_room_answers_insert_self
  on public.hoc_tap_room_answers;

create policy hoc_tap_room_answers_select_access
  on public.hoc_tap_room_answers
  for select using (
    organization_id = public.current_hoc_tap_audience_org_id()
    and public.can_access_hoc_tap_room(room_id)
  );

create policy hoc_tap_room_answers_insert_self
  on public.hoc_tap_room_answers
  for insert with check (
    organization_id = public.current_hoc_tap_audience_org_id()
    and public.can_access_hoc_tap_room(room_id)
    and exists (
      select 1
      from public.hoc_tap_room_participants participants
      where participants.id = participant_id
        and participants.room_id = room_id
        and participants.organization_id = organization_id
        and participants.user_id = auth.uid()
    )
  );

create or replace function public.get_hoc_tap_room_preview(room_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  preview jsonb;
  audience_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  audience_id := public.current_hoc_tap_audience_org_id();
  normalized_code := upper(
    regexp_replace(coalesce(room_code, ''), '[^a-zA-Z0-9]', '', 'g')
  );

  select jsonb_build_object(
    'id', rooms.id,
    'code', rooms.code,
    'organization_id', rooms.organization_id,
    'quiz_id', rooms.quiz_id,
    'title', rooms.title,
    'category', rooms.category,
    'status', rooms.status,
    'phase', rooms.phase,
    'mode', rooms.mode,
    'room_type', rooms.room_type,
    'host_mode', rooms.host_mode,
    'locked', rooms.locked,
    'max_players', rooms.max_players,
    'current_question_index', rooms.current_question_index,
    'phase_ends_at', rooms.phase_ends_at,
    'question_ends_at', rooms.question_ends_at,
    'created_at', rooms.created_at,
    'updated_at', rooms.updated_at,
    'question_count', jsonb_array_length(rooms.questions_json),
    'participant_count', (
      select count(*)
      from public.hoc_tap_room_participants players
      where players.room_id = rooms.id
        and not players.is_host
    ),
    'host_participant_id', host.id,
    'host_name', host.display_name,
    'host_avatar_choice', host.avatar_choice,
    'host_joined_at', host.joined_at
  )
  into preview
  from public.hoc_tap_rooms rooms
  left join lateral (
    select
      participants.id,
      participants.display_name,
      participants.avatar_choice,
      participants.joined_at
    from public.hoc_tap_room_participants participants
    where participants.room_id = rooms.id
      and participants.is_host
    order by participants.joined_at
    limit 1
  ) host on true
  where rooms.code = normalized_code
    and rooms.organization_id = audience_id
  limit 1;

  return preview;
end;
$$;

revoke all on function public.get_hoc_tap_room_preview(text) from public;
grant execute on function public.get_hoc_tap_room_preview(text)
  to authenticated;

create or replace function public.join_hoc_tap_room_by_code(
  room_code text,
  requested_participant_id uuid,
  player_name text,
  player_avatar_choice text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  audience_id uuid;
  target_room public.hoc_tap_rooms%rowtype;
  existing_participant public.hoc_tap_room_participants%rowtype;
  participant_id uuid;
  normalized_name text;
  player_count integer;
  now_at timestamptz := now();
begin
  if auth.uid() is null then
    return jsonb_build_object('error_code', 'FORBIDDEN');
  end if;

  audience_id := public.current_hoc_tap_audience_org_id();
  normalized_code := upper(
    regexp_replace(coalesce(room_code, ''), '[^a-zA-Z0-9]', '', 'g')
  );
  normalized_name := left(
    coalesce(nullif(trim(player_name), ''), 'Người chơi'),
    80
  );

  select *
  into target_room
  from public.hoc_tap_rooms rooms
  where rooms.code = normalized_code
    and rooms.organization_id = audience_id
  for update;

  if not found then
    return jsonb_build_object('error_code', 'ROOM_NOT_FOUND');
  end if;

  if target_room.status = 'finished' then
    return jsonb_build_object('error_code', 'ROOM_FINISHED');
  end if;

  select *
  into existing_participant
  from public.hoc_tap_room_participants participants
  where participants.room_id = target_room.id
    and participants.user_id = auth.uid()
  limit 1;

  if found then
    update public.hoc_tap_room_participants
    set display_name = normalized_name,
        avatar_choice = nullif(trim(player_avatar_choice), ''),
        last_seen_at = now_at,
        updated_at = now_at
    where id = existing_participant.id;

    return jsonb_build_object(
      'room_id', target_room.id,
      'organization_id', target_room.organization_id,
      'participant_id', existing_participant.id
    );
  end if;

  select count(*)
  into player_count
  from public.hoc_tap_room_participants participants
  where participants.room_id = target_room.id
    and not participants.is_host;

  if player_count >= target_room.max_players then
    return jsonb_build_object('error_code', 'ROOM_FULL');
  end if;

  participant_id := coalesce(requested_participant_id, gen_random_uuid());

  insert into public.hoc_tap_room_participants (
    id,
    room_id,
    organization_id,
    user_id,
    display_name,
    avatar_choice,
    score,
    is_host,
    joined_at,
    last_seen_at,
    created_at,
    updated_at
  )
  values (
    participant_id,
    target_room.id,
    target_room.organization_id,
    auth.uid(),
    normalized_name,
    nullif(trim(player_avatar_choice), ''),
    0,
    false,
    now_at,
    now_at,
    now_at,
    now_at
  );

  update public.hoc_tap_rooms
  set last_activity_at = now_at,
      updated_at = now_at
  where id = target_room.id;

  return jsonb_build_object(
    'room_id', target_room.id,
    'organization_id', target_room.organization_id,
    'participant_id', participant_id
  );
end;
$$;

revoke all on function public.join_hoc_tap_room_by_code(
  text,
  uuid,
  text,
  text
) from public;
grant execute on function public.join_hoc_tap_room_by_code(
  text,
  uuid,
  text,
  text
) to authenticated;

-- rollback:
-- Drop the functions/policies above and remove the new quiz_results columns
-- only after confirming no production XP data needs to be preserved.
