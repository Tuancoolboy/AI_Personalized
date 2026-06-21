---
phase: 4
title: API leads + Supabase client
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 2
  - 3
---

# Phase 4: API leads + Supabase client

## Overview

Tạo Supabase server client helpers + thay stub `/api/leads` bằng impl thật ghi vào bảng `leads`. Sau phase này, lead submit từ landing thực sự được lưu DB.

## Requirements

- **Functional:** POST `/api/leads` với `{ email, name?, source? }` → INSERT vào `leads` → 200. Duplicate email → vẫn 200 (không expose tồn tại email cho attacker enumerate).
- **Non-functional:** dùng `@supabase/ssr` để client tương thích RSC + Route Handler; không leak service role key ra client.
- **Bảo mật:** validate email server-side (không tin client); rate-limit cơ bản (IP-based, in-memory) chống spam.

## Architecture

- `lib/supabase/client.ts` — browser client dùng `createBrowserClient` từ `@supabase/ssr`, key = `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabase/server.ts` — server client dùng `createServerClient` (cho RSC) + `createServiceRoleClient` (cho Route Handler cần bypass RLS).
  - Service role client KHÔNG dùng cho /api/leads — policy "anyone can insert" đã cho phép anon key insert. Service role chỉ dùng khi cần read leads (admin only — không cần tuần 1).
- `/api/leads` dùng anon client + policy "anyone can submit lead".
- Rate-limit in-memory `Map<ip, count>` reset mỗi giờ. Giữ KISS, Phase tương lai chuyển sang Upstash nếu cần.

## Related Code Files

- Create:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `lib/rate-limit-memory.ts` — simple in-memory rate limiter
- Modify:
  - `app/api/leads/route.ts` — thay stub bằng impl Supabase insert
  - `.env.example` — thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Implementation Steps

1. Tạo `lib/supabase/client.ts` — browser client.
2. Tạo `lib/supabase/server.ts` — server client (RSC + route handler) + service role helper.
3. Tạo `lib/rate-limit-memory.ts` — `Map<ip, { count, resetAt }>`, default 10 req/giờ/IP cho `/api/leads`.
4. Update `app/api/leads/route.ts`:
   - Extract IP từ headers (`x-forwarded-for` Vercel) hoặc `request.headers`.
   - Check rate-limit → 429 nếu vượt.
   - Validate email regex.
   - Build supabase client → `.from('leads').insert({ email, name, source }).select().single()`.
   - Trả 200 kể cả khi insert lỗi unique (nếu sau này thêm unique constraint) — không expose enumerate.
   - Log lỗi server-side.
5. Update `.env.example` (commit) — placeholder Supabase keys + comment.
6. Test:
   - Submit form thật từ landing → check bảng `leads` trên Supabase có row mới.
   - Submit 11 lần liên tiếp từ cùng IP → request thứ 11 trả 429.

## Success Criteria

- [ ] `lib/supabase/client.ts` + `lib/supabase/server.ts` export đúng signature.
- [ ] Submit landing form → row mới trong `leads`.
- [ ] Email invalid → 400.
- [ ] >10 req/giờ/IP → 429.
- [ ] `npm run build` không lỗi TS.
- [ ] Service role key KHÔNG xuất hiện trong client bundle (verify qua build output).

## Risk Assessment

- ⚠ **In-memory rate-limit reset khi serverless cold start:** mỗi Vercel cold start clear Map. **Mitigation:** chấp nhận trade-off tuần 1 (Vercel free tier); chuyển sang Upstash KV ở GĐ2 nếu spam thật.
- ⚠ **Anon client insert leads:** policy "anyone can insert" cho phép spam. **Mitigation:** rate-limit IP + CAPTCHA ở tuần 2 nếu cần.
