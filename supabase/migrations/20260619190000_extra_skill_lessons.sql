-- AI Tro Ly — Migration: extra_skill_lessons
-- Lưu các bài học "Kỹ năng khác" mà user tự xác nhận học thêm.

create table if not exists public.extra_skill_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  module_id text not null,
  skill_slug text not null,
  source_role_id text not null check (
    source_role_id in ('kinh-doanh', 'ke-toan', 'marketing', 'van-hanh', 'khac', 'nhan-su')
  ),
  enrolled_at timestamptz not null default now(),
  unique (user_id, module_id)
);

comment on table public.extra_skill_lessons is
  'Bài học thêm ngoài role hiện tại, hiển thị ở section Kỹ năng khác';

create index if not exists extra_skill_lessons_user_enrolled_idx
  on public.extra_skill_lessons (user_id, enrolled_at desc);

alter table public.extra_skill_lessons enable row level security;

drop policy if exists extra_skill_lessons_select_own on public.extra_skill_lessons;
create policy extra_skill_lessons_select_own on public.extra_skill_lessons
  for select using (auth.uid() = user_id);

drop policy if exists extra_skill_lessons_insert_own on public.extra_skill_lessons;
create policy extra_skill_lessons_insert_own on public.extra_skill_lessons
  for insert with check (auth.uid() = user_id);

drop policy if exists extra_skill_lessons_update_own on public.extra_skill_lessons;
create policy extra_skill_lessons_update_own on public.extra_skill_lessons
  for update using (auth.uid() = user_id);

drop policy if exists extra_skill_lessons_delete_own on public.extra_skill_lessons;
create policy extra_skill_lessons_delete_own on public.extra_skill_lessons
  for delete using (auth.uid() = user_id);
