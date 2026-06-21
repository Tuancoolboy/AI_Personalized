-- AI Tro Ly — Persist onboarding assessment attempts
-- Stores every completed onboarding survey separately from the current profile summary.

create table if not exists public.onboarding_assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role_id text not null
    check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')),
  answers jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  total_score int not null check (total_score >= 0),
  ai_level int not null check (ai_level between 0 and 5),
  daily_tasks text[] not null default '{}',
  tools_tried text[] not null default '{}',
  industry text,
  position text,
  created_at timestamptz not null default now()
);

comment on table public.onboarding_assessment_results is
  'Lich su ket qua khao sat onboarding cua tung user; profiles chi giu ket qua hien tai';

create index if not exists onboarding_assessment_results_user_created_idx
  on public.onboarding_assessment_results (user_id, created_at desc);

alter table public.onboarding_assessment_results enable row level security;

drop policy if exists onboarding_assessment_results_select_own
  on public.onboarding_assessment_results;
create policy onboarding_assessment_results_select_own
  on public.onboarding_assessment_results
  for select using (auth.uid() = user_id);

drop policy if exists onboarding_assessment_results_insert_own
  on public.onboarding_assessment_results;
create policy onboarding_assessment_results_insert_own
  on public.onboarding_assessment_results
  for insert with check (auth.uid() = user_id);

-- ROLLBACK (manual):
-- drop table if exists public.onboarding_assessment_results;
