# Demo Plan — Team 9 / AI20K-083

> Deadline: 08/06/2026. Owner: cả team. Đã ship sẵn demo flow chạy không cần backend.

## Demo accounts (demo mode — không cần Supabase)

| Email | Mật khẩu | Vào đâu |
|---|---|---|
| `nhanvien@congty.vn` | bất kỳ | Employee flow: onboarding → lộ trình |
| `quanly@congty.vn` | bất kỳ | Manager dashboard với team data mock |

Detect tự động qua email pattern. Khi có Supabase thật → load `profiles.user_type`.

## Kịch bản demo (5 phút)

### 0. Setup (trước khi demo, 30s)

- Mở terminal: `npm run dev` → đợi `Ready in 233ms`
- Mở browser ẩn danh tab 1 nhân viên, tab 2 quản lý
- Đảm bảo có demo banner cam ở đầu (xác nhận demo mode active)

### 1. Đặt vấn đề (45s) — slide thầy + giọng

- "Đào tạo AI offline 2-5tr/người/lần, nội dung chung chung, không đo được"
- "Team 9 build web app: lộ trình AI cá nhân hóa theo vai trò, tutor AI giải thích bằng ví dụ đúng nghề, dashboard cho quản lý"

### 2. Demo Employee flow (3 phút)

#### A. Login như nhân viên (10s)

→ `localhost:3000/login` → nhập `nhanvien@congty.vn` + bất kỳ → click Đăng nhập

#### B. Onboarding 4 bước (1 phút)

- Bước 1: chọn vai trò **Kinh doanh** (highlight: "có thể chọn 4 vai trò khác nhau")
- Bước 2: giải thích "tại sao cần 6 câu" — nói: "đây là khác biệt với khóa cũ"
- Bước 3: trả lời nhanh 6 câu (multi-chip Q3 + Q6 chọn 2-3 chip) — highlight: "phân biệt người mới với người giỏi"
- Bước 4: kết quả ring score 2/5 + breakdown lộ trình — highlight: "ai >5 điểm thì auto skip 2 module nhập môn"

#### C. Lộ trình (45s)

- Click "Bắt đầu học ngay" → /lo-trinh
- Show hero ring 0% + tag "trình độ AI hiện tại"
- Scroll xuống 3 prompt cards — click Copy 1 prompt → highlight "copy-paste vào ChatGPT là dùng được"
- Scroll xuống 4 tool cards — highlight "không bị overwhelm — chỉ 4 công cụ chính theo nghề"
- Scroll xuống timeline 6 module — click module 1 → modal mở → click "✓ Đánh dấu hoàn thành" → scroll lên cho thấy ring đã thành 17%

#### D. Trợ lý AI (45s)

- Click nav "Trợ lý AI" → /tro-ly
- Click suggestion chip "Khách nói 'đắt quá', em trả lời sao với AI?"
- Đợi typing animation → response hiện ra với 3 cách trả lời cụ thể (highlight: "ví dụ từ đúng nghề bán hàng, không chung chung")

#### E. Kiểm tra (30s)

- Click nav "Lộ trình" → click "Làm bài kiểm tra" terracotta
- Trả lời 3 câu → cho 1 sai 1 đúng để show feedback xanh đỏ
- Hiện ring score cuối

#### F. Tiến bộ (20s)

- Click nav "Tiến bộ" → /tien-bo
- Click chip +2h → toast "Đã ghi nhật ký" → hero "2.0 giờ"
- Highlight: "cuối tháng có con số tổng để pitch sếp"

### 3. Demo Manager flow (1 phút)

#### A. Logout + login lại (15s)

- Click "Đăng xuất" → /
- /login → nhập `quanly@congty.vn` → Đăng nhập

#### B. Dashboard quản lý (45s)

- Badge "Quản lý" cam bên cạnh logo (highlight: "tự động detect")
- 4 stat cards: 12 NV / 63% TB / 7 đang học / 81% điểm KT
- Bar chart 4 phòng ban (Marketing dẫn đầu) — "thầy thấy được phòng nào yếu, phòng nào mạnh"
- Donut chart trạng thái — "biết ngay 4 hoàn thành, 7 đang học, 1 chưa bắt đầu"
- Line chart xu hướng 6 tuần đi lên
- Top 6 nhân viên với avatar màu phòng ban + progress bar

#### C. Quản lý nhân viên (15s)

- Click "Quản lý nhân viên" → /quan-ly/nhan-vien
- Filter chip "Kinh doanh (3)" → bảng filter còn 3 người
- Click "+ Thêm nhân viên" → modal mở → highlight "khi có backend sẽ gửi email mời tự động"
- Close modal

### 4. Tóm tắt (30s)

- "Demo bằng localStorage — chạy không cần backend"
- "Đã sẵn sàng wire-up Supabase + OpenAI khi có infra"
- "Tuần tới: deploy Vercel + Supabase project + chạy migration đầy đủ"

## Seed data

- Roles: 4 (kinh-doanh, ke-toan, marketing, van-hanh) trong `lib/roles.ts`
- Mỗi role: 6 module + 3 prompt mẫu + 4 công cụ AI + 3 quiz tình huống
- Team data: 12 nhân viên mock trong `lib/team-data.ts` (3 người × 4 phòng ban)
- Stats trend 6 tuần: hardcoded 8% → 21% → 35% → 48% → 59% → 63% (current)

## Public URL plan

- **Hiện tại:** chỉ chạy local `localhost:3000`
- **Sprint 3:** deploy Vercel preview branch `feat/mvp-tuan-2` → URL `c2-app-009-git-feat-mvp-*.vercel.app`
- **Sprint 4:** production domain `aitroly.vercel.app` hoặc custom domain team

## Risk khi demo

| Risk | Mitigation |
|---|---|
| Chrome cache cũ từ demo lần trước (localStorage dữ liệu lỗi) | Demo trong tab ẩn danh + clear localStorage trước |
| Charts không render trên màn hình chiếu (CSS resize) | Mở DevTools tắt → check viewport 1440px trước demo |
| Suggestion chip không trigger response | Đợi Fast Refresh xong (~1s sau khi load) |
| Modal module bị stuck khi spam click | Build production rồi demo — dev mode có HMR cache |
| Mất mạng → chat AI không load (nếu wire-up real OpenAI) | Demo mode dùng canned response — KHÔNG cần mạng |

## Backup demo

Nếu localhost chết:
- Đã commit code lên branch `feat/mvp-tuan-2` repo `AI20K-Build-Cohort-2/C2-App-009`
- Có thể show GitHub PR + commit history thay thế
- Screenshots all flows đã có trong file `docs/ops/tuan-1-deploy-checklist.md` (sẽ bổ sung)
