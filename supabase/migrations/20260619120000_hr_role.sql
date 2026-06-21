-- =====================================================================
-- Migration: thêm vai trò HR (nhan-su) cho GĐ2
-- Nới ràng buộc role_id ở profiles + learning_modules để nhận 'nhan-su'.
-- =====================================================================

-- profiles.role_id
alter table public.profiles
  drop constraint if exists profiles_role_id_check;
alter table public.profiles
  add constraint profiles_role_id_check
  check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac','nhan-su'));

-- learning_modules.role_id (nếu không nới, seed bài HR sẽ lỗi CHECK)
alter table public.learning_modules
  drop constraint if exists learning_modules_role_id_check;
alter table public.learning_modules
  add constraint learning_modules_role_id_check
  check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac','nhan-su'));
