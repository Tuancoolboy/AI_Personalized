-- Keep team-room departure and start-lock behavior tenant scoped.

drop policy if exists hoc_tap_room_participants_delete_self
  on public.hoc_tap_room_participants;

create policy hoc_tap_room_participants_delete_self
  on public.hoc_tap_room_participants
  for delete using (
    organization_id = public.current_hoc_tap_audience_org_id()
    and user_id = auth.uid()
  );

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
    and (not participants.is_host or target_room.host_mode = 'human');

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
-- drop policy if exists hoc_tap_room_participants_delete_self
--   on public.hoc_tap_room_participants;
-- Reapply the join_hoc_tap_room_by_code definition from
-- 20260623133848_hoc_tap_human_host_player.sql to restore the old join rule.
