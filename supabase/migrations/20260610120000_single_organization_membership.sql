-- =====================================================================
-- AI Tro Ly — Migration 0015: single organization membership per user
-- =====================================================================
-- Khóa rule: mỗi Supabase Auth user/email chỉ thuộc một organization.
--
-- Idempotent: dọn duplicate membership cũ trước khi thêm unique(user_id).
-- =====================================================================

with ranked_memberships as (
  select
    om.id,
    row_number() over (
      partition by om.user_id
      order by
        case
          when u.email is not null
            and organizations.name = 'Công ty của ' || lower(u.email)
          then 0
          else 1
        end,
        case om.member_role
          when 'owner' then 0
          when 'manager' then 1
          else 2
        end,
        case
          when organizations.name = 'Tổ chức mặc định' then 1
          else 0
        end,
        om.created_at asc nulls last,
        om.updated_at desc nulls last,
        om.id
    ) as row_num
  from public.organization_members om
  left join public.organizations
    on organizations.id = om.organization_id
  left join auth.users u
    on u.id = om.user_id
)
delete from public.organization_members om
using ranked_memberships rm
where om.id = rm.id
  and rm.row_num > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and conname = 'organization_members_user_id_key'
  ) then
    alter table public.organization_members
      add constraint organization_members_user_id_key unique (user_id);
  end if;
end;
$$;
