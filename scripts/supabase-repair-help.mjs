#!/usr/bin/env node
/**
 * In hướng dẫn baseline khi DB đã apply migration thủ công qua SQL Editor.
 */

const LEGACY = [
  "0001",
  "0002",
  "0003",
  "0004",
  "0005",
  "0006",
  "0007",
  "0008",
  "0009",
  "0010",
  "0011",
  "0012",
];

const TIMESTAMP = [
  "20260608150000",
  "20260610100000",
  "20260610110000",
  "20260610120000",
  "20260610130000",
  "20260611100000",
  "20260611110000",
  "20260611120000",
  "20260611130000",
  "20260611140000",
  "20260611150000",
  "20260611160000",
  "20260611170000",
  "20260611180000",
  "20260612100000",
  "20260612110000",
  "20260612120000",
  "20260612130000",
];

const ALL = [...LEGACY, ...TIMESTAMP];

console.log(`
Supabase migration repair — dùng khi remote đã có schema (paste SQL Editor)
nhưng CLI chưa biết migration nào đã apply.

Quy tắc tên file mới: YYYYMMDDHHMMSS_<noi-dung>.sql — xem npm run db:validate

1. Kiểm tra trạng thái:
   npm run db:status

2. Đánh dấu migration cũ là "applied" (theo thứ tự đã chạy trên remote):

   Legacy 0001–0012:
   for v in ${LEGACY.join(" ")}; do
     npx supabase migration repair --status applied "$v"
   done

   Timestamp (nếu đã paste / push):
   for v in ${TIMESTAMP.join(" ")}; do
     npx supabase migration repair --status applied "$v"
   done

   Hoặc từng lệnh: npx supabase migration repair --status applied 20260610100000

3. Push migration mới:
   npm run db:push

Docs: https://supabase.com/docs/reference/cli/supabase-migration-repair
`);
