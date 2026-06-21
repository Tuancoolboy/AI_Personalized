-- =====================================================================
-- AI Tro Ly — Migration 0009: persist register full name metadata
-- =====================================================================
-- Updates the auth.users trigger so signUp({ options.data.full_name }) flows
-- into public.profiles.full_name automatically.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  profile_name := nullif(
    trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )),
    ''
  );

  insert into public.profiles (id, full_name)
  values (new.id, profile_name)
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

update public.profiles p
set full_name = nullif(
  trim(coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    ''
  )),
  ''
)
from auth.users u
where p.id = u.id
  and (p.full_name is null or trim(p.full_name) = '')
  and nullif(
    trim(coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      ''
    )),
    ''
  ) is not null;
