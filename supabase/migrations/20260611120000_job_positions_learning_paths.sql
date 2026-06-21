-- =====================================================================
-- AI Tro Ly — Migration 0015: vị trí công việc + lộ trình theo kỹ năng
-- =====================================================================
-- Builder của quản lý (mục 3): chọn vị trí chính → tick kỹ năng → AI gợi ý
-- lộ trình (Nền tảng + module theo kỹ năng) → chỉnh → gán. Bảng org-scoped,
-- RLS qua is_organization_member/is_organization_manager (0008).
-- Idempotent. Có rollback ở cuối.
-- =====================================================================

-- Vị trí công ty tự định nghĩa (khác department cố định 5 nhóm).
create table if not exists public.job_positions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations on delete cascade,
  name             text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (organization_id, name)
);

-- Kỹ năng mong muốn của một vị trí (n–n với skills 0014).
create table if not exists public.position_skills (
  position_id  uuid not null references public.job_positions on delete cascade,
  skill_id     uuid not null references public.skills on delete cascade,
  primary key (position_id, skill_id)
);

-- 1 vị trí chính (is_primary=true) + nhiều phụ cho mỗi nhân viên.
create table if not exists public.member_positions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  organization_id  uuid not null references public.organizations on delete cascade,
  position_id      uuid not null references public.job_positions on delete cascade,
  is_primary       boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (user_id, position_id)
);
-- Chỉ một vị trí chính / nhân viên / tổ chức.
create unique index if not exists member_positions_primary_uidx
  on public.member_positions (user_id, organization_id)
  where is_primary;

-- Lộ trình ráp được (Nền tảng + module theo kỹ năng).
create table if not exists public.learning_paths (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations on delete cascade,
  position_id      uuid references public.job_positions on delete set null,
  name             text not null,
  version          int not null default 1,
  created_by       uuid references auth.users on delete set null,
  created_at       timestamptz not null default now()
);

create table if not exists public.path_modules (
  path_id     uuid not null references public.learning_paths on delete cascade,
  module_id   text not null,
  sort_order  int not null default 0,
  primary key (path_id, module_id)
);

-- Gán lộ trình cho nhân viên.
create table if not exists public.path_assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  path_id      uuid not null references public.learning_paths on delete cascade,
  assigned_by  uuid references auth.users on delete set null,
  assigned_at  timestamptz not null default now(),
  unique (user_id, path_id)
);

create index if not exists member_positions_user_idx on public.member_positions (user_id);
create index if not exists path_assignments_user_idx on public.path_assignments (user_id);
create index if not exists learning_paths_org_idx on public.learning_paths (organization_id);

-- RLS
alter table public.job_positions enable row level security;
alter table public.position_skills enable row level security;
alter table public.member_positions enable row level security;
alter table public.learning_paths enable row level security;
alter table public.path_modules enable row level security;
alter table public.path_assignments enable row level security;

-- job_positions: member đọc, manager ghi.
drop policy if exists job_positions_select on public.job_positions;
create policy job_positions_select on public.job_positions
  for select using (public.is_organization_member(organization_id));
drop policy if exists job_positions_write on public.job_positions;
create policy job_positions_write on public.job_positions
  for all
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

-- position_skills: đọc theo vị trí trong tổ chức; ghi bởi manager.
drop policy if exists position_skills_select on public.position_skills;
create policy position_skills_select on public.position_skills
  for select using (
    exists (
      select 1 from public.job_positions jp
      where jp.id = position_id and public.is_organization_member(jp.organization_id)
    )
  );
drop policy if exists position_skills_write on public.position_skills;
create policy position_skills_write on public.position_skills
  for all
  using (
    exists (
      select 1 from public.job_positions jp
      where jp.id = position_id and public.is_organization_manager(jp.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.job_positions jp
      where jp.id = position_id and public.is_organization_manager(jp.organization_id)
    )
  );

-- member_positions: nhân viên đọc của mình; manager đọc/ghi cả tổ chức.
drop policy if exists member_positions_select on public.member_positions;
create policy member_positions_select on public.member_positions
  for select using (
    user_id = auth.uid() or public.is_organization_manager(organization_id)
  );
drop policy if exists member_positions_write on public.member_positions;
create policy member_positions_write on public.member_positions
  for all
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

-- learning_paths: member đọc, manager ghi.
drop policy if exists learning_paths_select on public.learning_paths;
create policy learning_paths_select on public.learning_paths
  for select using (public.is_organization_member(organization_id));
drop policy if exists learning_paths_write on public.learning_paths;
create policy learning_paths_write on public.learning_paths
  for all
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

-- path_modules: theo lộ trình.
drop policy if exists path_modules_select on public.path_modules;
create policy path_modules_select on public.path_modules
  for select using (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id and public.is_organization_member(lp.organization_id)
    )
  );
drop policy if exists path_modules_write on public.path_modules;
create policy path_modules_write on public.path_modules
  for all
  using (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id and public.is_organization_manager(lp.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id and public.is_organization_manager(lp.organization_id)
    )
  );

-- path_assignments: nhân viên đọc của mình; manager ghi (qua lộ trình tổ chức).
drop policy if exists path_assignments_select on public.path_assignments;
create policy path_assignments_select on public.path_assignments
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id and public.is_organization_manager(lp.organization_id)
    )
  );
drop policy if exists path_assignments_write on public.path_assignments;
create policy path_assignments_write on public.path_assignments
  for all
  using (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id and public.is_organization_manager(lp.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id and public.is_organization_manager(lp.organization_id)
    )
  );

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop table if exists public.path_assignments;
-- drop table if exists public.path_modules;
-- drop table if exists public.learning_paths;
-- drop table if exists public.member_positions;
-- drop table if exists public.position_skills;
-- drop table if exists public.job_positions;
