-- =====================================================================
-- AI Tro Ly — Migration 0014: manager private organizations
-- =====================================================================
-- Tách manager thật khỏi "Tổ chức mặc định".
-- Mỗi manager/owner có một organization riêng theo email:
--   "Công ty của <email-lowercase>"
--
-- Idempotent: có thể chạy lại trong SQL Editor.
-- =====================================================================

-- Compatibility: older ad-hoc BE-08 attempts may have created
-- public.organizations without a unique constraint on name. ON CONFLICT (name)
-- needs that constraint, so merge duplicate names and add it if missing.
with ranked_organizations as (
  select
    id,
    first_value(id) over (
      partition by name
      order by created_at asc nulls last, updated_at asc nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by name
      order by created_at asc nulls last, updated_at asc nulls last, id
    ) as row_num
  from public.organizations
),
duplicate_organizations as (
  select id, canonical_id
  from ranked_organizations
  where row_num > 1
)
update public.organization_members om
set organization_id = duplicate_organizations.canonical_id,
    updated_at = now()
from duplicate_organizations
where om.organization_id = duplicate_organizations.id
  and not exists (
    select 1
    from public.organization_members existing
    where existing.organization_id = duplicate_organizations.canonical_id
      and existing.user_id = om.user_id
  );

with ranked_organizations as (
  select
    id,
    first_value(id) over (
      partition by name
      order by created_at asc nulls last, updated_at asc nulls last, id
    ) as canonical_id,
    row_number() over (
      partition by name
      order by created_at asc nulls last, updated_at asc nulls last, id
    ) as row_num
  from public.organizations
),
duplicate_organizations as (
  select id, canonical_id
  from ranked_organizations
  where row_num > 1
)
update public.organization_invite_links oil
set organization_id = duplicate_organizations.canonical_id,
    updated_at = now()
from duplicate_organizations
where oil.organization_id = duplicate_organizations.id
  and not exists (
    select 1
    from public.organization_invite_links existing
    where existing.organization_id = duplicate_organizations.canonical_id
      and existing.created_by = oil.created_by
      and existing.is_active = oil.is_active
  );

with ranked_organizations as (
  select
    id,
    row_number() over (
      partition by name
      order by created_at asc nulls last, updated_at asc nulls last, id
    ) as row_num
  from public.organizations
)
delete from public.organizations organizations
using ranked_organizations
where organizations.id = ranked_organizations.id
  and ranked_organizations.row_num > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_name_key'
  ) then
    alter table public.organizations
      add constraint organizations_name_key unique (name);
  end if;
end;
$$;

-- 1) Tạo organization riêng cho mọi manager/owner hiện có.
with manager_users as (
  select
    u.id as user_id,
    lower(u.email) as email
  from public.organization_members om
  join auth.users u on u.id = om.user_id
  where om.member_role in ('owner', 'manager')
    and u.email is not null
  group by u.id, lower(u.email)
)
insert into public.organizations (name, created_at, updated_at)
select
  'Công ty của ' || manager_users.email,
  now(),
  now()
from manager_users
on conflict (name) do update set
  updated_at = excluded.updated_at;

-- 2) Upsert manager/owner vào organization riêng.
with manager_users as (
  select
    u.id as user_id,
    lower(u.email) as email,
    case
      when bool_or(om.member_role = 'owner') then 'owner'
      else 'manager'
    end as member_role,
    coalesce(
      (array_agg(
        om.department_id
        order by
          case om.member_role when 'owner' then 1 when 'manager' then 2 else 3 end,
          om.updated_at desc nulls last,
          om.created_at desc nulls last
      ))[1],
      'khac'
    ) as department_id
  from public.organization_members om
  join auth.users u on u.id = om.user_id
  where om.member_role in ('owner', 'manager')
    and u.email is not null
  group by u.id, lower(u.email)
),
private_orgs as (
  select
    manager_users.user_id,
    manager_users.email,
    manager_users.member_role,
    manager_users.department_id,
    organizations.id as organization_id
  from manager_users
  join public.organizations
    on organizations.name = 'Công ty của ' || manager_users.email
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
  private_orgs.organization_id,
  private_orgs.user_id,
  private_orgs.member_role,
  private_orgs.department_id,
  private_orgs.email,
  now(),
  now()
from private_orgs
on conflict (organization_id, user_id) do update set
  member_role = case
    when public.organization_members.member_role = 'owner'
      or excluded.member_role = 'owner'
    then 'owner'
    else 'manager'
  end,
  department_id = coalesce(public.organization_members.department_id, excluded.department_id),
  invited_email = coalesce(public.organization_members.invited_email, excluded.invited_email),
  updated_at = now();

-- 3) Copy employee rows in default org to the private org of the manager
-- who invited them. Rows with unknown invited_by stay in default org.
with default_org as (
  select id
  from public.organizations
  where name = 'Tổ chức mặc định'
  limit 1
),
manager_private_orgs as (
  select
    u.id as manager_user_id,
    organizations.id as private_organization_id
  from auth.users u
  join public.organizations
    on organizations.name = 'Công ty của ' || lower(u.email)
  where u.email is not null
),
transfer_rows as (
  select
    manager_private_orgs.private_organization_id,
    om.user_id,
    om.department_id,
    om.invited_email,
    om.invited_by,
    om.invited_at,
    om.created_at
  from public.organization_members om
  join default_org on default_org.id = om.organization_id
  join manager_private_orgs on manager_private_orgs.manager_user_id = om.invited_by
  where om.member_role = 'employee'
)
insert into public.organization_members (
  organization_id,
  user_id,
  member_role,
  department_id,
  invited_email,
  invited_by,
  invited_at,
  created_at,
  updated_at
)
select
  transfer_rows.private_organization_id,
  transfer_rows.user_id,
  'employee',
  coalesce(transfer_rows.department_id, 'khac'),
  transfer_rows.invited_email,
  transfer_rows.invited_by,
  transfer_rows.invited_at,
  coalesce(transfer_rows.created_at, now()),
  now()
from transfer_rows
on conflict (organization_id, user_id) do update set
  member_role = case
    when public.organization_members.member_role in ('owner', 'manager')
    then public.organization_members.member_role
    else excluded.member_role
  end,
  department_id = coalesce(public.organization_members.department_id, excluded.department_id),
  invited_email = coalesce(public.organization_members.invited_email, excluded.invited_email),
  invited_by = coalesce(public.organization_members.invited_by, excluded.invited_by),
  invited_at = coalesce(public.organization_members.invited_at, excluded.invited_at),
  updated_at = now();

-- 4) Remove transferred employee rows from default org.
with default_org as (
  select id
  from public.organizations
  where name = 'Tổ chức mặc định'
  limit 1
),
manager_private_orgs as (
  select u.id as manager_user_id
  from auth.users u
  join public.organizations
    on organizations.name = 'Công ty của ' || lower(u.email)
  where u.email is not null
)
delete from public.organization_members om
using default_org, manager_private_orgs
where om.organization_id = default_org.id
  and om.member_role = 'employee'
  and om.invited_by = manager_private_orgs.manager_user_id;

-- 5) Remove manager/owner memberships from default org after private org exists.
with default_org as (
  select id
  from public.organizations
  where name = 'Tổ chức mặc định'
  limit 1
),
manager_private_orgs as (
  select u.id as manager_user_id
  from auth.users u
  join public.organizations
    on organizations.name = 'Công ty của ' || lower(u.email)
  where u.email is not null
)
delete from public.organization_members om
using default_org, manager_private_orgs
where om.organization_id = default_org.id
  and om.user_id = manager_private_orgs.manager_user_id
  and om.member_role in ('owner', 'manager');

-- 6) Default-org invite links created by split managers should no longer be active.
with default_org as (
  select id
  from public.organizations
  where name = 'Tổ chức mặc định'
  limit 1
),
manager_private_orgs as (
  select u.id as manager_user_id
  from auth.users u
  join public.organizations
    on organizations.name = 'Công ty của ' || lower(u.email)
  where u.email is not null
)
update public.organization_invite_links oil
set is_active = false,
    updated_at = now()
from default_org, manager_private_orgs
where oil.organization_id = default_org.id
  and oil.created_by = manager_private_orgs.manager_user_id
  and oil.is_active = true;
