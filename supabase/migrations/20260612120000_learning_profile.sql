-- =====================================================================
-- AI Trợ Lý — Migration 0022: learning_profile for chat personalization
-- =====================================================================
-- Stores optional preferred address (anh/chi/neutral), pain points, notes.
-- Used by dual knowledge-base chat (BE-13).
-- =====================================================================

alter table public.profiles
  add column if not exists learning_profile jsonb not null default '{}'::jsonb;

comment on column public.profiles.learning_profile is
  'Personal learning profile: preferredAddress (anh|chi|neutral), painPoints[], notesFromUser';

-- rollback:
-- alter table public.profiles drop column if exists learning_profile;
