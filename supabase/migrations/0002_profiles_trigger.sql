-- =====================================================================
-- Migration 0002: trigger auto-tạo profile khi user đăng ký
-- =====================================================================
-- Mỗi khi auth.users có row mới → tự động INSERT public.profiles (id = user.id).
-- Idempotent: drop function/trigger nếu tồn tại trước khi create lại.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
