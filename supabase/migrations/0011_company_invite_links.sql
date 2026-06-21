-- =====================================================================
-- AI Tro Ly — Migration 0011: company invite links token-only
-- =====================================================================
-- Adds token-only invite links for manager-created organization joins.
-- Each active token belongs to one organization and one manager.
-- =====================================================================

create table if not exists public.organization_invite_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations on delete cascade,
  created_by       uuid not null references auth.users on delete cascade,
  token            text not null unique,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_used_at     timestamptz
);

comment on table public.organization_invite_links is
  'Token-only invite links for employees joining an organization';

comment on column public.organization_invite_links.token is
  'Bearer invite token; never log this value';

alter table public.organization_invite_links
  add column if not exists organization_id uuid references public.organizations on delete cascade,
  add column if not exists created_by uuid references auth.users on delete cascade,
  add column if not exists token text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_used_at timestamptz;

update public.organization_invite_links
set is_active = true
where is_active is null;

alter table public.organization_invite_links
  alter column organization_id set not null,
  alter column created_by set not null,
  alter column token set not null,
  alter column is_active set not null,
  alter column is_active set default true,
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organization_invite_links'::regclass
      and conname = 'organization_invite_links_token_key'
  ) then
    alter table public.organization_invite_links
      add constraint organization_invite_links_token_key unique (token);
  end if;
end;
$$;

with ranked_links as (
  select
    id,
    row_number() over (
      partition by organization_id, created_by
      order by updated_at desc nulls last, created_at desc nulls last, id
    ) as row_num
  from public.organization_invite_links
  where is_active
)
update public.organization_invite_links oil
set is_active = false,
    updated_at = now()
from ranked_links rl
where oil.id = rl.id
  and rl.row_num > 1;

create unique index if not exists organization_invite_links_active_creator_idx
  on public.organization_invite_links (organization_id, created_by)
  where is_active;

create index if not exists organization_invite_links_org_idx
  on public.organization_invite_links (organization_id);

create index if not exists organization_invite_links_created_by_idx
  on public.organization_invite_links (created_by);

alter table public.organization_invite_links enable row level security;

drop policy if exists organization_invite_links_select_manager
  on public.organization_invite_links;
drop policy if exists organization_invite_links_insert_manager
  on public.organization_invite_links;
drop policy if exists organization_invite_links_update_manager
  on public.organization_invite_links;

-- No anon/client policies on purpose. Token rows are managed only by
-- server Route Handlers with the Supabase service role key.
