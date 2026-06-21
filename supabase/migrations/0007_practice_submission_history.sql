-- =====================================================================
-- Migration 0007: lịch sử nộp bài thực hành (nhiều lần + nhiều ảnh)
-- =====================================================================
-- Mỗi lần nộp = 1 row mới. Ảnh lưu Supabase Storage (bucket practice-images).
-- =====================================================================

alter table public.module_practice_submissions
  drop constraint if exists module_practice_submissions_user_id_module_id_key;

alter table public.module_practice_submissions
  add column if not exists image_paths text[] not null default '{}';

comment on table public.module_practice_submissions is
  'Lịch sử chấm thực hành — nhiều lần nộp/user/module';

comment on column public.module_practice_submissions.image_paths is
  'Đường dẫn ảnh trong bucket practice-images';

create index if not exists module_practice_submissions_history_idx
  on public.module_practice_submissions (user_id, module_id, created_at desc);

-- Storage bucket (private — đọc qua signed URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practice-images',
  'practice-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists practice_images_insert_own on storage.objects;
create policy practice_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'practice-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists practice_images_select_own on storage.objects;
create policy practice_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'practice-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists practice_images_delete_own on storage.objects;
create policy practice_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'practice-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
