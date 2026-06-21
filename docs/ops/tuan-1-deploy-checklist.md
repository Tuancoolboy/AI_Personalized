# Tuần 1 — Checklist deploy & verify

> Code tuần 1 đã hoàn thành. File này liệt kê **các bước user phải làm** để landing thật sự live và thu lead được.

## ✅ Đã xong (code-side)

- [x] Next.js 16 + Tailwind v4 + shadcn/ui init
- [x] Landing page `/` đầy đủ hero + 3 trụ cột + form
- [x] API `/api/leads` (Supabase insert + rate-limit 10/giờ/IP)
- [x] Supabase migration `0001_init.sql` + `0002_profiles_trigger.sql`
- [x] Auth `/login` + `/register` UI + middleware (proxy) bảo vệ `(app)`
- [x] Git repo initialized + initial commit
- [x] `.env.example` template + `.gitignore` đúng

## ⏳ User cần làm

### 1. Supabase project (15 phút)
Theo [supabase-setup.md](./supabase-setup.md):
- [ ] Tạo project trên supabase.com (region Singapore, free tier).
- [ ] Lấy 3 keys: URL + anon + service_role.
- [ ] Paste `supabase/migrations/0001_init.sql` vào SQL Editor → Run.
- [ ] Paste `supabase/migrations/0002_profiles_trigger.sql` vào SQL Editor → Run.
- [ ] **Tắt email confirmation** trong dev (Auth → Providers → Email → bỏ tick "Confirm email").
- [ ] Verify: Table Editor có 6 bảng (`profiles`, `module_progress`, `quiz_results`, `time_logs`, `chat_usage`, `leads`) với icon khóa RLS.

### 2. `.env.local` cho dev (1 phút)
```bash
cp .env.example .env.local
```
Điền 3 Supabase keys. `OPENAI_API_KEY` để trống tuần 1.

Sau đó `npm run dev` → test:
- [ ] `localhost:3000/register` → tạo tài khoản (email bất kỳ) → tự redirect `/onboarding` (placeholder).
- [ ] Logout (button trong nav) → quay lại landing.
- [ ] `localhost:3000/login` → đăng nhập lại được.
- [ ] `localhost:3000/lo-trinh` chưa login → redirect `/login?next=%2Flo-trinh`.
- [ ] Submit form landing → check Supabase Table Editor → bảng `leads` có row mới.

### 3. GitHub repo (5 phút)
- [ ] Tạo private repo trên github.com (tên: `ai-tro-ly`).
- [ ] Add remote + push:
  ```bash
  git remote add origin https://github.com/<user>/ai-tro-ly.git
  git push -u origin main
  ```
  Hoặc dùng `gh`: `gh repo create ai-tro-ly --private --source=. --push`.

### 4. Vercel deploy (10 phút)
- [ ] vercel.com/new → Import GitHub repo `ai-tro-ly`.
- [ ] Framework: Next.js (auto-detect). Giữ build command default.
- [ ] **Environment Variables** → Add 3 keys (apply Production + Preview + Development):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Deploy → đợi 2-3 phút.

### 5. Smoke test production (5 phút)
- [ ] Mở `https://<your-project>.vercel.app` → landing hiển thị.
- [ ] Submit form email thật → check Supabase `leads` table → có row mới.
- [ ] Register tài khoản → vào được `/onboarding` placeholder.
- [ ] Logout → quay lại landing.

### 6. Bắt đầu thu lead 🎉
- [ ] Share URL Vercel cho 5–10 NV mục tiêu (P1: nhân viên SME 10–200 người).
- [ ] Mỗi tuần check bảng `leads` Supabase + tổng số đăng ký.

## 🐞 Nếu gặp lỗi

| Triệu chứng | Nguyên nhân thường gặp | Fix |
|---|---|---|
| `/` trả 500 | Thiếu env vars Vercel | Add `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` |
| `/register` báo "Email không hợp lệ" | Email confirmation bật | Tắt trong Supabase Auth settings hoặc check mail confirm |
| Submit landing không vào `leads` | Service role key sai HOẶC RLS policy thiếu | Check `.env.local` + chạy lại migration `0001` |
| `/lo-trinh` redirect lặp vô tận | Cookie expired sau khi reset Supabase project | Clear cookies browser, login lại |

## Tuần 2 sẽ build gì

Theo [CLAUDE.md §15](../CLAUDE.md):
- Onboarding chọn vai trò (5 lựa chọn).
- `lib/roles.ts` đầy đủ 5 template (kinh-doanh, ke-toan, marketing, van-hanh, khac) — mỗi vai trò ≥3 module + starter kit + ≥3 câu quiz.
- Profile lưu `role_id` sau khi user chọn.

Mỗi tuần sẽ có plan riêng trong `planning/sprints/`.
