-- =====================================================================
-- AI Tro Ly — Migration 0020: công cụ AI theo phòng ban (Phần C §1)
-- =====================================================================
-- Mỗi phòng ban (department_id cố định) có thể chọn tool chính riêng.
-- Giữ organizations.ai_tool (0017) làm mặc định công ty; bảng này override
-- theo phòng. Không phá B/C1. department_id khớp enum organization_members.
-- Org-scoped RLS (0008). Idempotent. Có rollback ở cuối.
-- =====================================================================

create table if not exists public.department_ai_tools (
  organization_id  uuid not null references public.organizations on delete cascade,
  department_id    text not null
                   check (department_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')),
  ai_tool          text not null default 'claude'
                   check (ai_tool in ('claude','chatgpt','gemini','copilot')),
  updated_at       timestamptz not null default now(),
  primary key (organization_id, department_id)
);

comment on table public.department_ai_tools is
  'Tool AI chính theo phòng ban; override organizations.ai_tool (Phần C §1)';

alter table public.department_ai_tools enable row level security;

-- Thành viên đọc tool phòng trong tổ chức của mình.
drop policy if exists department_ai_tools_select on public.department_ai_tools;
create policy department_ai_tools_select on public.department_ai_tools
  for select using (public.is_organization_member(organization_id));

-- Chỉ quản lý đặt/đổi tool phòng.
drop policy if exists department_ai_tools_write on public.department_ai_tools;
create policy department_ai_tools_write on public.department_ai_tools
  for all
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop policy if exists department_ai_tools_write on public.department_ai_tools;
-- drop policy if exists department_ai_tools_select on public.department_ai_tools;
-- drop table if exists public.department_ai_tools;
