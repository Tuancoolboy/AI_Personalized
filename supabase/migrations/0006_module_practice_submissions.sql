-- =====================================================================
-- Migration 0006: kết quả thực hành bài học (chấm bằng AI vision)
-- =====================================================================
-- Lưu điểm + nhận xét sau khi user upload ảnh kết quả thực hành.
-- Ảnh không lưu DB — chỉ gửi qua API để chấm, giảm rủi ro dữ liệu.
-- =====================================================================

create table if not exists public.module_practice_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  module_id     text not null,
  score         int  not null check (score between 0 and 100),
  feedback      text not null,
  strengths     text[] not null default '{}',
  improvements  text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, module_id)
);

comment on table public.module_practice_submissions is
  'Điểm chấm thực hành từng module — 1 bản ghi/user/module';

create index if not exists module_practice_submissions_user_idx
  on public.module_practice_submissions (user_id, module_id);

alter table public.module_practice_submissions enable row level security;

drop policy if exists module_practice_select_own on public.module_practice_submissions;
create policy module_practice_select_own on public.module_practice_submissions
  for select using (auth.uid() = user_id);

drop policy if exists module_practice_insert_own on public.module_practice_submissions;
create policy module_practice_insert_own on public.module_practice_submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists module_practice_update_own on public.module_practice_submissions;
create policy module_practice_update_own on public.module_practice_submissions
  for update using (auth.uid() = user_id);
