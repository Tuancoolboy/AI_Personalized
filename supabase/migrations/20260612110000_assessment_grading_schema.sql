-- =====================================================================
-- AI Tro Ly — Migration 0020: assessment + grading schema (Agent 2)
-- =====================================================================
-- Phase 2.5 foundation for structured grading, confidence, manager review.
-- Idempotent for SQL Editor reruns.
-- =====================================================================

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  training_module_id uuid references public.training_modules on delete set null,
  legacy_module_id text,
  title text not null,
  assessment_type text not null default 'practical-image'
    check (assessment_type in ('mcq', 'open-text', 'practical-image')),
  rubric_version text not null default 'practice-v1',
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments on delete cascade,
  item_type text not null
    check (item_type in ('mcq', 'open-text', 'practical-image')),
  prompt text not null,
  rubric_json jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  assessment_id uuid references public.assessments on delete set null,
  user_id uuid not null references auth.users on delete cascade,
  legacy_module_id text,
  submission_type text not null
    check (submission_type in ('mcq', 'open-text', 'practical-image')),
  status text not null default 'submitted'
    check (status in ('submitted', 'graded', 'needs-revision', 'cancelled')),
  submitted_at timestamptz not null default now()
);

create index if not exists assessment_submissions_user_idx
  on public.assessment_submissions (user_id, submitted_at desc);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assessment_submissions on delete cascade,
  item_id uuid references public.assessment_items on delete set null,
  answer_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.grading_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations on delete cascade,
  submission_id uuid not null references public.assessment_submissions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  score int not null check (score between 0 and 100),
  rubric_version text not null,
  rubric_breakdown jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  feedback text not null,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  review_status text not null default 'auto-approved'
    check (review_status in ('auto-approved', 'manager-review', 'needs-revision')),
  model text,
  created_at timestamptz not null default now()
);

create index if not exists grading_results_submission_idx
  on public.grading_results (submission_id, created_at desc);

create index if not exists grading_results_review_queue_idx
  on public.grading_results (organization_id, review_status)
  where review_status = 'manager-review';

create table if not exists public.grading_reviews (
  id uuid primary key default gen_random_uuid(),
  grading_result_id uuid not null references public.grading_results on delete cascade,
  reviewer_id uuid not null references auth.users on delete cascade,
  adjusted_score int check (adjusted_score between 0 and 100),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.assessments enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_submissions enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.grading_results enable row level security;
alter table public.grading_reviews enable row level security;

drop policy if exists assessment_submissions_self_all on public.assessment_submissions;
create policy assessment_submissions_self_all on public.assessment_submissions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists assessment_submissions_manager_select on public.assessment_submissions;
create policy assessment_submissions_manager_select on public.assessment_submissions
  for select using (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  );

drop policy if exists grading_results_self_select on public.grading_results;
create policy grading_results_self_select on public.grading_results
  for select using (auth.uid() = user_id);

drop policy if exists grading_results_self_insert on public.grading_results;
create policy grading_results_self_insert on public.grading_results
  for insert with check (auth.uid() = user_id);

drop policy if exists grading_results_manager_select on public.grading_results;
create policy grading_results_manager_select on public.grading_results
  for select using (
    organization_id is not null
    and public.is_organization_manager(organization_id)
  );

drop policy if exists grading_reviews_manager_all on public.grading_reviews;
create policy grading_reviews_manager_all on public.grading_reviews
  for all using (
    exists (
      select 1
      from public.grading_results gr
      where gr.id = grading_reviews.grading_result_id
        and gr.organization_id is not null
        and public.is_organization_manager(gr.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.grading_results gr
      where gr.id = grading_reviews.grading_result_id
        and gr.organization_id is not null
        and public.is_organization_manager(gr.organization_id)
    )
  );

-- ROLLBACK (manual): drop tables in reverse dependency order.
