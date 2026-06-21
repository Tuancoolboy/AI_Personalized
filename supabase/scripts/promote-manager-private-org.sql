-- =====================================================================
-- Promote one Supabase Auth user to manager with a private organization.
-- =====================================================================
-- Usage:
-- 1. Replace the email below in both places.
-- 2. Run in Supabase SQL Editor after migrations 0001..0015.
--
-- Rule after 0015: one Auth user can belong to only one organization.
-- This script only promotes users with no organization, only default org, or
-- their own private org. It refuses to move users from another real company.
-- =====================================================================

do $$
declare
  manager_email text := lower('ronaldo36@gmail.com');
  target_user_id uuid;
  private_org_id uuid;
  private_org_name text := 'Công ty của ' || lower('ronaldo36@gmail.com');
  promoted_role text := 'manager';
  profile_department text := 'khac';
  blocking_org_name text;
begin
  select u.id
  into target_user_id
  from auth.users u
  where lower(u.email) = manager_email
  limit 1;

  if target_user_id is null then
    raise exception 'Không tìm thấy Supabase Auth user cho email %', manager_email;
  end if;

  select organizations.name
  into blocking_org_name
  from public.organization_members om
  join public.organizations
    on organizations.id = om.organization_id
  where om.user_id = target_user_id
    and organizations.name not in ('Tổ chức mặc định', private_org_name)
  order by om.created_at asc nulls last, om.id
  limit 1;

  if blocking_org_name is not null then
    raise exception
      'User % đang thuộc %, không thể chuyển sang công ty riêng bằng helper promote.',
      manager_email,
      blocking_org_name;
  end if;

  if exists (
    select 1
    from public.organization_members
    where user_id = target_user_id
      and member_role = 'owner'
  ) then
    promoted_role := 'owner';
  end if;

  select
    case
      when profiles.role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')
      then profiles.role_id
      else 'khac'
    end
  into profile_department
  from public.profiles
  where profiles.id = target_user_id;

  profile_department := coalesce(profile_department, 'khac');

  insert into public.organizations (name, created_at, updated_at)
  values (private_org_name, now(), now())
  on conflict (name) do update set
    updated_at = excluded.updated_at
  returning id into private_org_id;

  delete from public.organization_members om
  using public.organizations
  where om.user_id = target_user_id
    and om.organization_id = organizations.id
    and organizations.name = 'Tổ chức mặc định';

  insert into public.organization_members (
    organization_id,
    user_id,
    member_role,
    department_id,
    invited_email,
    created_at,
    updated_at
  )
  values (
    private_org_id,
    target_user_id,
    promoted_role,
    profile_department,
    manager_email,
    now(),
    now()
  )
  on conflict (user_id) do update set
    member_role = case
      when public.organization_members.member_role = 'owner' then 'owner'
      when excluded.member_role = 'owner' then 'owner'
      else 'manager'
    end,
    department_id = coalesce(public.organization_members.department_id, excluded.department_id),
    invited_email = coalesce(public.organization_members.invited_email, excluded.invited_email),
    updated_at = now()
  where public.organization_members.organization_id = excluded.organization_id;

  update public.organization_invite_links oil
  set is_active = false,
      updated_at = now()
  from public.organizations
  where oil.organization_id = organizations.id
    and organizations.name = 'Tổ chức mặc định'
    and oil.created_by = target_user_id
    and oil.is_active = true;
end;
$$;

-- Verify all memberships for the email:
select
  u.email,
  o.name as organization_name,
  om.member_role,
  om.organization_id,
  om.user_id
from public.organization_members om
join auth.users u on u.id = om.user_id
join public.organizations o on o.id = om.organization_id
where lower(u.email) = lower('ronaldo36@gmail.com')
order by o.name;
