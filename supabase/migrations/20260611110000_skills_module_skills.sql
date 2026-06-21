-- =====================================================================
-- AI Tro Ly — Migration 0014: skills + module_skills (kỹ năng bài bản)
-- =====================================================================
-- "Kỹ năng" làm bằng bảng riêng (không tag tĩnh). module_skills gắn bài học
-- vào kỹ năng (n–n) để builder ráp lộ trình theo kỹ năng (spec §5.1, §6.1).
-- skills.organization_id NULL = kỹ năng dùng chung toàn hệ thống.
-- Idempotent. Seed kỹ năng chung + quan hệ module HR. Có rollback ở cuối.
-- =====================================================================

create table if not exists public.skills (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations on delete cascade,
  name             text not null,
  slug             text not null,
  description      text,
  is_foundation    boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

comment on table public.skills is
  'Kỹ năng AI (slug khớp lib/roles.ts SKILL_LABELS); org NULL = dùng chung';

-- Unique slug cho kỹ năng dùng chung (organization_id NULL) — partial index
-- vì UNIQUE thường coi NULL là khác nhau.
create unique index if not exists skills_global_slug_uidx
  on public.skills (slug) where organization_id is null;

create table if not exists public.module_skills (
  module_id  text not null,
  skill_id   uuid not null references public.skills on delete cascade,
  primary key (module_id, skill_id)
);

comment on table public.module_skills is
  'Gắn bài học (learning_modules.id) vào kỹ năng (n–n)';

create index if not exists module_skills_skill_idx
  on public.module_skills (skill_id);

alter table public.skills enable row level security;
alter table public.module_skills enable row level security;

-- skills: đọc kỹ năng chung (org NULL) hoặc kỹ năng trong tổ chức của mình.
drop policy if exists skills_select on public.skills;
create policy skills_select on public.skills
  for select using (
    organization_id is null
    or public.is_organization_member(organization_id)
  );

-- skills: chỉ quản lý tổ chức tạo/sửa kỹ năng riêng của tổ chức.
drop policy if exists skills_write_manager on public.skills;
create policy skills_write_manager on public.skills
  for all
  using (
    organization_id is not null and public.is_organization_manager(organization_id)
  )
  with check (
    organization_id is not null and public.is_organization_manager(organization_id)
  );

-- module_skills: ai cũng đọc được map kỹ năng↔bài học.
drop policy if exists module_skills_select on public.module_skills;
create policy module_skills_select on public.module_skills
  for select using (true);

-- =====================================================================
-- SEED kỹ năng dùng chung (org NULL)
-- =====================================================================
insert into public.skills (organization_id, name, slug, description, is_foundation)
values
  (null, 'Nền tảng AI cơ bản', 'nen-tang-ai', 'Hiểu AI làm được gì cho công việc', true),
  (null, 'Viết prompt hiệu quả', 'viet-prompt', 'Cấu trúc vai trò + bối cảnh + yêu cầu', true),
  (null, 'An toàn dữ liệu khi dùng AI', 'an-toan-du-lieu', 'Ẩn danh & bảo vệ dữ liệu nhạy cảm', true),
  (null, 'Soạn văn bản hành chính', 'van-ban-hanh-chinh', 'Quyết định, thông báo, công văn', false),
  (null, 'Lọc CV tuyển dụng', 'loc-cv', 'Sàng lọc & tóm tắt CV theo JD', false),
  (null, 'Viết email nội bộ', 'email-noi-bo', 'Email & truyền thông HR nội bộ', false),
  (null, 'Chấm công & nghỉ phép', 'cham-cong-nghi-phep', 'Hỗ trợ rà soát công & phép', false),
  (null, 'Tóm tắt tài liệu & biên bản', 'tom-tat-tai-lieu', 'Rút gọn tài liệu dài thành ý chính', false)
on conflict do nothing;

-- =====================================================================
-- SEED module_skills cho lộ trình HR/Hành chính (van-hanh)
-- =====================================================================
insert into public.module_skills (module_id, skill_id)
select m.module_id, s.id
from (values
  ('van-hanh-m1', 'nen-tang-ai'),
  ('van-hanh-m2', 'viet-prompt'),
  ('van-hanh-m3', 'tom-tat-tai-lieu'),
  ('van-hanh-m3', 'email-noi-bo'),
  ('van-hanh-m6', 'an-toan-du-lieu'),
  ('van-hanh-m7', 'van-ban-hanh-chinh'),
  ('van-hanh-m8', 'loc-cv'),
  ('van-hanh-m9', 'email-noi-bo'),
  ('van-hanh-m10', 'cham-cong-nghi-phep')
) as m(module_id, slug)
join public.skills s on s.slug = m.slug and s.organization_id is null
on conflict do nothing;

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop policy if exists module_skills_select on public.module_skills;
-- drop policy if exists skills_write_manager on public.skills;
-- drop policy if exists skills_select on public.skills;
-- drop table if exists public.module_skills;
-- drop table if exists public.skills;
