-- =====================================================================
-- AI Tro Ly — Migration 0019: file mẫu đính kèm bài học (Phần C §5)
-- =====================================================================
-- learning_modules.attached_file: jsonb { name, path, desc } cho bài thực hành.
-- Demo lấy từ data tĩnh (lib/roles.ts); real mode đọc cột này.
-- Idempotent. Có rollback ở cuối.
-- =====================================================================

alter table public.learning_modules
  add column if not exists attached_file jsonb;

comment on column public.learning_modules.attached_file is
  'File mẫu đính kèm { name, path, desc }; path trỏ public/files/. NULL = không có';

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- alter table public.learning_modules drop column if exists attached_file;
