---
phase: 6
title: Deploy Vercel
status: completed
priority: P1
effort: 1h
dependencies:
  - 2
  - 4
---

# Phase 6: Deploy Vercel

## Overview

Init git, push lên GitHub, kết nối Vercel, cấu hình env vars, deploy production. Verify landing live + form submit ghi vào Supabase production.

## Requirements

- **Functional:** landing chạy trên Vercel domain (vercel.app hoặc custom); form submit ghi DB.
- **Non-functional:** auto-deploy khi push main; preview deploy cho mỗi PR; build < 3 phút.
- **Bảo mật:** env vars set trên Vercel dashboard, KHÔNG commit `.env.local`.

## Architecture

- Git repo: GitHub (user tự tạo).
- Vercel project linked với GitHub repo; build command mặc định `next build`.
- Env vars Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Production + Preview + Development.
  - `SUPABASE_SERVICE_ROLE_KEY` — Production + Preview only (nhạy cảm).
  - `OPENAI_API_KEY`, `OPENAI_MODEL`, `RATE_LIMIT_PER_DAY` — sẵn sàng cho tuần 4.

## Related Code Files

- Create:
  - `.env.example` (commit) — đã làm ở Phase 4
  - `vercel.json` (tùy chọn — chỉ khi cần custom region/headers)
  - `README.md` — update với link deploy + hướng dẫn setup local
- Modify: `.gitignore` — verify `.env*.local` và `.next/` đã ignore (Next mặc định)

## Implementation Steps

1. Verify `.gitignore` đã ignore `.env.local`, `.env*.local`, `node_modules`, `.next`.
2. Update `README.md` ngắn gọn:
   - Mô tả 1 dòng dự án.
   - Setup local: `npm install` → tạo `.env.local` từ `.env.example` → `npm run dev`.
   - Deploy: link Vercel project.
3. `git init` (nếu chưa) + commit initial.
4. Tạo GitHub repo riêng → push.
5. Trên Vercel: New Project → import GitHub repo.
6. Set env vars (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
7. Deploy → verify domain trả landing.
8. Smoke test trên production:
   - Mở landing → submit email thật → check Supabase bảng `leads` có row.
   - Mở `/login` → form render.
   - Truy cập `/lo-trinh` chưa login → redirect `/login`.

## Success Criteria

- [ ] Vercel project linked, auto-deploy bật.
- [ ] Production domain trả landing < 3s LCP.
- [ ] Submit form từ production → lưu `leads` thành công.
- [ ] Login form hiển thị (UI tuần 1 thô — OK).
- [ ] `.env.local` KHÔNG có trong git history (`git log --all --full-history -- .env.local` empty).
- [ ] README có link Vercel preview/production.

## Risk Assessment

- ⚠ **Path tiếng Việt + Vercel:** Vercel build trên Linux container, path local Windows không ảnh hưởng. Nhưng tên repo phải ASCII — `ai-tro-ly` OK.
- ⚠ **Supabase free tier limit:** 50K MAU + 500MB DB. Đủ tuần 1.
- ⚠ **Custom domain:** không bắt buộc tuần 1. Vercel preview URL đủ để thu lead ban đầu.

## Post-deploy

- Share landing URL với 5–10 NV mục tiêu để thu lead thật đầu tiên.
- Tuần 2 bắt đầu với plan riêng cho Onboarding + Roles.
