---
phase: 3
title: Supabase schema + RLS
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 1
---

# Phase 3: Supabase schema + RLS

## Overview

Tạo file migration `supabase/migrations/0001_init.sql` chứa toàn bộ 6 bảng (profiles, module_progress, quiz_results, time_logs, chat_usage, leads) + RLS policies theo CLAUDE.md §6. Hướng dẫn user paste vào Supabase SQL Editor (hoặc dùng Supabase CLI).

## Requirements

- **Functional:** sau khi chạy migration, 6 bảng tồn tại; RLS bật; policy hoạt động đúng (user A không đọc được data user B).
- **Non-functional:** schema idempotent (chạy lại không vỡ); có comment tiếng Việt giải thích từng bảng.

## Architecture

- Migration đơn `0001_init.sql` — gộp schema + RLS để 1 thao tác paste là xong (giữ KISS cho tuần 1).
- Dùng `gen_random_uuid()` (pgcrypto, đã enabled mặc định trên Supabase).
- Bảng `leads` có policy INSERT anonymous; không có SELECT → ẩn danh không đọc lại được.
- Bảng `profiles` tự động tạo khi user đăng ký (Phase 5 thêm trigger `on_auth_user_created`).

## Related Code Files

- Create:
  - `supabase/migrations/0001_init.sql` — full schema theo CLAUDE.md §6
  - `docs/ops/supabase-setup.md` — hướng dẫn user setup Supabase project + chạy migration

## Implementation Steps

1. Tạo `supabase/migrations/0001_init.sql` chứa:
   - 6 `CREATE TABLE` statements (profiles, module_progress, quiz_results, time_logs, chat_usage, leads).
   - 1 `CREATE INDEX` cho `chat_usage (user_id, used_at)`.
   - 6 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
   - Policies user-scoped cho 5 bảng (select/insert/update với `auth.uid() = user_id`).
   - Policy `leads`: chỉ INSERT anonymous.
2. Tạo `docs/ops/supabase-setup.md` hướng dẫn:
   - Tạo Supabase project (free tier).
   - Lấy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Paste `0001_init.sql` vào SQL Editor → Run.
   - Verify policy bằng cách test insert ẩn danh vào `leads`.
3. User chạy migration trên Supabase project của họ.
4. Verify bằng `psql` hoặc Supabase Table Editor.

## Success Criteria

- [ ] File `supabase/migrations/0001_init.sql` tồn tại, idempotent.
- [ ] User chạy được trên Supabase project (xác nhận thủ công).
- [ ] 6 bảng hiện diện trong Supabase Table Editor.
- [ ] RLS bật (icon khóa hiển thị) trên cả 6 bảng.
- [ ] Test insert ẩn danh vào `leads` thành công; SELECT trả empty (policy không cho đọc).

## Risk Assessment

- ⚠ **User chưa có Supabase project:** Phase này blocking cho Phase 4. **Mitigation:** docs/ops/supabase-setup.md hướng dẫn từng bước; có thể skip Phase 4 nếu chưa có project, chỉ làm Phase 5 + 6 trước.
- ⚠ **Tên policy có khoảng trắng:** Postgres cho phép, nhưng cần quote. Dùng kebab-case-no-spaces để an toàn.
