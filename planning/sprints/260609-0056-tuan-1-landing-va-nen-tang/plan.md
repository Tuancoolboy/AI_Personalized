---
title: Tuần 1 — Landing + nền tảng AI Trợ Lý
description: >-
  Khởi tạo Next.js 16 + shadcn, build landing page thu lead, setup Supabase +
  Auth, deploy Vercel. Mục tiêu: landing LIVE trong tuần 1 để bắt đầu thu lead
  khi app phía sau còn xây.
status: completed
priority: P1
branch: ''
tags:
  - tuan-1
  - landing
  - supabase
  - auth
blockedBy: []
blocks: []
created: '2026-06-08T17:57:31.542Z'
createdBy: 'ck:plan'
source: skill
---

# Tuần 1 — Landing + nền tảng AI Trợ Lý

## Overview

Ship landing page lên Vercel để **bắt đầu thu lead từ ngày 1**, song song setup nền tảng (Supabase schema + Auth) cho các tuần sau. Theo CLAUDE.md §15 — "App `(app)` build sau, landing live xuyên suốt".

**Bối cảnh:** xem `CLAUDE.md` §0–§4 (bối cảnh, persona, doanh thu, tech stack). Tham chiếu Brief + PRD trong `C:\Users\LUCAS\Downloads\`.

**Tech stack thực tế (verify sau init):**
- Next.js **16.2.7** (App Router) — ⚠ có breaking changes, xem `AGENTS.md`
- React **19.2.4** · TypeScript 5 · Tailwind CSS **v4**
- shadcn/ui (preset base-nova)
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- OpenAI SDK (chưa dùng tuần 1)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Init Next.js + shadcn](./phase-01-init-next-js-shadcn.md) | Completed |
| 2 | [Landing page + lead form](./phase-02-landing-page-lead-form.md) | Completed |
| 3 | [Supabase schema + RLS](./phase-03-supabase-schema-rls.md) | Completed |
| 4 | [API leads + Supabase client](./phase-04-api-leads-supabase-client.md) | Completed |
| 5 | [Auth login/register](./phase-05-auth-login-register.md) | Completed |
| 6 | [Deploy Vercel](./phase-06-deploy-vercel.md) | Completed |

## Success criteria (toàn plan)

- [ ] Landing live trên Vercel domain → có thể nhận lead production.
- [ ] Lead submit từ landing → ghi vào bảng `leads` Supabase thành công.
- [ ] User đăng ký + login bằng email/password (Supabase Auth) chạy được.
- [ ] Migration `0001_init.sql` đã chạy trên Supabase project; tất cả bảng có RLS.
- [ ] `npm run build` + `npm run lint` không lỗi.
- [ ] `.env.example` commit được; `.env.local` không commit.

## Dependencies

- **Không có cross-plan dependency** (đây là plan đầu tiên).
- **External:** cần user tạo Supabase project + cung cấp keys; tạo Vercel project.

## Notes

- Tuần 2–5 sẽ có plan riêng cho từng feature (onboarding, lộ trình, trợ lý AI, kiểm tra/tiến bộ).
- Phase 4 (API leads) đặt sau Phase 3 vì cần bảng `leads` + RLS.
- Phase 5 (Auth) **độc lập** với Phase 2–4 — có thể chạy song song nếu muốn.
