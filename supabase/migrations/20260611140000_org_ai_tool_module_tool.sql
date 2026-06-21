-- =====================================================================
-- AI Tro Ly — Migration 0017: tool AI chính (org) + tool chuyên dụng (bài)
-- =====================================================================
-- organizations.ai_tool: tool chính công ty chọn (mục 3). Chỉ quản lý đổi.
-- learning_modules.tool: tool chuyên dụng override theo bài (nullable).
-- Idempotent. Có rollback ở cuối.
-- =====================================================================

alter table public.organizations
  add column if not exists ai_tool text not null default 'claude';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_ai_tool_check'
  ) then
    alter table public.organizations
      add constraint organizations_ai_tool_check
      check (ai_tool in ('claude','chatgpt','gemini','copilot'));
  end if;
end;
$$;

-- Tool chuyên dụng theo bài (override tool chính). NULL = dùng tool chính.
alter table public.learning_modules
  add column if not exists tool text;

-- Quản lý tổ chức được cập nhật organizations (vd ai_tool). Bổ sung policy UPDATE
-- (0008 mới có SELECT cho member).
drop policy if exists organizations_update_manager on public.organizations;
create policy organizations_update_manager on public.organizations
  for update
  using (public.is_organization_manager(id))
  with check (public.is_organization_manager(id));

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop policy if exists organizations_update_manager on public.organizations;
-- alter table public.learning_modules drop column if exists tool;
-- alter table public.organizations drop constraint if exists organizations_ai_tool_check;
-- alter table public.organizations drop column if exists ai_tool;
