-- Chạy file này nếu GET /api/practice-review báo thiếu cột image_paths.
-- (Thường do 0007 chưa chạy hoặc chỉ chạy được phần đầu.)

alter table public.module_practice_submissions
  drop constraint if exists module_practice_submissions_user_id_module_id_key;

alter table public.module_practice_submissions
  add column if not exists image_paths text[] not null default '{}';

create index if not exists module_practice_submissions_history_idx
  on public.module_practice_submissions (user_id, module_id, created_at desc);

-- Refresh PostgREST schema cache (Supabase API)
notify pgrst, 'reload schema';
