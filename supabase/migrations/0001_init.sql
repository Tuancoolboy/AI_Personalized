-- =====================================================================
-- AI Trợ Lý — Migration 0001: schema + RLS ban đầu
-- =====================================================================
-- Idempotent: chạy lại không vỡ (dùng IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Áp dụng cho Supabase Postgres (đã có pgcrypto + auth.users sẵn).
-- Tham chiếu: CLAUDE.md §6.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

-- Hồ sơ người dùng (mở rộng auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role_id     text check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')),
  created_at  timestamptz not null default now()
);
comment on table public.profiles is 'Hồ sơ nhân viên — mỗi user 1 row, role_id chọn ở onboarding';

-- Tiến độ học từng module theo vai trò
create table if not exists public.module_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  module_id     text not null,
  status        text not null check (status in ('chua-hoc','dang-hoc','hoan-thanh')),
  completed_at  timestamptz,
  unique (user_id, module_id)
);
comment on table public.module_progress is 'Tiến độ học từng module — 1 row/user/module';

-- Kết quả kiểm tra tình huống (3-5 câu / vai trò)
create table if not exists public.quiz_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  role_id     text not null,
  module_id   text,
  score       int  not null check (score between 0 and 100),
  passed      boolean generated always as (score >= 70) stored,
  created_at  timestamptz not null default now()
);
comment on table public.quiz_results is 'Điểm bài kiểm tra tình huống — đạt nếu score >= 70';

-- Nhật ký "AI tiết kiệm bao nhiêu giờ" (1-chạm trên /tien-bo)
create table if not exists public.time_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  hours_saved  numeric(4,2) not null check (hours_saved > 0),
  usefulness   int check (usefulness between 1 and 10),
  note         text,
  logged_at    timestamptz not null default now()
);
comment on table public.time_logs is 'Nhật ký giờ tiết kiệm nhờ AI — chip 0.5h/1h/2h/4h';

-- Đếm lượt dùng trợ lý để rate-limit (30 lượt/ngày/user)
create table if not exists public.chat_usage (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  used_at  timestamptz not null default now()
);
comment on table public.chat_usage is 'Lượt gọi /api/chat — query 24h gần nhất để rate-limit';

create index if not exists chat_usage_user_used_at_idx
  on public.chat_usage (user_id, used_at desc);

-- Lead từ landing page (ẩn danh, không cần đăng nhập)
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  source      text,
  created_at  timestamptz not null default now()
);
comment on table public.leads is 'Email thu được từ landing page pre-launch';

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.module_progress  enable row level security;
alter table public.quiz_results     enable row level security;
alter table public.time_logs        enable row level security;
alter table public.chat_usage       enable row level security;
alter table public.leads            enable row level security;

-- profiles: user chỉ đọc/sửa profile của mình
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- module_progress: user chỉ đụng tiến độ của mình
drop policy if exists module_progress_select_own on public.module_progress;
create policy module_progress_select_own on public.module_progress
  for select using (auth.uid() = user_id);

drop policy if exists module_progress_insert_own on public.module_progress;
create policy module_progress_insert_own on public.module_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists module_progress_update_own on public.module_progress;
create policy module_progress_update_own on public.module_progress
  for update using (auth.uid() = user_id);

-- quiz_results: user chỉ đụng điểm của mình
drop policy if exists quiz_results_select_own on public.quiz_results;
create policy quiz_results_select_own on public.quiz_results
  for select using (auth.uid() = user_id);

drop policy if exists quiz_results_insert_own on public.quiz_results;
create policy quiz_results_insert_own on public.quiz_results
  for insert with check (auth.uid() = user_id);

-- time_logs: user chỉ đụng nhật ký của mình
drop policy if exists time_logs_select_own on public.time_logs;
create policy time_logs_select_own on public.time_logs
  for select using (auth.uid() = user_id);

drop policy if exists time_logs_insert_own on public.time_logs;
create policy time_logs_insert_own on public.time_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists time_logs_update_own on public.time_logs;
create policy time_logs_update_own on public.time_logs
  for update using (auth.uid() = user_id);

-- chat_usage: user chỉ đụng lượt của mình
drop policy if exists chat_usage_select_own on public.chat_usage;
create policy chat_usage_select_own on public.chat_usage
  for select using (auth.uid() = user_id);

drop policy if exists chat_usage_insert_own on public.chat_usage;
create policy chat_usage_insert_own on public.chat_usage
  for insert with check (auth.uid() = user_id);

-- leads: cho phép INSERT ẩn danh từ landing (không cần đăng nhập).
-- Không có policy SELECT → ẩn danh KHÔNG đọc được lead. Service role bypass RLS để admin xem.
drop policy if exists leads_insert_anyone on public.leads;
create policy leads_insert_anyone on public.leads
  for insert with check (true);
