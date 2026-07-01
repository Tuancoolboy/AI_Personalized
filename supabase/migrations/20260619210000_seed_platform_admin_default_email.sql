-- =====================================================================
-- AI Tro Ly — Migration 0022: cấp quyền super-admin cho tài khoản mặc định
-- =====================================================================
-- Seed platform_admins cho admin@c2-app-009.io.vn.
-- Script bootstrap-platform-admin.mjs sẽ tạo/đặt mật khẩu cho auth user này.
-- Migration chỉ gắn quyền nếu auth.users đã có email tương ứng.
-- =====================================================================

insert into public.platform_admins (user_id, note)
select u.id, 'Tài khoản mặc định hệ thống (seed theo email 0022)'
from auth.users u
where lower(u.email) = 'admin@c2-app-009.io.vn'
on conflict (user_id) do nothing;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- delete from public.platform_admins
-- where user_id in (
--   select id from auth.users where lower(email) = 'admin@c2-app-009.io.vn'
-- );
