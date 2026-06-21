-- =====================================================================
-- AI Tro Ly — Migration 0010: persist register phone number metadata
-- =====================================================================
-- Adds profiles.phone_number and updates the auth.users trigger so
-- signUp({ options.data.phone_number }) flows into public.profiles.
-- =====================================================================

alter table public.profiles
  add column if not exists phone_number text;

comment on column public.profiles.phone_number is
  'Số điện thoại nhân viên nhập khi đăng ký';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
  profile_phone text;
begin
  profile_name := nullif(
    trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )),
    ''
  );

  profile_phone := nullif(
    trim(coalesce(
      new.raw_user_meta_data ->> 'phone_number',
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'phoneNumber',
      ''
    )),
    ''
  );

  insert into public.profiles (id, full_name, phone_number)
  values (new.id, profile_name, profile_phone)
  on conflict (id) do update
    set
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);

  return new;
end;
$$;

update public.profiles p
set phone_number = nullif(
  trim(coalesce(
    u.raw_user_meta_data ->> 'phone_number',
    u.raw_user_meta_data ->> 'phone',
    u.raw_user_meta_data ->> 'phoneNumber',
    ''
  )),
  ''
)
from auth.users u
where p.id = u.id
  and (p.phone_number is null or trim(p.phone_number) = '')
  and nullif(
    trim(coalesce(
      u.raw_user_meta_data ->> 'phone_number',
      u.raw_user_meta_data ->> 'phone',
      u.raw_user_meta_data ->> 'phoneNumber',
      ''
    )),
    ''
  ) is not null;
