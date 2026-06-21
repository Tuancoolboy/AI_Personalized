# Tóm tắt thay đổi cho đồng đội (cập nhật 2026-06-13)

> Đợt làm lớn: bổ sung Phase 2 + 3 thay đổi UX + tool theo phòng ban/cá nhân/file + nền SaaS + khu Quản trị.
> Tất cả nằm trên **6 PR xếp chồng (#22 → #27), CHƯA merge**. Review & merge theo đúng thứ tự.

## 1. Đã thêm gì (theo nhóm)

**Phase 2 — nền sản phẩm**
- Aha Moment (3 câu + AI hỏi lại 1 câu + chọn phạm vi chia sẻ) thay "Bước 4 cảm nghĩ".
- Leaderboard + bảng tin (`/bang-xep-hang`): bảng tuần + bảng tổng, điểm đa nguồn (học/chia sẻ/thử thách), feed phòng + công ty.
- Builder lộ trình theo kỹ năng; nội dung HR/Hành chính chi tiết hơn; lộ trình "Nền tảng" (cờ `isFoundation`).
- **Nền SaaS phân tầng (§0.2):** `platform_admin` > `org_admin/manager` > `member`; cô lập đa tổ chức (RLS); `account_type` company/individual; audit log; `lib/rbac.ts` + `lib/audit-log.ts`.

**3 thay đổi UX**
- Chấm bài bằng rubric + nhận ô paste text (mở rộng `/api/practice-review`, KHÔNG dùng `/api/chat`).
- Prompt mẫu hiển thị động theo công cụ AI đã chọn.
- Công cụ AI: tool chính + tool chuyên dụng theo bài (`lib/ai-tools-config.ts`, `lib/ai-tool-helper.ts`).

**Phần C — tool theo phòng ban / cá nhân / file**
- Chọn công cụ AI **theo từng phòng ban** (`/quan-ly/cai-dat`), lộ trình của phòng dùng tool đó.
- Builder **đảo cấp**: set theo phòng ban trước → override cá nhân sau.
- Màn bài học hiện đúng tool của phòng + "Bạn đã có tài khoản chưa?" → video hướng dẫn (`videoGuide`).
- Luồng **Cá nhân**: gợi ý công cụ theo vị trí sau bài test (`lib/individual-tool-suggest.ts`).
- **File mẫu đính kèm** mọi bài thực hành (7 file ẩn danh có "điểm bẫy" trong `public/files/`) — để chấm đáp án đúng.

**Khu Quản trị (super-admin)**
- `/quan-tri` cho `platform_admin`, **mức XEM (read-only)**: tổng quan, công ty, người dùng, nhật ký hoạt động.
- Gán quyền theo email `lucas.ai.vn@gmail.com` (migration 0021, không nhúng mật khẩu).

**Migrations mới:** 0018 (nền RBAC/SaaS) · 0019 (file đính kèm) · 0020 (tool theo phòng/cá nhân) · 0021 (seed platform_admin). Mỗi migration có khối ROLLBACK.

## 2. Thứ tự merge (QUAN TRỌNG — xếp chồng)
`#22 → develop`, rồi `#23 → #24 → #25 → #26 → #27`. Merge tuần tự; sau mỗi lần merge, đổi base PR sau về `develop` nếu GitHub chưa tự cập nhật. KHÔNG nhảy thứ tự.

## 3. Chất lượng
Mỗi cụm: `eslint` sạch · `vitest` 65/65 · `next build` exit 0 (Node 20). Commit chọn lọc, không commit `.env`.

## 4. Tài liệu nghiệm thu đã chuẩn bị
- `docs/architecture_diagram.md` — sơ đồ components + data flow + phân tầng quyền.
- `README.md` — mục "Chạy Agent với LLM thật": env vars + câu hỏi mẫu.
- `eval/results/report.md` — khung 5 test case (điền output thật khi bật LLM).
- `docs/video-demo-script-3min.md` — kịch bản quay demo.

## 5. Còn lại / follow-up (chưa làm)
- 🔴 **Bật `OPENAI_API_KEY` thật** để Trợ lý AI + chấm bài chạy OpenAI (đạt tiêu chí "không mock"); chạy 5 eval + quay video.
- Khu Quản trị: hiện **read-only** → thêm **quyền điều khiển (SET)** sau (tạo/khóa công ty, đổi quyền, gán admin…) — làm bài bản, có audit + xác nhận 2 bước.
- Real-mode: khu Quản trị đọc dữ liệu thật qua service-role; hiển thị gợi ý tool cá nhân trong onboarding; persistence dept-tool/user_tool_status; Google OAuth callback.
- ⚠ **Bảo mật:** đổi mật khẩu super-admin mạnh; **không để demo-login (gõ đúng email là vào) lên production.**
