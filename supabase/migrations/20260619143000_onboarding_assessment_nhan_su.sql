-- =====================================================================
-- Migration: cho phép role_id 'nhan-su' trong onboarding_assessment_results
-- Fix: onboarding HR (nhan-su) fail CHECK khi lưu kết quả khảo sát.
-- =====================================================================

alter table public.onboarding_assessment_results
  drop constraint if exists onboarding_assessment_results_role_id_check;

alter table public.onboarding_assessment_results
  add constraint onboarding_assessment_results_role_id_check
  check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac','nhan-su'));

-- ROLLBACK (manual):
-- alter table public.onboarding_assessment_results
--   drop constraint if exists onboarding_assessment_results_role_id_check;
-- alter table public.onboarding_assessment_results
--   add constraint onboarding_assessment_results_role_id_check
--   check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac'));
