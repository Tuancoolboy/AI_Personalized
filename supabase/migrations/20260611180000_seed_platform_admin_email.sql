-- =====================================================================
-- AI Tro Ly — Migration 0021: cấp quyền super-admin theo EMAIL
-- =====================================================================
-- Seed platform_admins cho lucas.ai.vn@gmail.com (nhà vận hành — Lucas).
-- KHÔNG nhúng mật khẩu: user tự đăng ký mật khẩu qua màn Đăng ký; migration
-- chỉ tra auth.users theo email rồi gắn quyền. Idempotent. Có rollback.
-- Nếu email chưa đăng ký lúc chạy migration → không insert (chạy lại sau khi
-- đã đăng ký, hoặc dùng khối DO ở dưới bất cứ lúc nào).
-- =====================================================================

insert into public.platform_admins (user_id, note)
select u.id, 'Nhà vận hành nền tảng (seed theo email 0021)'
from auth.users u
where lower(u.email) = 'lucas.ai.vn@gmail.com'
on conflict (user_id) do nothing;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- delete from public.platform_admins
-- where user_id in (
--   select id from auth.users where lower(email) = 'lucas.ai.vn@gmail.com'
-- );
