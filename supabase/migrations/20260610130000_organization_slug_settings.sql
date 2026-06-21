-- =====================================================================
-- AI Tro Ly — Migration 0016: organization slug and settings
-- =====================================================================
-- Phase 2.1: stable company entry slug, settings JSON, owner metadata.
-- Idempotent for SQL Editor reruns.
-- =====================================================================

alter table public.organizations
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists status text not null default 'active',
  add column if not exists settings_json jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_status_check'
  ) then
    alter table public.organizations
      add constraint organizations_status_check
      check (status in ('active', 'suspended', 'archived'));
  end if;
end $$;

create or replace function public.slugify_organization_name(input text)
returns text
language plpgsql
immutable
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  base := lower(trim(coalesce(input, '')));
  base := translate(
    base,
    'àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ',
    'aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy'
  );
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then
    base := 'cong-ty';
  end if;
  base := left(base, 50);
  candidate := base;

  while exists (
    select 1
    from public.organizations o
    where o.slug = candidate
  ) loop
    suffix := suffix + 1;
    candidate := left(base, 47) || '-' || suffix::text;
  end loop;

  return candidate;
end;
$$;

update public.organizations
set slug = public.slugify_organization_name(name)
where slug is null;

alter table public.organizations
  alter column slug set not null;

create unique index if not exists organizations_slug_key
  on public.organizations (slug);

comment on column public.organizations.slug is
  'URL-safe company identifier for /c/[organizationSlug] entry pages';

-- ROLLBACK (manual):
-- drop index if exists public.organizations_slug_key;
-- alter table public.organizations drop column if exists created_by;
-- alter table public.organizations drop column if exists settings_json;
-- alter table public.organizations drop column if exists status;
-- alter table public.organizations drop column if exists logo_url;
-- alter table public.organizations drop column if exists slug;
-- drop function if exists public.slugify_organization_name(text);
