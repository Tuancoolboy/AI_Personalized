-- =====================================================================
-- Migration 0013: email column in profiles + invite link expiry
-- =====================================================================
-- Fixes:
--   CRITICAL: adds profiles.email so manager team API can look up users
--             by email without scanning all auth.users via listUsers loop.
--   HIGH:     adds expires_at, max_uses, and used_count to invite links
--             so tokens can be time-bounded and single-use.
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. profiles.email — synced from auth.users
-- -----------------------------------------------------------------------

alter table public.profiles
  add column if not exists email text;

-- Backfill existing users (service-role context only; security definer
-- function has access to auth.users).
do $$
begin
  update public.profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id
    and p.email is null
    and u.email is not null;
end;
$$;

-- Unique index on non-null email to enable O(1) lookup.
create unique index if not exists profiles_email_idx
  on public.profiles (email)
  where email is not null;

-- -----------------------------------------------------------------------
-- 2. Update handle_new_user trigger to capture email at register
-- -----------------------------------------------------------------------

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

  insert into public.profiles (id, email, full_name, phone_number)
  values (new.id, new.email, profile_name, profile_phone)
  on conflict (id) do update
    set
      email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      phone_number = coalesce(public.profiles.phone_number, excluded.phone_number);
  return new;
end;
$$;

-- -----------------------------------------------------------------------
-- 3. Sync email when auth.users.email is updated (e.g. Google OAuth link)
-- -----------------------------------------------------------------------

create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id
    and (email is null or email <> new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_user_email_updated();

-- -----------------------------------------------------------------------
-- 4. Invite link expiry and usage cap
-- -----------------------------------------------------------------------

alter table public.organization_invite_links
  add column if not exists expires_at  timestamptz,
  add column if not exists max_uses    int check (max_uses > 0),
  add column if not exists used_count  int not null default 0;

comment on column public.organization_invite_links.expires_at is
  'Optional expiry timestamp; NULL means the link never expires';
comment on column public.organization_invite_links.max_uses is
  'Optional maximum accept count; NULL means unlimited';
comment on column public.organization_invite_links.used_count is
  'Number of successful join accepts recorded against this token';

-- -----------------------------------------------------------------------
-- 5. Atomic used_count increment (avoids race condition on concurrent accepts)
-- -----------------------------------------------------------------------

create or replace function public.increment_invite_used_count(link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.organization_invite_links
  set used_count  = used_count + 1,
      last_used_at = now(),
      updated_at   = now()
  where id = link_id;
$$;

-- Only callable server-side (service role); no grant to anon/authenticated.
