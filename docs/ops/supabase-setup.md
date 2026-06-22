# Hướng dẫn setup Supabase cho AI Trợ Lý

> Áp dụng 1 lần khi khởi tạo dự án. Sau đó dev/prod đều dùng cùng cấu trúc bảng.

## 1. Tạo Supabase project (free tier)

1. Truy cập [supabase.com](https://supabase.com) → đăng nhập GitHub.
2. **New project**:
   - Name: `ai-tro-ly` (hoặc `ai-tro-ly-dev` nếu muốn tách dev/prod).
   - Database Password: chọn mạnh, lưu vào password manager.
   - Region: **Southeast Asia (Singapore)** — gần Vietnam nhất.
   - Plan: Free.
3. Chờ ~1 phút project khởi tạo.

## 2. Lấy keys + URL

Sau khi project ready, vào **Settings → API**:

| Tên | Dùng ở đâu | Mức nhạy cảm |
|---|---|---|
| `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` | Public OK |
| `publishable` public key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public OK |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public OK — alias legacy, app vẫn fallback được |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` | **BÍ MẬT** — chỉ server, không lộ client |

Copy `Project URL`, `publishable key`, và `service_role` vào `.env.local` (không commit) + Vercel dashboard (Production + Preview). Nếu project cũ vẫn đang dùng `NEXT_PUBLIC_SUPABASE_ANON_KEY`, app hiện vẫn tương thích.

Thêm cho **Supabase CLI auto-sync** (khuyến nghị):

| Tên | Dùng ở đâu | Ghi chú |
|---|---|---|
| Database Password | `SUPABASE_DB_PASSWORD` | Settings → Database |
| Personal Access Token | `SUPABASE_ACCESS_TOKEN` | [Account tokens](https://supabase.com/dashboard/account/tokens) — tuỳ chọn nếu đã `supabase login` |

## 3. Chạy migration (CLI — khuyến nghị)

Repo dùng **Supabase CLI** để tự push migration trước `npm run dev` / `npm run start`.

### 3.1 Setup một lần

```bash
# Đăng nhập CLI (hoặc dùng SUPABASE_ACCESS_TOKEN trong .env.local)
npx supabase login

# Link project remote (đọc project ref từ NEXT_PUBLIC_SUPABASE_URL)
npm run db:link
```

`npm run db:link` hỏi database password nếu chưa có `SUPABASE_DB_PASSWORD` trong `.env.local`.

### 3.2 Workflow hàng ngày

```bash
npm run dev
# → predev tự chạy: npm run db:sync → supabase db push (migration mới)
```

Lệnh thủ công:

| Lệnh | Mục đích |
|---|---|
| `npm run db:sync` | Push migration pending lên remote |
| `npm run db:status` | Xem migration đã/chưa apply |
| `npm run db:push` | Giống sync (không qua predev) |
| `npm run db:repair:help` | Hướng dẫn baseline nếu DB đã paste SQL Editor trước đó |

Tắt auto-sync: thêm `SUPABASE_DB_SYNC=false` vào `.env.local`.

Bắt buộc link trước khi dev (strict): `SUPABASE_DB_SYNC_STRICT=true`.

### 3.3 Fallback: SQL Editor (thủ công)

Nếu chưa dùng CLI, chạy lần lượt trong **SQL Editor** (mỗi file một query):

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_profiles_trigger.sql`
3. `supabase/migrations/0003_employee_profile_assessment.sql`
4. `supabase/migrations/0004_learning_modules.sql`
5. `supabase/migrations/0005_events.sql`
6. `supabase/migrations/0006_module_practice_submissions.sql`
7. `supabase/migrations/0007_practice_submission_history.sql` — lịch sử nộp + bucket `practice-images`
8. `supabase/migrations/0008_multi_manager_core.sql` — organization + membership cho manager thật / multi-manager
9. `supabase/migrations/0009_profile_full_name_metadata.sql` — lưu họ tên từ form đăng ký vào `profiles.full_name`
10. `supabase/migrations/0010_profile_phone_number.sql` — lưu số điện thoại từ form đăng ký vào `profiles.phone_number`
11. `supabase/migrations/0011_company_invite_links.sql` — link mời token-only theo công ty/quản lý
12. `supabase/migrations/0012_chat_memory.sql` — chat memory + conversations (BE-12)
13. `supabase/migrations/20260608150000_image_paths_column.sql` — cột `image_paths` (nếu thiếu sau 0007)
14. `supabase/migrations/20260610100000_profiles_email_invite_expiry.sql` — `profiles.email` + invite expiry/usage cap
15. `supabase/migrations/20260610110000_manager_private_organizations.sql` — công ty riêng cho từng manager
16. `supabase/migrations/20260610120000_single_organization_membership.sql` — một user một công ty
17. `supabase/migrations/20260610130000_organization_slug_settings.sql` — slug công ty, `/c/[slug]`
18. `supabase/migrations/20260611100000_aha_reflections.sql` — Aha Moment (mentor)
19. `supabase/migrations/20260611110000_skills_module_skills.sql` — skills + module map
20. `supabase/migrations/20260611120000_job_positions_learning_paths.sql` — manager path builder
21. `supabase/migrations/20260611130000_leaderboard_points.sql` — leaderboard + points
22. `supabase/migrations/20260611140000_org_ai_tool_module_tool.sql` — org AI tool + module tool
23. `supabase/migrations/20260611150000_saas_rbac_foundation.sql` — RBAC 3 tầng
24. `supabase/migrations/20260611160000_learning_modules_attached_file.sql` — file đính kèm bài
25. `supabase/migrations/20260611170000_department_ai_tools.sql` — tool theo phòng ban
26. `supabase/migrations/20260611180000_seed_platform_admin_email.sql` — seed platform admin
27. `supabase/migrations/20260612100000_learning_content_schema.sql` — lộ trình, assignment (Agent 3)
28. `supabase/migrations/20260612110000_assessment_grading_schema.sql` — grading_results (Agent 2)
29. `supabase/migrations/20260612120000_learning_profile.sql` — BE-13 dual knowledge profile
30. `supabase/migrations/20260612130000_generated_learning_paths.sql` — agent generated paths
31. `supabase/migrations/20260616194500_chat_conversations_delete_policy.sql` — quyền xoá hội thoại
32. `supabase/migrations/20260618134858_onboarding_assessment_results.sql` — kết quả assessment onboarding
33. `supabase/migrations/20260619120000_hr_role.sql` — role Nhân sự
34. `supabase/migrations/20260619143000_onboarding_assessment_nhan_su.sql` — assessment Nhân sự
35. `supabase/migrations/20260620080312_learning_study_sessions.sql` — phiên học thật
36. `supabase/migrations/20260621183748_hoc_tap_rooms_community_avatar.sql` — room quiz Supabase
37. `supabase/migrations/20260622054535_allow_cross_org_hoc_tap_room_join.sql` — preview/join room bằng mã giữa các công ty

Nếu API báo `image_paths does not exist` → chạy `20260608150000_image_paths_column.sql`.

Migration idempotent — chạy lại không vỡ.

Sau bước 4, seed 30 bài học:

```bash
npm run seed:modules
```

(Lệnh tự đọc `.env.local` — cần `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.)

## 4. Verify

### 4.1 Bảng đã tạo
Vào **Table Editor** → đảm bảo có các bảng chính:
- `profiles`
- `module_progress`
- `quiz_results`
- `time_logs`
- `chat_usage`
- `leads`
- `learning_modules`
- `events`
- `module_practice_submissions`
- `organizations`
- `organization_members`
- `organization_invite_links`

Mỗi bảng phải có icon **khóa** bên cạnh (RLS đã bật).

### 4.2 Insert ẩn danh vào `leads` chạy được
**SQL Editor** → New query:
```sql
-- Giả lập anon role
set local role anon;
insert into leads (email, name, source) values ('test@example.com', 'Tên thử', 'sql-test');
-- Kết quả: 1 row inserted ✓
```

### 4.3 Xem leads trong app (quản lý)

Đăng nhập bằng email quản lý (`quanly@…`, `manager@…`) → **Đăng ký** trên nav hoặc `/quan-ly/leads`.

API `GET /api/leads` dùng service role server-side — nhân viên không đọc được.

### 4.4 Anon KHÔNG đọc được leads (SQL trực tiếp)
```sql
set local role anon;
select * from leads;
-- Kết quả: 0 rows (đúng — không có policy SELECT cho anon) ✓
```

### 4.4 User chỉ đọc được data của chính mình
Sau khi có user thật (Phase 5), test trong SQL Editor:
```sql
-- Thay <user-uuid> bằng id của user vừa tạo
set local role authenticated;
set local request.jwt.claims to '{"sub":"<user-uuid>","role":"authenticated"}';
select * from module_progress; -- Chỉ thấy rows của user này
```

### 4.5 Manager thật / multi-manager

Sau `0008`, real-mode manager không còn dựa vào email pattern lúc runtime.
Migration chỉ backfill một lần các email kiểu `manager@`, `quanly@`, `hr@`,
`admin@` thành membership manager trong `Tổ chức mặc định`; chạy thêm `0014`
để tách mỗi manager sang công ty riêng dạng `Công ty của <email>`, rồi `0015`
để khóa mỗi Auth user/email chỉ có một membership công ty.

Để nâng một user thành manager thật, dùng helper SQL để tạo công ty riêng cho
email đó. Mở `supabase/scripts/promote-manager-private-org.sql`, thay email,
rồi chạy trong SQL Editor:

```sql
-- Copy toàn bộ file:
-- supabase/scripts/promote-manager-private-org.sql
-- rồi thay ronaldo36@gmail.com bằng email manager cần promote.
```

Manager đăng nhập → `/quan-ly` đọc team theo `organization_members` trong công
ty riêng của họ. Nhân viên không vào được `/quan-ly`.

Rule hiện tại: một tài khoản chỉ được tham gia một công ty. Nếu
`mixi@gmail.com` đã thuộc công ty A, công ty B không thể thêm email này bằng
modal quản lý hoặc link mời. Muốn chuyển công ty phải làm thao tác admin/manual
có chủ đích, không tự động chuyển trong app.

Quản lý thêm nhân viên thật tại `/quan-ly/nhan-vien`:

1. Nhân viên đăng ký tài khoản trước.
2. Manager nhập email công ty của tài khoản đó.
3. Tick **Cấp quyền quản lý** nếu người đó cũng là manager. Khi tick, app tạo
   công ty riêng cho email đó thay vì thêm họ làm manager trong công ty hiện tại.
4. App dùng Supabase Auth Admin để tìm user theo email, tự lấy
   `profiles.full_name`, `profiles.phone_number`, `profiles.role_id` nếu có,
   rồi ghi `organization_members`.
5. Nếu email đã thuộc công ty khác, API trả lỗi conflict và không ghi thêm row.

Manager cũng có thể dùng mục **Link mời** trong `/quan-ly/nhan-vien`:

1. Bấm **Tạo link mời** để lấy URL dạng `/moi/[token]`.
2. Gửi link cho nhân viên.
3. Nhân viên đăng ký hoặc đăng nhập từ link, rồi hệ thống tự ghi
   `organization_members` với `member_role = employee` và `department_id = khac`.
4. Nếu tài khoản đã thuộc công ty khác, trang link mời hiển thị lỗi và không
   thêm membership mới.
5. Bấm **Đổi token** nếu cần vô hiệu link cũ.

### 4.6 Room quiz giữa hai account

Sau migration `20260622054535_allow_cross_org_hoc_tap_room_join.sql`, danh sách
room vẫn chỉ hiện room thuộc công ty hiện tại. Tuy nhiên, một account đăng nhập
khác có thể mở `/hoc-tap/phong/[code]`, xem metadata sảnh chờ an toàn và bấm
**Vào phòng** bằng mã toàn cục. RPC chỉ cấp quyền room sau khi tạo participant
gắn với `auth.uid()`; metadata trước join không chứa bộ câu hỏi hoặc đáp án.

Nếu account thứ hai vẫn nhận `404` sau khi deploy code, chạy:

```bash
npm run db:sync
npm run db:status
```

và xác nhận migration `20260622054535` đã có trên đúng project Supabase mà
Vercel đang dùng.

## 5. Auth URL + email confirmation

### 5.1 Site URL & Redirect (bắt buộc)

**Authentication → URL Configuration**:

| Field | Local dev | Production |
|---|---|---|
| Site URL | `http://localhost:3000` | URL Vercel của bạn |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://<domain>/auth/callback` |

App có route `app/auth/callback/route.ts` — đổi `?code=` thành session cookie rồi vào `/onboarding`.

Nếu link email về `http://localhost:3000/?code=...` (Site URL gốc), `proxy.ts` tự chuyển sang `/auth/callback`. Link hết hạn → trang `/verified?status=error`.

### 5.2 Tắt email confirmation (khuyến nghị trong dev)

Mặc định Supabase bắt user verify email mới được login → **đăng ký thành công nhưng đăng nhập báo sai mật khẩu**.

**Authentication → Providers → Email** → bỏ tick **"Confirm email"** → Save.

Sau khi tắt: đăng ký mới có thể tạo session tức thì ở Supabase, nhưng app sẽ
đăng xuất session đó và chuyển về `/login?registered=1` để user đăng nhập rõ
ràng trước khi vào onboarding hoặc accept link mời. User đã tạo trước đó vẫn
cần xác nhận email hoặc xóa user trong **Authentication → Users** rồi đăng ký lại.

⚠ **Bật lại trước production** (Phase 6).

### 5.3 Google OAuth (Phase 2.1)

App hỗ trợ **Đăng nhập / đăng ký bằng Google** trên `/login` và `/register`.
Luồng dùng Supabase PKCE — callback tại `/auth/callback` (giữ query `next` cho
link mời `/moi/[token]` hoặc trang công ty `/c/[slug]`).

#### Bật provider trên Supabase

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials** → **Create OAuth client ID** (Web application).
2. **Authorized JavaScript origins:**
   - `http://localhost:3000` (dev)
   - URL production Vercel
3. **Authorized redirect URIs** (Supabase callback, không phải app):
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   - Lấy chính xác tại **Authentication → Providers → Google** trên Supabase Dashboard.
4. Supabase **Authentication → Providers → Google** → bật, dán Client ID + Client Secret → Save.

#### Redirect URLs app (bắt buộc)

Thêm vào **Authentication → URL Configuration → Redirect URLs**:

```
http://localhost:3000/auth/callback
http://localhost:3000/**
https://<domain-production>/auth/callback
https://<domain-production>/**
```

Wildcard `/**` cho phép callback kèm `?next=/moi/...`.

#### Kiểm tra nhanh

1. Mở `/login` → **Đăng nhập bằng Google**.
2. Sau khi Google redirect về, app vào `/onboarding` (hoặc `next` nếu có).
3. Với link mời: `/moi/[token]` → đăng nhập Google → quay lại trang mời → bấm tham gia.

Google user mới: trigger `handle_new_user` lấy `raw_user_meta_data.name` vào `profiles.full_name`.
Email/password hiện có vẫn hoạt động song song.

## 6. Reset Supabase dev database

Chỉ dùng cho **dev/test project** khi muốn xóa dữ liệu hiện tại và đăng ký lại
từ đầu. Script này xóa app data và `auth.users`, nhưng không xóa schema, bucket,
storage objects, migration files, `.env.local`, hoặc secrets:

```sql
-- Supabase SQL Editor
-- Copy toàn bộ file này rồi Run:
-- supabase/scripts/reset-dev-database.sql
```

Sau khi reset:

1. Chạy lại migrations `0001` → `0015` nếu cần đảm bảo schema mới nhất.
2. Seed lại bài học:

```bash
npm run seed:modules
```

3. Đăng ký lại user, rồi dùng `promote-manager-private-org.sql` cho từng email
   manager như `vuhaituan@gmail.com` và `ronaldo36@gmail.com`.

Nếu muốn xóa ảnh trong bucket `practice-images`, dùng Supabase Storage UI hoặc
Storage API. Supabase không cho xóa trực tiếp `storage.objects` bằng SQL.

## 7. Troubleshooting

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `relation "auth.users" does not exist` | Project chưa init xong | Đợi 1-2 phút, refresh dashboard, chạy lại |
| `permission denied for table leads` khi insert anon | RLS bật nhưng policy chưa tạo | Chạy lại migration `0001_init.sql` |
| `column "passed" is generated` warning | OK — đây là computed column từ `score >= 70` | Bỏ qua |
| Đăng ký OK nhưng không đăng nhập được | Email confirmation bật, chưa xác nhận email | Tắt Confirm email (dev) hoặc mở link xác nhận; thêm Redirect URL `.../auth/callback` |
| Link xác nhận email mở ra lỗi | Thiếu Redirect URL hoặc Site URL sai | Cấu hình mục 5.1 |

## 8. Migrations sau

### 8.1 Bài học lộ trình (`learning_modules`)

Sau `0001`–`0003`, chạy thêm:

1. `supabase/migrations/0004_learning_modules.sql` — bảng nội dung bài học
2. Seed dữ liệu (30 bài = 5 vai trò × 6 module):

```bash
npm run seed:modules
```

(Lệnh tự đọc `.env.local` — cần `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`.)

(Lệnh cần `.env.local` có `SUPABASE_SERVICE_ROLE_KEY`.)

## 9. Migrations sau

### 9.1 Quy tắc đặt tên (bắt buộc từ 2026-06-15)

Mọi migration **mới** phải dùng format Supabase CLI:

```text
YYYYMMDDHHMMSS_<noi-dung-kebab>.sql
```

```bash
npx supabase migration new add_my_feature
# → supabase/migrations/<timestamp>_add_my_feature.sql
```

**Cấm** `0017_xxx.sql`, `0024_xxx.sql` — gây trùng số giữa nhánh. Chi tiết: `.agents/rules/supabase-migrations.md`.

Kiểm tra trước commit / trước push:

```bash
npm run db:validate
```

Legacy `0001`–`0012` giữ nguyên; từ migration 13 repo dùng timestamp (mục 3.3).

### 9.2 Workflow

**Quy trình chuẩn:** commit migration → `npm run dev` (auto `db:sync`) hoặc `npm run db:push`.

Cấu hình CLI: `supabase/config.toml` (đã init). Link state nằm ở `supabase/.temp/` (gitignored).
