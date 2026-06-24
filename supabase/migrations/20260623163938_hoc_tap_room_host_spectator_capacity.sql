-- Treat human hosts as spectators for room capacity and join previews.

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
    'map_theme', rooms.map_theme,
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

  if target_room.status <> 'waiting' then
    return jsonb_build_object('error_code', 'ROOM_LOCKED');
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

-- ROLLBACK:
-- Reapply the get_hoc_tap_room_preview and join_hoc_tap_room_by_code
-- definitions from 20260623145414_hoc_tap_room_leave_and_start_lock.sql.
