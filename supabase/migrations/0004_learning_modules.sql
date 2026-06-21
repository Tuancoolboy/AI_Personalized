-- =====================================================================
-- Migration 0004: nội dung bài học theo vai trò (curriculum)
-- =====================================================================
-- Nội dung dùng chung cho mọi user — chỉ tiến độ lưu ở module_progress.
-- =====================================================================

create table if not exists public.learning_modules (
  id              text primary key,
  role_id         text not null check (role_id in (
    'kinh-doanh', 'ke-toan', 'marketing', 'van-hanh', 'khac'
  )),
  title           text not null,
  duration_min    int  not null check (duration_min > 0),
  level           smallint not null check (level between 1 and 3),
  sort_order      int  not null default 0,
  summary         text not null,
  content         text not null,
  learnings       jsonb not null default '[]'::jsonb,
  sections        jsonb not null default '[]'::jsonb,
  practice_prompt text not null default '',
  updated_at      timestamptz not null default now()
);

comment on table public.learning_modules is
  'Nội dung bài học lộ trình AI theo vai trò — read-only với user';

create index if not exists learning_modules_role_sort_idx
  on public.learning_modules (role_id, sort_order);

alter table public.learning_modules enable row level security;

-- Mọi user đã đăng nhập (và anon nếu cần preview) đọc được curriculum
drop policy if exists learning_modules_select_all on public.learning_modules;
create policy learning_modules_select_all on public.learning_modules
  for select using (true);

-- Chỉ service role / migration seed ghi — không policy INSERT cho user
