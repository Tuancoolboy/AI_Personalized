-- =====================================================================
-- DANGER: Reset Supabase DEV/TEST database for AI Tro Ly.
-- =====================================================================
-- This script deletes app data and Supabase Auth users so you can test from
-- a clean state. Do NOT run on production.
--
-- It does not drop schemas, migrations files, buckets, or secrets.
-- Run migrations 0001..0015 again after this, then seed modules:
--   npm run seed:modules
-- =====================================================================

-- Supabase protects storage.objects from direct SQL deletes.
-- If you also want to clear uploaded practice images, delete files from the
-- "practice-images" bucket in the Supabase Storage UI or through the Storage API.

-- Clear public app tables that exist in the current schema.
do $$
declare
  table_names text[];
begin
  select array_agg(format('%I.%I', schemaname, tablename))
  into table_names
  from pg_tables
  where schemaname = 'public'
    and tablename = any(array[
      'chat_messages',
      'chat_conversations',
      'chat_memories',
      'organization_invite_links',
      'organization_members',
      'organizations',
      'module_practice_submissions',
      'events',
      'learning_modules',
      'module_progress',
      'quiz_results',
      'time_logs',
      'chat_usage',
      'leads',
      'profiles'
    ]);

  if table_names is not null then
    execute 'truncate table ' || array_to_string(table_names, ', ') ||
      ' restart identity cascade';
  end if;
end;
$$;

-- Delete Auth users after public rows are gone.
-- Supabase cascades related auth identities/sessions from auth.users.
delete from auth.users;

-- Quick check: auth_users should be 0 after reset.
select
  (select count(*) from auth.users) as auth_users;
