-- =============================================================================
-- AI Tro Ly — Migration 0022: generated_learning_paths + agent_path_logs
-- Cache lộ trình do Agent sinh (1 active / user, key fingerprint) + audit log eval.
-- Audit log chỉ metadata (kỹ năng, vị trí, level, id bài) — KHÔNG PII.
-- =============================================================================

-- Cache lộ trình: 1 dòng active / user (upsert theo user_id).
create table if not exists public.generated_learning_paths (
  user_id     uuid primary key references auth.users on delete cascade,
  fingerprint text not null,
  flow        text not null check (flow in ('company','individual')),
  source      text not null check (source in ('agent','fallback')),
  result      jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

comment on table public.generated_learning_paths is
  'Cache lộ trình Agent sinh — 1 active/user, sinh lại khi fingerprint đổi';

create index if not exists generated_learning_paths_fp_idx
  on public.generated_learning_paths (user_id, fingerprint);

-- Audit log: mỗi lần sinh lộ trình (metadata-only, để eval + bằng chứng).
create table if not exists public.agent_path_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade not null,
  input      jsonb not null,
  output     jsonb not null,
  created_at timestamptz default now()
);

comment on table public.agent_path_logs is
  'Audit log Agent lộ trình — metadata-only (không tên/email/dữ liệu mật)';

create index if not exists agent_path_logs_user_idx
  on public.agent_path_logs (user_id, created_at);

alter table public.generated_learning_paths enable row level security;
alter table public.agent_path_logs enable row level security;

-- Người dùng chỉ đọc lộ trình + log của chính mình. Ghi do server (service role) lo.
drop policy if exists generated_paths_select on public.generated_learning_paths;
create policy generated_paths_select on public.generated_learning_paths
  for select using (auth.uid() = user_id);

drop policy if exists agent_path_logs_select on public.agent_path_logs;
create policy agent_path_logs_select on public.agent_path_logs
  for select using (auth.uid() = user_id);

-- ROLLBACK (manual):
-- drop table if exists public.agent_path_logs;
-- drop table if exists public.generated_learning_paths;
