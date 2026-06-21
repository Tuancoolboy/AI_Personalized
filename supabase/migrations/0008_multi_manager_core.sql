-- =====================================================================
-- AI Tro Ly — Migration 0008: multi-manager organization core
-- =====================================================================
-- Adds organizations + organization_members as the real-mode source of truth
-- for manager access and team membership. Idempotent for SQL Editor reruns.
-- =====================================================================

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.organizations is
  'Tổ chức dùng cho manager thật / multi-manager isolation';

create table if not exists public.organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations on delete cascade,
  user_id          uuid not null references auth.users on delete cascade,
  member_role      text not null default 'employee'
                   check (member_role in ('owner','manager','employee')),
  department_id    text not null default 'khac'
                   check (department_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')),
  invited_email    text,
  invited_by       uuid references auth.users on delete set null,
  invited_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Membership theo tổ chức; member_role manager/owner mở quyền quản lý thật';

-- Compatibility path for SQL Editor reruns against older ad-hoc BE-08 tables.
-- Earlier drafts may have created organization_members.department instead of
-- department_id, or missed the unique constraints required by Supabase upsert.
alter table public.organizations
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.organization_members
  add column if not exists member_role text,
  add column if not exists department_id text,
  add column if not exists invited_email text,
  add column if not exists invited_by uuid references auth.users on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organization_members'
      and column_name = 'department'
  ) then
    execute $sql$
      update public.organization_members
      set department_id = case
        when department in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')
        then department
        else 'khac'
      end
      where department_id is null or trim(department_id) = ''
    $sql$;
  end if;
end;
$$;

update public.organization_members
set member_role = 'employee'
where member_role is null
  or member_role not in ('owner','manager','employee');

update public.organization_members
set department_id = 'khac'
where department_id is null
  or department_id not in ('kinh-doanh','ke-toan','marketing','van-hanh','khac');

alter table public.organization_members
  alter column member_role set default 'employee',
  alter column member_role set not null,
  alter column department_id set default 'khac',
  alter column department_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_member_role_check'
  ) then
    alter table public.organization_members
      add constraint organization_members_member_role_check
      check (member_role in ('owner','manager','employee'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_department_id_check'
  ) then
    alter table public.organization_members
      add constraint organization_members_department_id_check
      check (department_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac'));
  end if;
end;
$$;

with ranked_members as (
  select
    id,
    row_number() over (
      partition by organization_id, user_id
      order by
        case member_role
          when 'owner' then 1
          when 'manager' then 2
          else 3
        end,
        updated_at desc nulls last,
        created_at desc nulls last,
        id
    ) as row_num
  from public.organization_members
)
delete from public.organization_members om
using ranked_members rm
where om.id = rm.id
  and rm.row_num > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_organization_id_user_id_key'
  ) then
    alter table public.organization_members
      add constraint organization_members_organization_id_user_id_key
      unique (organization_id, user_id);
  end if;
end;
$$;

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);

create index if not exists organization_members_org_role_idx
  on public.organization_members (organization_id, member_role);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.is_organization_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_organization_manager(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.member_role in ('owner','manager')
  );
$$;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select using (public.is_organization_member(id));

drop policy if exists organization_members_select_scoped on public.organization_members;
create policy organization_members_select_scoped on public.organization_members
  for select using (
    user_id = auth.uid()
    or public.is_organization_manager(organization_id)
  );

drop policy if exists organization_members_insert_manager on public.organization_members;
create policy organization_members_insert_manager on public.organization_members
  for insert with check (public.is_organization_manager(organization_id));

drop policy if exists organization_members_update_manager on public.organization_members;
create policy organization_members_update_manager on public.organization_members
  for update
  using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

with ensure_default_org as (
  insert into public.organizations (name)
  select 'Tổ chức mặc định'
  where not exists (
    select 1
    from public.organizations
    where name = 'Tổ chức mặc định'
  )
  returning id
),
default_org as (
  select id from ensure_default_org
  union all
  select id from public.organizations where name = 'Tổ chức mặc định'
  order by id
  limit 1
),
existing_users as (
  select
    u.id,
    u.email,
    p.role_id
  from auth.users u
  left join public.profiles p on p.id = u.id
)
insert into public.organization_members (
  organization_id,
  user_id,
  member_role,
  department_id,
  invited_email,
  created_at,
  updated_at
)
select
  default_org.id,
  existing_users.id,
  case
    when lower(coalesce(existing_users.email, '')) like 'quanly%'
      or lower(coalesce(existing_users.email, '')) like 'manager%'
      or lower(coalesce(existing_users.email, '')) like 'hr%'
      or lower(coalesce(existing_users.email, '')) like 'admin%'
      or lower(coalesce(existing_users.email, '')) like 'ql.%'
      or lower(coalesce(existing_users.email, '')) like 'truongphong%'
    then 'manager'
    else 'employee'
  end,
  case
    when existing_users.role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')
    then existing_users.role_id
    else 'khac'
  end,
  existing_users.email,
  now(),
  now()
from default_org
cross join existing_users
on conflict (organization_id, user_id) do update set
  invited_email = coalesce(public.organization_members.invited_email, excluded.invited_email),
  department_id = coalesce(public.organization_members.department_id, excluded.department_id),
  member_role = case
    when public.organization_members.member_role in ('owner','manager') then public.organization_members.member_role
    when excluded.member_role in ('owner','manager') then excluded.member_role
    else public.organization_members.member_role
  end,
  updated_at = now();
