-- =====================================================================
-- AI Tro Ly — Migration 0026: dọn bản ghi auth hỏng cho admin@vinuni.vn
-- =====================================================================
-- Seed tay trước đó đã để lại một bản ghi Auth không hợp lệ cho email này.
-- Xóa sạch auth.identities + auth.users cũ để Supabase Auth có thể tạo lại
-- đúng chuẩn bằng admin API.
-- =====================================================================

do $$
declare
  target_email text := lower('admin@vinuni.vn');
begin
  delete from auth.identities
  where user_id in (
    select id from auth.users where lower(email) = target_email
  );

  delete from auth.users
  where lower(email) = target_email;
end;
$$;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- No rollback: this migration is a cleanup step for a malformed seed.
