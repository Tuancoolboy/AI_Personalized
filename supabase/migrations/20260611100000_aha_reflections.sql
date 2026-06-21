-- =====================================================================
-- AI Tro Ly — Migration 0013: aha_reflections (Aha Moment sau bài học)
-- =====================================================================
-- Lưu phản tư ngắn sau khi đạt bài: điều vừa hiểu, nối kiến thức mới↔cũ,
-- việc sẽ thử, + phạm vi chia sẻ (riêng tư / phòng / công ty). RLS: ai
-- người nấy ghi; người cùng tổ chức đọc được bản chia sẻ theo phạm vi.
-- Idempotent cho SQL Editor reruns. Có rollback ở cuối.
-- =====================================================================

create table if not exists public.aha_reflections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  organization_id  uuid references public.organizations on delete set null,
  module_id        text not null,
  insight          text not null,
  link_prior       text,
  next_action      text,
  visibility       text not null default 'private'
                   check (visibility in ('private','department','company')),
  ai_question      text,
  created_at       timestamptz not null default now()
);

comment on table public.aha_reflections is
  'Aha Moment: phản tư ngắn sau bài học + phạm vi chia sẻ (spec §7.1, §11.4)';

create index if not exists aha_reflections_user_idx
  on public.aha_reflections (user_id, created_at desc);
create index if not exists aha_reflections_org_idx
  on public.aha_reflections (organization_id, visibility, created_at desc);

alter table public.aha_reflections enable row level security;

-- Chủ sở hữu đọc/ghi bản của mình.
drop policy if exists aha_reflections_owner_all on public.aha_reflections;
create policy aha_reflections_owner_all on public.aha_reflections
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Người cùng tổ chức đọc bản đã chia sẻ (department/company) trong tổ chức.
drop policy if exists aha_reflections_read_shared on public.aha_reflections;
create policy aha_reflections_read_shared on public.aha_reflections
  for select
  using (
    visibility in ('department','company')
    and organization_id is not null
    and public.is_organization_member(organization_id)
  );

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop policy if exists aha_reflections_read_shared on public.aha_reflections;
-- drop policy if exists aha_reflections_owner_all on public.aha_reflections;
-- drop table if exists public.aha_reflections;
