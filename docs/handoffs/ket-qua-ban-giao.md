# Kết quả bàn giao — handoff-tong-hop (A → B → C)

> Người làm: Claude Code · Ngày: 2026-06-13
> Mục tiêu: hoàn thiện toàn bộ `docs/handoff-tong-hop.md` (Phần A Phase 2 + B 3 UX + C tool/cá nhân/file)
> + đặt nền kiến trúc SaaS §0.2, rồi đẩy lên GitHub theo đúng thứ tự phụ thuộc.

## TL;DR cho anh khi về
- **5 nhánh** đã push lên GitHub, mỗi nhánh **1 Pull Request**, base ĐÚNG theo chuỗi phụ thuộc.
- **CHƯA merge nhánh nào**, **chưa xóa nhánh nào**, **không commit `.env`** (đúng yêu cầu an toàn).
- Mỗi nhánh đã chạy **eslint + vitest + next build (Node 20) xanh hết** trước khi push.
- Việc anh cần làm: **review & merge theo thứ tự #22 → #23 → #24 → #25 → #26**. Sau khi merge dần,
  có thể đổi base các PR sau về `develop` (GitHub thường tự cập nhật khi nhánh nền merge).

## ▶ Cách chạy DEMO tối nay (không cần Supabase)

Nhánh trên cùng để show = **`feature/admin-superadmin-ui`** (chứa TẤT CẢ: Phase 2 + 3 UX + Phần C + nền §0.2 + khu Quản trị).

```bash
git checkout feature/admin-superadmin-ui
npm run dev          # mở http://localhost:3000  (đang chạy sẵn)
```
> Không có `.env.local` → app tự chạy **demo mode** (localStorage), không cần Supabase.

**Đăng nhập demo (mật khẩu gõ bất kỳ):**
| Vai trò | Email đăng nhập | Vào thẳng |
|---|---|---|
| **Super-admin** | `lucas.ai.vn@gmail.com` | `/quan-tri` — khu Quản trị nền tảng |
| Quản lý / Trưởng phòng | `quanly@congty.vn` | `/quan-ly` — dashboard + feed |
| Nhân viên | `nhanvien@congty.vn` | onboarding → `/lo-trinh` |

**Checklist tính năng để show (đều chạy demo):**
- Lộ trình + bài học 5 bước (`/lo-trinh` → mở 1 bài): tool theo phòng + file mẫu (Bước 1) → **chấm điểm**
  (paste text/ảnh, rubric, demo 40–95) → **Aha Moment** (Bước 4) → tóm tắt.
- **Leaderboard + bảng tin**: `/bang-xep-hang` (3 tab + bảng tuần/tổng) + feed trên dashboard quản lý.
- **Builder theo phòng ban**: `/quan-ly/lo-trinh` (chế độ Theo phòng ban / Theo cá nhân).
- **Chọn công cụ theo phòng**: `/quan-ly/cai-dat` (tool công ty + tool mỗi phòng).
- **Khu Quản trị**: `/quan-tri` (Tổng quan / Công ty / Người dùng cá nhân & công ty / Nhật ký).
- **Luồng cá nhân**: tài khoản cá nhân hiển thị ở khu Quản trị (tab Người dùng); logic gợi ý công cụ theo
  vị trí đã có ở `lib/individual-tool-suggest.ts` (có test) — phần hiển thị trong onboarding là follow-up.

> Lưu ý: bật `OPENAI_API_KEY` (server) thì chấm điểm & câu hỏi Aha dùng AI thật; không có key vẫn chạy
> bằng dữ liệu mẫu/điểm demo, không lỗi.

## Thứ tự phụ thuộc & danh sách PR (merge từ trên xuống)

| Thứ tự | Nhánh | Base (nền) | PR | Nội dung |
|---|---|---|---|---|
| 1 | `feature/phase2-mentor-features` | `develop` | https://github.com/AI20K-Build-Cohort-2/C2-App-009/pull/22 | **Phần A** — 5 tính năng mentor (Aha, HR, builder, invite, leaderboard) + migrations 0013–0016 |
| 2 | `feature/ux-3-changes` | `feature/phase2-mentor-features` | https://github.com/AI20K-Build-Cohort-2/C2-App-009/pull/23 | **Phần B** — tool AI + prompt động + chấm rubric/paste text + migration 0017 |
| 3 | `feature/saas-rbac-foundation` | `feature/ux-3-changes` | https://github.com/AI20K-Build-Cohort-2/C2-App-009/pull/24 | **§0.2** — nền phân quyền 3 tầng + cô lập RLS + audit log + migration 0018 |
| 4 | `feature/sample-files` | `feature/saas-rbac-foundation` | https://github.com/AI20K-Build-Cohort-2/C2-App-009/pull/25 | **Phần C §5** — file mẫu đính kèm bài thực hành + migration 0019 |
| 5 | `feature/dept-tool-individual` | `feature/sample-files` | https://github.com/AI20K-Build-Cohort-2/C2-App-009/pull/26 | **Phần C §1-4** — tool theo phòng ban + Cá nhân/DN + video + migration 0020 |
| 6 | `feature/admin-superadmin-ui` | `feature/dept-tool-individual` | https://github.com/AI20K-Build-Cohort-2/C2-App-009/pull/27 | **Super-admin** — khu Quản trị nền tảng `/quan-tri` (demo) + seed quyền theo email + migration 0021 |

> ⚠️ Vì các PR xếp chồng (stacked): base của PR sau là nhánh trước (chưa merge), **không phải `develop`**.
> Đây là lý do GitHub có thể hiển thị diff gộp — chỉ cần merge tuần tự là sạch.

## Chi tiết từng cụm

### 1) Phần A — Phase 2 (PR #22, base `develop`)
5 tính năng mentor (đã làm từ phiên trước, nay push + mở PR):
Aha Moment (0013) · HR content + skills (0014) · Manager builder (0015) · Invite phòng/vị trí + Google ·
Leaderboard + feed (0016). Demo localStorage fallback + RLS org-scoped.

### 2) Phần B — 3 thay đổi UX (PR #23, base A)
Tool AI chính/chuyên dụng + `getOrgAiTool` (1 nguồn sự thật) + `/quan-ly/cai-dat` (manager-only) +
prompt động theo tool + chấm rubric & ô paste text (JSON parse chống lỗi, demo 40–95) + migration 0017
(`organizations.ai_tool`, `learning_modules.tool`).

### 3) §0.2 — Nền phân quyền SaaS (PR #24, base B) ⭐ ưu tiên
- `platform_admins` + `is_platform_admin()` (security-definer, vượt RLS KHÔNG nới quyền user thường).
- `account_type` ('company'|'individual') trên profiles.
- Policy SELECT platform_admin read-only trên `organizations`, `organization_members`.
- `lib/rbac.ts` (role rank, account_type — pure + server) + `lib/audit-log.ts` (ghi events) wired vào org-settings PUT.
- Chỉ ĐẶT NỀN — chưa làm UI super-admin (đúng tinh thần §0.2).

### 4) Phần C §5 — File mẫu đính kèm (PR #25, base C1) ⭐ ưu tiên
- `attachedFile { name, path, desc }` cho module + migration 0019 (`learning_modules.attached_file`).
- 7 file mẫu ẩn danh trong `public/files/` (công nợ, chi phí 6 tháng, BCQT, CV ứng viên, biên bản họp,
  lịch sử chat, số liệu chiến dịch) — mỗi file cài **điểm bẫy** để luyện học viên phát hiện.
- Bài học hiện hộp tải file mẫu ở Bước 1; nối với chấm rubric (Phần B) để có đáp án chuẩn.

### 5) Phần C §1-4 — Tool theo phòng ban / Cá nhân / Video (PR #26, base C2)
- §1 Tool AI theo **phòng ban** (`getDeptAiTool`) + chọn mỗi phòng ở `/quan-ly/cai-dat` + cảnh báo
  "đổi tool chỉ áp bài chưa học"; migration 0020 `department_ai_tools` + RLS.
- §2 Builder **đảo cấp**: chế độ Theo phòng ban (áp cả phòng) / Theo cá nhân (override).
- §3 Bài học hiện đúng tool phòng + "Bạn đã có tài khoản chưa?" → video (`videoGuide`).
- §4 Luồng Cá nhân: `suggestToolForIndividual` map vị trí → tool (pure + test).

### 6) Super-admin — Khu Quản trị nền tảng (PR #27, base C3)
- Route `/quan-tri` cho `platform_admin`, **mức xem** (read-only) — khớp nền §0.2: Tổng quan (số công ty/user/cá nhân/bài hoàn thành) · Công ty (số NV + công cụ AI mỗi phòng) · Người dùng (công ty & cá nhân) · Nhật ký hoạt động (audit).
- Gating 2 mode: demo (cookie khi đăng nhập email super-admin) / real (`isPlatformAdmin` qua bảng `platform_admins`). Nav + route guard + proxy.
- **Seed quyền theo EMAIL** `lucas.ai.vn@gmail.com` (migration 0021) — KHÔNG nhúng mật khẩu. Anh tự đăng ký mật khẩu qua màn Đăng ký; real mode chạy migration 0021 (hoặc chạy lại sau khi đăng ký) để gắn quyền.
- Dữ liệu khu Quản trị hiện là demo (để show ngay); real-mode đọc service-role là follow-up.

## Kiểm tra chất lượng (mỗi cụm, Node 20)
- `npx eslint` các file thay đổi: **sạch** (không lỗi critical).
- `npx vitest run`: cụm cuối **65/65 pass** (đã thêm test cho rbac, rubric parser, individual-tool-suggest).
- `npx next build`: **exit 0** ở cả 5 cụm (route mới `/quan-ly/cai-dat`, `/bang-xep-hang`, `/quan-ly/lo-trinh`,
  `/api/aha`, `/api/org-settings` đều build).

## Commit chọn lọc — KHÔNG commit
- Không commit: `.env.example`, các file `docs/handoff-*.md`, `lib/learning-modules-data.test.ts`
  (thay đổi có sẵn từ lesson-ui-v2, không thuộc phạm vi các cụm này).
- Mọi migration đều có khối **ROLLBACK** ở cuối.

## Còn lại / follow-up (không chặn demo, đã ghi chú trong PR)
- Real-mode persistence cho **dept-tool** và **trạng thái "đã có tài khoản tool"** (hiện localStorage demo);
  cân nhắc bảng `user_tool_status` nếu cần ở real mode.
- Wiring `suggestToolForIndividual` vào **UI onboarding cá nhân** (helper + test đã sẵn, chỉ thiếu chỗ hiển thị).
- Rubric chưa có cột DB riêng — đang lấy từ data tĩnh theo id qua `mapRow` (đủ cho demo).
- File mẫu hiện dạng `.csv`/`.txt` (mở được bằng Excel/editor); nếu cần `.xlsx`/`.pdf` nhị phân thì bổ sung sau.
- Google OAuth callback thật (Phần A invite) — cần bật provider trong Supabase.

## Câu hỏi mở cho anh
- Có muốn tôi đổi base các PR sau về `develop` sau khi anh merge dần không, hay để team tự xử lý khi review?
- `platform_admins` cần seed user của anh (Lucas) — để tôi thêm script seed hay anh tự chèn trong Supabase?
