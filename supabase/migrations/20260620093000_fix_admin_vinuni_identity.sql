-- =====================================================================
-- AI Tro Ly — Migration 0025: sửa auth.identity cho admin@vinuni.vn
-- =====================================================================
-- Dựa trên schema mẫu Supabase Auth: provider_id cho email identity dùng
-- chính email, và identity_data cần có cờ email_verified/phone_verified.
-- =====================================================================

do $$
declare
  target_email text := lower('admin@vinuni.vn');
  target_user_id uuid;
  target_created_at timestamptz;
  target_updated_at timestamptz;
  target_last_sign_in_at timestamptz;
begin
  select
    u.id,
    u.created_at,
    u.updated_at,
    u.last_sign_in_at
  into
    target_user_id,
    target_created_at,
    target_updated_at,
    target_last_sign_in_at
  from auth.users u
  where lower(u.email) = target_email
  limit 1;

  if target_user_id is null then
    raise exception 'Không tìm thấy auth.users cho % — hãy chạy migration seed account trước.', target_email;
  end if;

  delete from auth.identities
  where user_id = target_user_id
    and provider = 'email';

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    target_user_id,
    target_email,
    'email',
    jsonb_build_object(
      'sub', target_user_id::text,
      'email', target_email,
      'email_verified', true,
      'phone_verified', false
    ),
    target_last_sign_in_at,
    coalesce(target_created_at, now()),
    coalesce(target_updated_at, now())
  );
end;
$$;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- delete from auth.identities where user_id in (select id from auth.users where lower(email) = 'admin@vinuni.vn');
