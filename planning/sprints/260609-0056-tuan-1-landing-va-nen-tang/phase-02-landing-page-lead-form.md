---
phase: 2
title: Landing page + lead form
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
---

# Phase 2: Landing page + lead form

## Overview

Build trang `/` công khai (pre-launch): hero, value prop, 3 trụ cột, form thu email. Form POST `/api/leads` (sẽ stub trong phase này, wire-up thật ở Phase 4).

## Requirements

- **Functional:** trang `/` render đầy đủ; form submit gọi `/api/leads` và hiển thị success/error UI.
- **Non-functional:** mobile-first (test 375px + 1440px); LCP < 3s; tiếng Việt có dấu hiển thị đúng (font Be Vietnam Pro).
- **Bảo mật:** API stub tuần này KHÔNG persist; chỉ log + return 200. Phase 4 sẽ thay bằng impl Supabase.

## Architecture

- `app/layout.tsx`: lang="vi", font `Be_Vietnam_Pro` (subsets latin + vietnamese), metadata tiếng Việt.
- `app/page.tsx`: server component, compose từ các section. Embed `<LandingLeadForm />` (client).
- `components/landing-lead-form.tsx`: client component, useState quản lý status (idle/submitting/success/error), fetch POST `/api/leads`.
- `app/api/leads/route.ts`: stub Route Handler, validate email, log payload, return `{ ok: true }`. Phase 4 sẽ thay bằng Supabase insert.

## Related Code Files

- Modify:
  - `app/layout.tsx` (đã làm — Vietnamese lang, Be Vietnam Pro)
  - `app/page.tsx` (đang làm — rewrite từ Next default)
- Create:
  - `components/landing-lead-form.tsx` (đã làm)
  - `app/api/leads/route.ts` (stub — sẽ thay ở Phase 4)

## Implementation Steps

1. ✔ Update `app/layout.tsx` — lang="vi" + Be Vietnam Pro font + metadata tiếng Việt.
2. ✔ Create `components/landing-lead-form.tsx` — client component với form + fetch + status UI.
3. ◻ Rewrite `app/page.tsx`:
   - Hero: tên sản phẩm + một câu định vị (lấy từ CLAUDE.md §0).
   - Section "3 điểm đau" (đắt / chung chung / không đo được).
   - Section "3 trụ cột" (Lộ trình / Trợ lý AI / Tiến bộ).
   - Section "Đăng ký nhận tin" — wrap `<LandingLeadForm />`.
   - Footer nhẹ (copyright + email liên hệ placeholder).
4. ◻ Create stub `app/api/leads/route.ts`:
   - POST handler.
   - Parse JSON body `{ email, name?, source? }`.
   - Validate email cơ bản (regex).
   - `console.log("[lead]", payload)`.
   - Return `Response.json({ ok: true })`.
   - 400 nếu thiếu/sai email.
5. ◻ Verify `npm run build` pass.
6. ◻ Manual test bằng `npm run dev`: mở localhost, submit form, check success UI + server log.

## Success Criteria

- [ ] Trang `/` render hero + 3 điểm đau + 3 trụ cột + form.
- [ ] Hiển thị tiếng Việt có dấu chuẩn (test "Việt Nam", "Trợ lý AI gia sư").
- [ ] Mobile (375px) không vỡ layout.
- [ ] Submit form email hợp lệ → "Đã ghi nhận!" + form ẩn.
- [ ] Submit email rỗng/sai → "Vui lòng nhập email." inline error.
- [ ] `npm run build` exit 0.
- [ ] Server log có `[lead] { email, name, source }` khi submit thật.

## Risk Assessment

- ⚠ **Stub API mất lead:** tuần này submit không lưu DB. **Mitigation:** ngay sau Phase 4 deploy, lead bắt đầu lưu. Trước đó copy log thủ công nếu cần.
- ⚠ **Font Be Vietnam Pro:** load từ Google Fonts → CLS nhẹ trên mạng chậm. **Mitigation:** `display: "swap"` đã set.
