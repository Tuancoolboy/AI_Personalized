-- =====================================================================
-- AI Tro Ly — Migration 0019: learning content + recommendations
-- =====================================================================
-- Phase 2.3/2.4 foundation: training modules, paths, assignments,
-- learning_recommendations for Agent 3 (path recommender).
-- Idempotent for SQL Editor reruns.
-- =====================================================================

create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  legacy_module_id text,
  scope text not null default 'organization'
    check (scope in ('global', 'organization')),
  title text not null,
  content_json jsonb not null default '{}'::jsonb,
  level smallint not null default 1 check (level between 1 and 3),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  version int not null default 1 check (version > 0),
  safety_notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_modules_org_status_idx
  on public.training_modules (organization_id, status);

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  scope text not null default 'organization'
    check (scope in ('global', 'organization')),
  path_type text not null default 'specialist'
    check (path_type in ('common', 'specialist')),
  job_role_id text,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  version int not null default 1 check (version > 0),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_paths_org_status_idx
  on public.learning_paths (organization_id, status);

create table if not exists public.learning_path_modules (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.learning_paths on delete cascade,
  training_module_id uuid references public.training_modules on delete set null,
  legacy_module_id text,
  sort_order int not null default 0,
  is_required boolean not null default true,
  prerequisite_module_ids text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  unique (learning_path_id, sort_order)
);

create table if not exists public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  learning_path_id uuid not null references public.learning_paths on delete restrict,
  path_version int not null check (path_version > 0),
  assigned_by uuid references auth.users on delete set null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz
);

create index if not exists learning_assignments_user_status_idx
  on public.learning_assignments (user_id, status);

create table if not exists public.learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  candidate_module_id text not null,
  candidate_path_id uuid references public.learning_paths on delete set null,
  score int not null check (score between 0 and 100),
  reason_codes text[] not null default '{}'::text[],
  engine_version text not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists learning_recommendations_user_created_idx
  on public.learning_recommendations (user_id, created_at desc);

alter table public.training_modules enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_modules enable row level security;
alter table public.learning_assignments enable row level security;
alter table public.learning_recommendations enable row level security;

-- training_modules: org managers write; members read published in their org + global via service
drop policy if exists training_modules_manager_all on public.training_modules;
create policy training_modules_manager_all on public.training_modules
  for all using (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  );

drop policy if exists training_modules_member_select on public.training_modules;
create policy training_modules_member_select on public.training_modules
  for select using (
    status = 'published'
    and (
      scope = 'global'
      or (
        organization_id is not null
        and public.is_organization_member(organization_id)
      )
    )
  );

-- learning_paths
drop policy if exists learning_paths_manager_all on public.learning_paths;
create policy learning_paths_manager_all on public.learning_paths
  for all using (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  )
  with check (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  );

drop policy if exists learning_paths_member_select on public.learning_paths;
create policy learning_paths_member_select on public.learning_paths
  for select using (
    status = 'published'
    and organization_id is not null
    and public.is_organization_member(organization_id)
  );

-- learning_path_modules via path membership
drop policy if exists learning_path_modules_manager_all on public.learning_path_modules;
create policy learning_path_modules_manager_all on public.learning_path_modules
  for all using (
    exists (
      select 1
      from public.learning_paths lp
      where lp.id = learning_path_modules.learning_path_id
        and lp.organization_id is not null
        and public.is_organization_manager(lp.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.learning_paths lp
      where lp.id = learning_path_modules.learning_path_id
        and lp.organization_id is not null
        and public.is_organization_manager(lp.organization_id)
    )
  );

drop policy if exists learning_path_modules_member_select on public.learning_path_modules;
create policy learning_path_modules_member_select on public.learning_path_modules
  for select using (
    exists (
      select 1
      from public.learning_paths lp
      where lp.id = learning_path_modules.learning_path_id
        and lp.status = 'published'
        and lp.organization_id is not null
        and public.is_organization_member(lp.organization_id)
    )
  );

-- learning_assignments
drop policy if exists learning_assignments_manager_all on public.learning_assignments;
create policy learning_assignments_manager_all on public.learning_assignments
  for all using (
    public.is_organization_manager(organization_id)
  )
  with check (
    public.is_organization_manager(organization_id)
  );

drop policy if exists learning_assignments_self_select on public.learning_assignments;
create policy learning_assignments_self_select on public.learning_assignments
  for select using (auth.uid() = user_id);

-- learning_recommendations
drop policy if exists learning_recommendations_self_select on public.learning_recommendations;
create policy learning_recommendations_self_select on public.learning_recommendations
  for select using (auth.uid() = user_id);

drop policy if exists learning_recommendations_self_insert on public.learning_recommendations;
create policy learning_recommendations_self_insert on public.learning_recommendations
  for insert with check (auth.uid() = user_id);

drop policy if exists learning_recommendations_manager_select on public.learning_recommendations;
create policy learning_recommendations_manager_select on public.learning_recommendations
  for select using (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  );

-- ROLLBACK (manual): drop tables in reverse dependency order.
