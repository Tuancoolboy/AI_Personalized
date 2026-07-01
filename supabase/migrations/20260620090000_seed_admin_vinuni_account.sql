-- =====================================================================
-- AI Tro Ly — Migration 0023: seed tài khoản super-admin admin@vinuni.vn
-- =====================================================================
-- Seed idempotent cho tài khoản vận hành hệ thống mà team đang dùng để test:
--   email: admin@vinuni.vn
--   password: 12345678
--
-- Vì auth.users của project này không có unique constraint phù hợp cho upsert
-- theo email, dùng DO block để tìm user hiện có rồi update, hoặc insert mới
-- nếu chưa tồn tại.
-- =====================================================================

do $$
declare
  target_email text := lower('admin@vinuni.vn');
  password_hash constant text := '$2b$10$fnfMH.ByMiV4i0GdNvshae1tl.5pN3PhXZNH2frFm1Rgvutd.rg0u';
  target_user_id uuid;
begin
  select u.id
  into target_user_id
  from auth.users u
  where lower(u.email) = target_email
  limit 1;

  if target_user_id is null then
    insert into auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      target_email,
      password_hash,
      now(),
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb,
      now(),
      now()
    )
    returning id into target_user_id;
  else
    update auth.users
    set
      encrypted_password = password_hash,
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Super Admin"}'::jsonb,
      updated_at = now()
    where id = target_user_id;
  end if;

  insert into public.profiles (id, email, full_name)
  values (target_user_id, target_email, 'Super Admin')
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.platform_admins (user_id, note)
  values (target_user_id, 'Tài khoản vận hành hệ thống mặc định (seed 2026-06-20)')
  on conflict (user_id) do update
    set note = excluded.note;

  delete from auth.identities
  where user_id = target_user_id
    and provider = 'email';

  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    target_user_id,
    'email',
    target_user_id::text,
    jsonb_build_object('sub', target_user_id::text, 'email', target_email),
    now(),
    now(),
    now()
  );
end;
$$;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- delete from public.platform_admins where user_id in (select id from auth.users where lower(email) = 'admin@vinuni.vn');
-- delete from public.profiles where id in (select id from auth.users where lower(email) = 'admin@vinuni.vn');
-- delete from auth.users where lower(email) = 'admin@vinuni.vn';
