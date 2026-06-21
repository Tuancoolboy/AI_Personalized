---
description: "Quy tắc đặt tên và thứ tự Supabase migration — bắt buộc từ 2026-06-15"
activation: always-on
---

# Supabase Migrations — Bắt buộc

> Canonical source. Mirror: `.cursor/rules/supabase-migrations.mdc`, `docs/supabase-setup.md` §3.4, `AGENTS.md`.

## 1. Đặt tên file (bắt buộc từ 2026-06-15)

Mọi migration **mới** phải dùng format Supabase CLI:

```text
YYYYMMDDHHMMSS_<noi-dung-kebab>.sql
```

| Thành phần | Quy tắc |
|---|---|
| Timestamp | **14 chữ số** UTC — `supabase migration new <name>` hoặc `date -u +%Y%m%d%H%M%S` |
| Nội dung | kebab-case tiếng Anh, không dấu, mô tả ngắn schema/feature |
| Ví dụ | `20260615143000_add_quiz_attempt_limits.sql` |

**Cấm** tạo file kiểu `0017_xxx.sql`, `0023_xxx.sql`, `0007b_xxx.sql` — gây trùng số giữa nhánh và `supabase db push` fail.

## 2. Legacy (chỉ đọc, không thêm mới)

Các file `0001_init.sql` … `0012_chat_memory.sql` là nền Giai đoạn 1 — **giữ nguyên**, không đổi tên trên DB đã apply. Từ migration thứ 13 trở đi repo đã chuyển sang timestamp (xem `docs/supabase-setup.md`).

## 3. Thứ tự & phụ thuộc

- Timestamp **phải tăng** theo thời gian apply (file mới > file cũ).
- Migration phụ thuộc bảng/RLS helper → timestamp **sau** migration tạo nền đó.
- Mỗi file: idempotent khi có thể + block `-- rollback` ở cuối (theo `PHASE2-SPEC.md` DoD).

## 4. Workflow agent

Trước khi commit migration:

```bash
npm run db:validate          # kiểm tra tên file
npm run db:status            # xem pending trên remote (nếu đã link)
```

Sau khi thêm migration:

- Append change-log `specs/PROJECT-CONTINUATION.md`
- Cập nhật `docs/supabase-setup.md` nếu thêm bảng/RLS quan trọng
- Ghi `WORKLOG.md` nếu quyết định schema đáng kể

**Không** sửa nội dung file migration đã merge lên `develop`/production — tạo migration timestamp mới để ALTER.

## 5. Tạo migration mới (CLI)

```bash
npx supabase migration new add_my_feature
# → supabase/migrations/<timestamp>_add_my_feature.sql
```

Hoặc thủ công: lấy timestamp UTC hiện tại, đảm bảo lớn hơn mọi file trong `supabase/migrations/`.
