-- AI Tro Ly — enforce extra_skill_lessons business rules at DB layer
-- Cap 5 rows per user on insert; module must exist; source role must differ from profile role.
-- Run on update too because the app uses upsert and the table allows user-owned updates.

create or replace function public.enforce_extra_skill_lesson_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_id text;
  module_role_id text;
  existing_count int;
begin
  select role_id
    into module_role_id
    from public.learning_modules
   where id = new.module_id;

  if module_role_id is null then
    raise exception 'extra_skill_lesson_module_not_found';
  end if;

  if new.source_role_id <> module_role_id then
    raise exception 'extra_skill_lesson_role_mismatch';
  end if;

  select role_id
    into user_role_id
    from public.profiles
   where id = new.user_id;

  if user_role_id is null then
    raise exception 'extra_skill_lesson_profile_role_missing';
  end if;

  if new.source_role_id = user_role_id then
    raise exception 'extra_skill_lesson_same_role';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
      into existing_count
      from public.extra_skill_lessons
     where user_id = new.user_id;

    if existing_count >= 5 then
      raise exception 'extra_skill_lesson_limit_exceeded';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_extra_skill_lesson_rules_trigger on public.extra_skill_lessons;
create trigger enforce_extra_skill_lesson_rules_trigger
  before insert or update on public.extra_skill_lessons
  for each row
  execute function public.enforce_extra_skill_lesson_rules();

-- rollback:
-- drop trigger if exists enforce_extra_skill_lesson_rules_trigger on public.extra_skill_lessons;
-- drop function if exists public.enforce_extra_skill_lesson_rules();
