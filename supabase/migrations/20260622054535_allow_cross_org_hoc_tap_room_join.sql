-- =====================================================================
-- AI Tro Ly - Allow authenticated users to join hoc_tap rooms by code
-- =====================================================================
-- Room codes are globally unique. This migration keeps company room lists
-- scoped to the creator's organization while allowing another authenticated
-- account to preview and join a room by its exact code.
-- =====================================================================

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
        and (
          rooms.created_by_user_id = auth.uid()
          or public.is_organization_member(rooms.organization_id)
          or exists (
            select 1
            from public.hoc_tap_room_participants participants
            where participants.room_id = rooms.id
              and participants.user_id = auth.uid()
          )
        )
    );
$$;

revoke all on function public.can_access_hoc_tap_room(uuid) from public;
grant execute on function public.can_access_hoc_tap_room(uuid) to authenticated;

drop policy if exists hoc_tap_rooms_select_org on public.hoc_tap_rooms;
drop policy if exists hoc_tap_rooms_select_access on public.hoc_tap_rooms;
create policy hoc_tap_rooms_select_access on public.hoc_tap_rooms
  for select using (public.can_access_hoc_tap_room(id));

drop policy if exists hoc_tap_room_participants_select_org
  on public.hoc_tap_room_participants;
drop policy if exists hoc_tap_room_participants_select_access
  on public.hoc_tap_room_participants;
create policy hoc_tap_room_participants_select_access
  on public.hoc_tap_room_participants
  for select using (public.can_access_hoc_tap_room(room_id));

drop policy if exists hoc_tap_room_participants_update_self
  on public.hoc_tap_room_participants;
create policy hoc_tap_room_participants_update_self
  on public.hoc_tap_room_participants
  for update using (
    public.can_access_hoc_tap_room(room_id)
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
    public.can_access_hoc_tap_room(room_id)
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

drop policy if exists hoc_tap_room_answers_select_org
  on public.hoc_tap_room_answers;
drop policy if exists hoc_tap_room_answers_select_access
  on public.hoc_tap_room_answers;
create policy hoc_tap_room_answers_select_access
  on public.hoc_tap_room_answers
  for select using (public.can_access_hoc_tap_room(room_id));

drop policy if exists hoc_tap_room_answers_insert_self
  on public.hoc_tap_room_answers;
create policy hoc_tap_room_answers_insert_self
  on public.hoc_tap_room_answers
  for insert with check (
    exists (
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
begin
  if auth.uid() is null then
    return null;
  end if;

  normalized_code := upper(regexp_replace(coalesce(room_code, ''), '[^a-zA-Z0-9]', '', 'g'));

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
    select participants.id,
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
  limit 1;

  return preview;
end;
$$;

revoke all on function public.get_hoc_tap_room_preview(text) from public;
grant execute on function public.get_hoc_tap_room_preview(text) to authenticated;

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

  normalized_code := upper(regexp_replace(coalesce(room_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  normalized_name := left(coalesce(nullif(trim(player_name), ''), 'Người chơi'), 80);

  select *
  into target_room
  from public.hoc_tap_rooms rooms
  where rooms.code = normalized_code
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

revoke all on function public.join_hoc_tap_room_by_code(text, uuid, text, text)
  from public;
grant execute on function public.join_hoc_tap_room_by_code(text, uuid, text, text)
  to authenticated;

-- rollback:
-- drop function if exists public.join_hoc_tap_room_by_code(text, uuid, text, text);
-- drop function if exists public.get_hoc_tap_room_preview(text);
-- drop policy if exists hoc_tap_room_answers_select_access on public.hoc_tap_room_answers;
-- drop policy if exists hoc_tap_room_participants_update_self on public.hoc_tap_room_participants;
-- drop policy if exists hoc_tap_room_participants_select_access on public.hoc_tap_room_participants;
-- drop policy if exists hoc_tap_rooms_select_access on public.hoc_tap_rooms;
-- drop function if exists public.can_access_hoc_tap_room(uuid);
