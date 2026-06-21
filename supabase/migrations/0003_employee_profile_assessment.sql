-- =====================================================================
-- AI Trợ Lý — Migration 0003: employee profile assessment persistence
-- =====================================================================
-- Adds onboarding assessment fields to profiles so employee personalization
-- survives reloads/devices in Supabase real mode.
-- =====================================================================

alter table public.profiles
  add column if not exists assessment_result jsonb,
  add column if not exists daily_tasks text[] not null default '{}',
  add column if not exists ai_level int check (ai_level between 0 and 5),
  add column if not exists updated_at timestamptz not null default now();

comment on column public.profiles.assessment_result is
  'Full onboarding assessment summary used to personalize the employee learning path';
comment on column public.profiles.daily_tasks is
  'Daily task tags selected during onboarding assessment';
comment on column public.profiles.ai_level is
  'Computed AI level from onboarding assessment, 0-5';

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
