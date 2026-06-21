-- =====================================================================
-- AI Tro Ly — Migration 0016: gamification (challenges + points + visibility)
-- =====================================================================
-- Hệ điểm đa nguồn (mục 4): điểm từ hoàn thành bài / chia sẻ / challenge.
-- Bảng tuần = lọc created_at trong tuần; bảng tổng = sum(points).
-- leaderboard_visibility: opt-in ẩn tên ở bảng cả công ty.
-- Org-scoped RLS (0008). Idempotent. Có rollback ở cuối.
-- =====================================================================

create table if not exists public.challenges (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations on delete cascade,
  module_id        text,
  title            text not null,
  description      text,
  points           int not null default 10 check (points >= 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

comment on table public.challenges is
  'Bài thử thách; org NULL = thử thách dùng chung toàn hệ thống';

-- Sổ điểm đa nguồn. ref_id trỏ tới module/challenge/aha tùy nguồn.
create table if not exists public.points_ledger (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  organization_id  uuid references public.organizations on delete set null,
  source           text not null check (source in ('lesson','share','challenge')),
  points           int not null check (points >= 0),
  ref_id           text,
  created_at       timestamptz not null default now()
);

create index if not exists points_ledger_user_idx
  on public.points_ledger (user_id, created_at desc);
create index if not exists points_ledger_org_week_idx
  on public.points_ledger (organization_id, created_at desc);

-- Opt-in ẩn tên ở bảng xếp hạng cả công ty.
create table if not exists public.leaderboard_visibility (
  user_id            uuid not null references auth.users on delete cascade,
  organization_id    uuid not null references public.organizations on delete cascade,
  hide_company_wide  boolean not null default false,
  updated_at         timestamptz not null default now(),
  primary key (user_id, organization_id)
);

alter table public.challenges enable row level security;
alter table public.points_ledger enable row level security;
alter table public.leaderboard_visibility enable row level security;

-- challenges: đọc challenge chung hoặc của tổ chức; manager ghi.
drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges
  for select using (
    organization_id is null
    or public.is_organization_member(organization_id)
  );
drop policy if exists challenges_write on public.challenges;
create policy challenges_write on public.challenges
  for all
  using (organization_id is not null and public.is_organization_manager(organization_id))
  with check (organization_id is not null and public.is_organization_manager(organization_id));

-- points_ledger: nhân viên ghi điểm của mình; người cùng tổ chức đọc (để xếp hạng).
drop policy if exists points_ledger_insert_own on public.points_ledger;
create policy points_ledger_insert_own on public.points_ledger
  for insert with check (user_id = auth.uid());
drop policy if exists points_ledger_select_org on public.points_ledger;
create policy points_ledger_select_org on public.points_ledger
  for select using (
    user_id = auth.uid()
    or (organization_id is not null and public.is_organization_member(organization_id))
  );

-- leaderboard_visibility: ai người nấy đặt; người cùng tổ chức đọc cờ để áp xếp hạng.
drop policy if exists leaderboard_visibility_owner on public.leaderboard_visibility;
create policy leaderboard_visibility_owner on public.leaderboard_visibility
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists leaderboard_visibility_read_org on public.leaderboard_visibility;
create policy leaderboard_visibility_read_org on public.leaderboard_visibility
  for select using (public.is_organization_member(organization_id));

-- =====================================================================
-- SEED challenge dùng chung (org NULL) để demo có sẵn
-- =====================================================================
insert into public.challenges (organization_id, title, description, points, is_active)
values
  (null, 'Chia sẻ 1 prompt hữu ích cho phòng', 'Đăng 1 prompt bạn thấy hiệu quả', 15, true),
  (null, 'Hoàn thành 3 bài trong tuần', 'Giữ nhịp học đều', 20, true),
  (null, 'Ghi nhật ký tiết kiệm giờ 5 ngày', 'Theo dõi tiến bộ liên tục', 25, true)
on conflict do nothing;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop policy if exists leaderboard_visibility_read_org on public.leaderboard_visibility;
-- drop policy if exists leaderboard_visibility_owner on public.leaderboard_visibility;
-- drop policy if exists points_ledger_select_org on public.points_ledger;
-- drop policy if exists points_ledger_insert_own on public.points_ledger;
-- drop policy if exists challenges_write on public.challenges;
-- drop policy if exists challenges_select on public.challenges;
-- drop table if exists public.leaderboard_visibility;
-- drop table if exists public.points_ledger;
-- drop table if exists public.challenges;
