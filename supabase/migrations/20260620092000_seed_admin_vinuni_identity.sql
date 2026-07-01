-- =====================================================================
-- AI Tro Ly — Migration 0024: bổ sung auth.identity cho admin@vinuni.vn
-- =====================================================================
-- Migrations trước đã seed auth.users + platform_admins cho email
-- admin@vinuni.vn. Supabase Auth còn cần row trong auth.identities để
-- signInWithPassword nhận diện được provider email/password hợp lệ.
-- =====================================================================

do $$
declare
  target_email text := lower('admin@vinuni.vn');
  target_user_id uuid;
begin
  select u.id
  into target_user_id
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
-- delete from auth.identities where user_id in (select id from auth.users where lower(email) = 'admin@vinuni.vn');
