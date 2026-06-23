alter table public.hoc_tap_rooms
  add column if not exists map_theme text not null default 'classic';

alter table public.hoc_tap_rooms
  drop constraint if exists hoc_tap_rooms_map_theme_check;

alter table public.hoc_tap_rooms
  add constraint hoc_tap_rooms_map_theme_check
  check (map_theme in ('classic', 'duck-race'));

update public.hoc_tap_rooms
set map_theme = 'classic'
where map_theme is null
   or map_theme not in ('classic', 'duck-race');

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

-- rollback:
-- alter table public.hoc_tap_rooms drop constraint if exists hoc_tap_rooms_map_theme_check;
-- alter table public.hoc_tap_rooms drop column if exists map_theme;
