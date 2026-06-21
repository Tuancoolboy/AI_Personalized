-- =====================================================================
-- AI Tro Ly — Migration 0018: nền phân tầng SaaS (RBAC 3 tầng + cô lập)
-- =====================================================================
-- Đặt nền multi-tenant chuẩn (handoff §0.2): CHỈ đặt nền, chưa làm UI super-admin.
-- - platform_admin (nhà vận hành): bảng platform_admins + is_platform_admin().
-- - account_type ('company'|'individual') trên profiles (người tự do = individual).
-- - platform_admin vượt RLS qua security-definer function (KHÔNG nới RLS user thường).
-- Idempotent. Có rollback ở cuối.
-- =====================================================================

-- Tầng nhà vận hành nền tảng (Lucas). Chưa có UI, nhưng định nghĩa quyền ngay.
create table if not exists public.platform_admins (
  user_id     uuid primary key references auth.users on delete cascade,
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.platform_admins is
  'Nhà vận hành nền tảng (platform_admin) — vượt RLS qua is_platform_admin()';

alter table public.platform_admins enable row level security;

-- Chỉ platform_admin tự đọc danh sách; ghi qua service role (server) — không policy insert.
drop policy if exists platform_admins_self_select on public.platform_admins;
create policy platform_admins_self_select on public.platform_admins
  for select using (user_id = auth.uid());

-- Hàm kiểm tra platform_admin (security definer, dùng trong policy bảng khác).
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

-- account_type: phân luồng Cá nhân vs Doanh nghiệp (handoff Phần C §4).
alter table public.profiles
  add column if not exists account_type text not null default 'company';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_account_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('company','individual'));
  end if;
end;
$$;

-- =====================================================================
-- platform_admin vượt RLS (read-only oversight) trên bảng tổ chức cốt lõi.
-- Chỉ THÊM policy SELECT bằng is_platform_admin() — KHÔNG nới quyền user thường.
-- =====================================================================
drop policy if exists organizations_select_platform_admin on public.organizations;
create policy organizations_select_platform_admin on public.organizations
  for select using (public.is_platform_admin());

drop policy if exists organization_members_select_platform_admin on public.organization_members;
create policy organization_members_select_platform_admin on public.organization_members
  for select using (public.is_platform_admin());

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop policy if exists organization_members_select_platform_admin on public.organization_members;
-- drop policy if exists organizations_select_platform_admin on public.organizations;
-- alter table public.profiles drop constraint if exists profiles_account_type_check;
-- alter table public.profiles drop column if exists account_type;
-- drop function if exists public.is_platform_admin();
-- drop policy if exists platform_admins_self_select on public.platform_admins;
-- drop table if exists public.platform_admins;
