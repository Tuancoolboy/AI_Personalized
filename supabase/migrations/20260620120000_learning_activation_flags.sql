-- =====================================================================
-- AI Trợ Lý — Migration 20260620120000: learning activation flags
-- =====================================================================
-- Adds explicit activation state for learning access so platform admins can
-- hold new learners until they are manually activated, while keeping existing
-- onboarded users available after rollout.
-- =====================================================================

alter table public.profiles
  add column if not exists learning_activated boolean not null default false,
  add column if not exists learning_activated_at timestamptz,
  add column if not exists learning_activated_by uuid references auth.users(id) on delete set null,
  add column if not exists activation_email_sent_at timestamptz;

comment on column public.profiles.learning_activated is
  'Cờ cho biết user đã được mở lộ trình học hay هنوز đang chờ kích hoạt';
comment on column public.profiles.learning_activated_at is
  'Thời điểm nhân viên được mở quyền học';
comment on column public.profiles.learning_activated_by is
  'User ID của platform admin/manager đã kích hoạt';
comment on column public.profiles.activation_email_sent_at is
  'Thời điểm email kích hoạt lộ trình được gửi';

create or replace function public.prevent_learning_activation_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '');
begin
  if jwt_role <> 'service_role' then
    if new.learning_activated is distinct from old.learning_activated
      or new.learning_activated_at is distinct from old.learning_activated_at
      or new.learning_activated_by is distinct from old.learning_activated_by
      or new.activation_email_sent_at is distinct from old.activation_email_sent_at then
      raise exception 'permission denied to modify learning activation fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_learning_activation_self_edit on public.profiles;
create trigger trg_prevent_learning_activation_self_edit
before update on public.profiles
for each row execute function public.prevent_learning_activation_self_edit();

-- =====================================================================
-- ROLLBACK
-- =====================================================================
-- drop trigger if exists trg_prevent_learning_activation_self_edit on public.profiles;
-- drop function if exists public.prevent_learning_activation_self_edit();
-- alter table public.profiles
--   drop column if exists activation_email_sent_at,
--   drop column if exists learning_activated_by,
--   drop column if exists learning_activated_at,
--   drop column if exists learning_activated;
