# Bàn giao — 5 tính năng theo góp ý mentor (họp 10/06/2026)

> Người chốt hướng: Lucas/Annie. Người code: Claude Code.
> Mục tiêu: hoàn thiện để **demo + test phòng HR với khách trong 3 ngày tới**.
> Nguồn chân lý kèm theo: `docs/specs/PHASE2-SPEC.md` (các mục trích dẫn bên dưới).

## 0. Nguyên tắc triển khai (đọc trước khi code)
- **Làm bài bản — schema chuẩn ngay (KHÔNG dùng tag tạm).** Thiết kế đầy đủ bảng dữ liệu +
  migration + RLS theo §5.1 ngay từ đầu để không nợ kỹ thuật. Vẫn giữ **demo fallback**
  (localStorage — tái dùng `lib/demo-storage.ts`) để kịp demo/test trong 3 ngày, nhưng schema
  thật là đích đến và làm song song, không bỏ qua.
- **Không phá Phase 1.** Giữ nguyên route, copy tiếng Việt, design tokens hiện có.
- Tuân thủ `.agents/rules/agent-workflow.md`: nhánh `{type}/{noi-dung}` từ `develop`,
  cập nhật `WORKLOG.md` + `PROJECT-CONTINUATION.md`.
- Toàn bộ UI tiếng Việt. Mọi lời gọi AI đi qua API route phía server.

### 0.1 Hai tệp người dùng & mô hình lộ trình (xương sống — đọc kỹ)
- **Hai tệp người dùng:** (1) **người tự do** tự đăng ký học; (2) **doanh nghiệp** (quản lý set up cho nhân viên). UI lộ trình phải phục vụ cả hai.
- **Lộ trình KHÔNG fix cứng theo chức danh.** Vì mỗi vị trí công việc mỗi khác, gắn module cứng theo chức danh sẽ lệch. Mô hình thống nhất:
  > **Lộ trình = Nền tảng (cố định, ai cũng học) + các Khối kỹ năng (linh động).**
  - "Khối kỹ năng" = một nhóm vài module quanh một kỹ năng cụ thể (VD: "Soạn văn bản hành chính", "Lọc CV", "Phân tích Excel bằng AI").
  - **Người tự do:** onboarding chọn công việc/mục tiêu → gợi ý các khối kỹ năng → tự thêm/bớt.
  - **Doanh nghiệp:** quản lý chọn **vị trí chính** + tick **kỹ năng mong muốn nhân viên đạt được** → AI gợi lộ trình → chỉnh → gán.
- **"Kỹ năng" làm bài bản bằng bảng riêng** (`skills` + `module_skills`), không tag tĩnh — xem §5.1 Mô hình dữ liệu.

---

## 0.2 Kiến trúc phân tầng SaaS (đặt nền NGAY — chừa chỗ super-admin)
> Thiết kế chuẩn multi-tenant SaaS từ đầu, để sau lắp tầng quản trị của nhà vận hành KHÔNG phải xây lại.
> Giai đoạn này **chỉ đặt nền** (mô hình quyền + cô lập dữ liệu + log), **chưa làm UI super-admin**.

**3 tầng vai trò (RBAC) — định nghĩa đủ ngay:**
- `platform_admin` — **nhà vận hành nền tảng (Lucas)**: xem/quản trị mọi tổ chức, giám sát, billing.
  Chưa làm giao diện ở giai đoạn này, nhưng **định nghĩa role + chừa quyền ngay**.
- `org_admin` / `manager` — admin công ty: chỉ quản trị **trong tổ chức của mình**.
- `member` — nhân viên/người học. (Người tự do = user không thuộc tổ chức nào, `account_type='individual'`.)

**Cô lập đa tổ chức (multi-tenant isolation) — phải đúng ngay (chỗ đắt nhất nếu sửa sau):**
- Mọi bảng dữ liệu công ty có `organization_id` + RLS: tổ chức **chỉ đọc/ghi dữ liệu của mình**.
- `platform_admin` vượt RLS qua **cơ chế riêng** (service-role phía server / security-definer function /
  policy riêng) — **KHÔNG** nới lỏng RLS cho user thường.
- Kiểm tra quyền ở **cả server (route handler) lẫn RLS** — không tin client. Least-privilege: mặc định
  từ chối, cấp theo role.

**Reserve cho super-admin (rẻ, làm ngay):**
- Thêm `platform_admin` vào enum role (hoặc bảng `platform_admins(user_id)`) — kể cả khi chưa có màn hình.
- KHÔNG hardcode kiểu "chỉ có org_admin & member" ở bất cứ đâu khiến sau khó chèn tầng trên.

**Audit log:** ghi `events` (bảng đã có, migration 0005) cho hành động nhạy cảm — đổi quyền, mời/xóa
thành viên, đổi tool, gán lộ trình. Chưa cần dashboard giám sát, chỉ cần **dữ liệu được ghi** để sau bật lên.

**Hoãn tới Phase 3** (xây khi đã có khách thật + vận hành tay bắt đầu đuối): dashboard super-admin,
giám sát realtime, billing/subscription, quản lý công ty kiểu CRM.

---

## 1. Aha Moment — nâng cấp "Bước 4 — cảm nghĩ" (mentor #1)
**Quyết định:** Thay ô cảm nghĩ tự do bằng **3 câu ngắn + AI hỏi lại 1 câu + chọn phạm vi chia sẻ**.
Tinh thần: ~20 giây, KHÔNG bắt buộc, có nút bỏ qua — không gây khó chịu.

**Luồng & màn (đã có mockup trong chat):**
1. Sau khi đạt bài (Bước 4 hiện tại trong `components/module-lesson-content.tsx`), hiện 3 ô:
   - "Điều mình vừa hiểu ra"
   - "Nó giống/khác gì cách mình đang làm" ← **bắt buộc về ý nghĩa: nối kiến thức mới ↔ cũ** (đúng ý mentor)
   - "Mình sẽ thử ngay khi nào" (chips: Hôm nay / Trong tuần / Để sau)
2. Sau khi điền, **AI hỏi lại đúng 1 câu** đào sâu (không hỏi dồn). Gọi qua `/api/chat`
   với prompt rút gọn; trả 1 câu hỏi mở dựa trên câu trả lời. Token thấp: chỉ 1 lượt.
3. Chọn phạm vi chia sẻ: **Riêng tư (mặc định) / Phòng / Cả công ty** (opt-in, theo spec §7.1).
4. Lưu phần "sẽ thử + giờ tiết kiệm" vào nhật ký (`time_logs` thật / `addDemoTimeLog` demo).

**Chạm file:** `components/module-lesson-content.tsx` (thay block Bước 4 reflection đã có);
tái dùng `/api/chat`; demo lưu localStorage.
**Spec:** §7.1 Post-Lesson Aha Flow.
**Demo-mode:** AI hỏi lại có thể dùng câu mẫu nếu chưa bật OpenAI; chia sẻ lưu local.

---

## 2. Quản lý cấp Công ty + invite (mentor #2)
**Quyết định:** Quản lý **gán sẵn phòng ban + vị trí** cho nhân viên TRƯỚC khi mời →
hệ thống gửi email mời → nhân viên click vào tới thẳng trang đăng nhập, vào đúng luồng công ty.
**Đăng nhập không cần nghĩ mật khẩu:** ưu tiên **"Đăng nhập bằng Google"** (công ty đã có gmail).
Nếu cần mật khẩu: email gửi mật khẩu tạm + bắt đổi lần đầu.

**Luồng:**
1. `/quan-ly/nhan-vien`: quản lý nhập email + chọn phòng ban + vị trí → tạo invite.
2. Email mời (link token-only `/moi/[token]` — **đã có sẵn BE-10**).
3. Nhân viên click → trang đăng nhập → "Đăng nhập với Google" → gán vào
   `organization_members` đúng phòng/vị trí đã set.

**Chạm file:** `app/moi/[token]/*` (đã có), `lib/company-invite-links.ts` (đã có),
`app/api/manager/invite-links/*` (đã có), `app/(app)/quan-ly/nhan-vien/page.tsx`.
**Cần thêm:** Google OAuth (Supabase Auth provider); phần "chọn phòng ban/vị trí khi mời"
phụ thuộc Departments/Job roles ở mục 4.
**Spec:** §5.2 Company Entry & Invite Flow; §4.1 (Google OAuth). Migration 0011/0013 đã có.
**Demo-mode:** giữ luồng invite demo hiện tại; OAuth chỉ bật ở real mode.

---

## 3. Manager thiết kế lộ trình theo kỹ năng (mentor #3)
**Quyết định (đã chốt) — builder theo kỹ năng, không khoá cứng chức danh:**
- **Mỗi người 1 vị trí chính (học trọn vẹn) + tùy chọn học thêm kỹ năng/vị trí khác.**
  *Vì sao:* tránh "làm gì cũng không tới nơi tới chốn" — học sâu vị trí chính trước, mở rộng sau.
  (Bỏ phương án gộp ngang nhiều vị trí.)
- **Quản lý tick "kỹ năng mong muốn" → AI gợi lộ trình** (Nền tảng cố định + module theo từng kỹ năng)
  → quản lý chỉnh (tick +/− bài) → gán. *Vì sao:* sát nhu cầu thật mà vẫn linh động (xem §0.1).
- Gắp/chỉnh bài: **tick + / −**, **thứ tự tự sắp theo cấp độ** (Nền tảng → level 1 → 2 → 3),
  KHÔNG kéo-thả ở v1. *Vì sao:* hệ thống đảm bảo thứ tự sư phạm, đỡ lỗi, mobile tốt; đổi tay sau.
- AI hỗ trợ: **làm chắc "AI gợi ý lộ trình từ kỹ năng đã chọn"** (gọi 1 lần, rẻ).
  **"AI viết nháp bài học mới" để ngày 3 nếu còn giờ** — không phải must cho mục tiêu test HR.

**Luồng & màn (đã có mockup trong chat — bản skill-based):**
1. Chọn nhân viên + **vị trí chính**; có thể thêm vị trí/kỹ năng phụ (tùy chọn).
2. Tick **kỹ năng mong muốn** (chip): VD Soạn văn bản hành chính, Lọc CV, Viết email nội bộ…
3. Bấm **"AI gợi ý lộ trình từ các kỹ năng này"** → ra danh sách bài, mỗi bài gắn nhãn nguồn
   (Nền tảng / tên kỹ năng).
4. Quản lý chỉnh (tick +/− bài) → **gán cho nhân viên**.
- Áp dụng cho cả 2 tệp (§0.1): người tự do tự làm bước 1–4 cho chính mình; doanh nghiệp do quản lý làm.

**Chạm file:** mở rộng khu `app/(app)/quan-ly/*`; thư viện lấy từ `lib/roles.ts` +
`lib/learning-modules-data.ts`. Mô hình phòng ban/vị trí/lộ trình: bảng mới (real mode).
**Spec:** §5.1 Roles & Permissions, §6.1 Path Composition (common foundation + specialist),
Phase 2.2 (Departments/Job roles), Phase 2.3 (Authoring & Assignment).
**Demo-mode:** lưu phòng ban/vị trí/lộ trình vào localStorage; danh sách module từ data tĩnh.

---

## 4. Leaderboard + bảng tin (mentor #4)
**Quyết định:**
- **Bảng xếp hạng** 3 góc nhìn: Phòng / Cả công ty / Cá nhân. Luôn hiện dòng "Bạn".
- **Hiển thị tên:** trong **Phòng thì hiện tên**; bảng **Cả công ty cho phép tự ẩn tên** (opt-in).
- **Bảng tin (feed):** **làm ngay**, hiện ở **cả cấp Phòng và cấp Công ty** (theo ý chốt của anh):
  "anh A vừa hoàn thành bài X / đạt điểm / chia sẻ Aha". Mỗi công ty vẫn bật/tắt được.
- **Hệ điểm (gamification) — 2 bảng + điểm đa nguồn:**
  - **Bảng tuần** (reset mỗi tuần, đua ngắn) + **Bảng tổng tích luỹ** (all-time, như game).
    *Vì sao:* người đã cày hết bài chính vẫn leo bảng tổng được, không bị "đứng yên".
  - **Điểm đến từ nhiều nguồn**, không chỉ hoàn thành bài: (a) hoàn thành bài học;
    (b) **chia sẻ** Aha/prompt/kinh nghiệm cho phòng; (c) làm **bài thử thách (challenge)**.
    *Vì sao:* hết bài chính vẫn kiếm điểm qua chia sẻ + thử thách; thưởng người chịu khó chia sẻ
    đồng thời làm giàu kho nội dung nội bộ.
  - Phụ trợ hiển thị: số giờ tiết kiệm (không tính điểm, chỉ để khoe tiến bộ).
  - *Làm bài bản:* bảng `challenges` riêng + sổ điểm `points_ledger` (xem §5.1); hoàn thành/đạt
    điểm challenge → ghi 1 dòng điểm nguồn `challenge` vào bảng tổng.

**Chạm file:** route mới (vd `app/(app)/bang-xep-hang/page.tsx`) + widget feed trên dashboard;
nguồn sự kiện tái dùng bảng `events` (migration 0005 đã có) + `trackEvent`.
**Spec:** §7.2 Feed Events, §7.3 Leaderboards, §4.1 (leaderboard opt-in), §4.2 (feed sau cờ → nâng lên làm ngay theo mentor).
**Demo-mode:** xếp hạng + feed từ dữ liệu giả/localStorage để demo hiệu ứng.

---

## 5. Nội dung — ưu tiên HR/Hành chính (mentor #5)
**Quyết định:** Giữ nội dung đã có. Đợt này **làm lộ trình phòng HR/Hành chính chi tiết hơn**
để test với khách trước; ổn rồi mới mở rộng phần khác. Đồng thời tách rõ **lộ trình "Nền tảng chung"**
(công cụ AI cơ bản + cách viết prompt) dùng cho mọi vị trí.

**Việc cần làm:**
- Trong `lib/roles.ts`: mở rộng vai trò `van-hanh` (Hành chính) thành lộ trình HR đầy đủ —
  thêm module thực chiến (soạn quyết định/thông báo, lọc CV tuyển dụng, soạn email nội bộ,
  chấm công/nghỉ phép bằng AI…), mỗi module có `content` + `learnings` + prompt thực hành.
- **Gắn module HR vào kỹ năng** qua bảng `module_skills` (§5.1): VD module "Lọc CV" → kỹ năng
  "Lọc CV tuyển dụng" — để builder ở mục 3 ráp lộ trình theo kỹ năng. (Demo: seed sẵn quan hệ này.)
- Bổ sung khái niệm **"Nền tảng chung"**: dùng **cờ `isFoundation: true` trên module**
  (không tạo vai trò riêng). *Vì sao:* module nền tảng tự gắn vào MỌI lộ trình mà không phải
  nhân bản; sửa 1 chỗ áp dụng tất cả; khớp mô hình "common foundation + specialist" của spec §6.1.
  Lộ trình của mỗi vị trí = (mọi module `isFoundation`) + (module chuyên môn của vị trí đó).
- Bài học hiển thị bằng màn 5 bước mới (`module-lesson-content.tsx` đã làm xong).

**Spec:** §4.1 (common foundation + specialist track), §6.1.

---

## 5.1 Mô hình dữ liệu bài bản (real mode — bám spec §11)
> Dùng bảng riêng, migration mới, **bật RLS theo tổ chức**. Tận dụng bảng đã có: `organizations`,
> `organization_members` (BE-08), `learning_modules` (0004), `events` (0005), `time_logs`,
> `quiz_results`, `module_practice_submissions`. Mỗi bảng phải có rollback (theo DoD spec).

Bảng mới đề xuất:
- `skills (id, organization_id NULL, name, slug, description)` — `organization_id` NULL = kỹ năng dùng chung toàn hệ thống.
- `module_skills (module_id, skill_id)` — gắn bài học vào kỹ năng (n–n).
- `job_positions (id, organization_id, name, is_active)` — vị trí công ty tự định nghĩa.
- `position_skills (position_id, skill_id)` — kỹ năng mong muốn của một vị trí.
- `member_positions (user_id, organization_id, position_id, is_primary)` — 1 vị trí chính (`is_primary=true`) + nhiều phụ.
- `learning_paths (id, organization_id, position_id NULL, name, version)` + `path_modules (path_id, module_id, sort_order)`.
- `path_assignments (user_id, path_id, assigned_by, assigned_at)` — gán lộ trình cho nhân viên.
- `challenges (id, organization_id NULL, module_id NULL, title, points, is_active)` — bài thử thách.
- `points_ledger (id, user_id, organization_id, source ['lesson'|'share'|'challenge'], points, ref_id, created_at)`
  — sổ điểm. **Bảng tuần** = lọc `created_at` trong tuần; **bảng tổng** = `sum(points)`.
- `aha_reflections (id, user_id, module_id, insight, link_prior, next_action, visibility ['private'|'department'|'company'], created_at)` — Aha Moment (spec §11.4).
- `leaderboard_visibility (user_id, organization_id, hide_company_wide bool)` — opt-in ẩn tên ở bảng cả công ty.

RLS chính: bảng org-scoped chỉ đọc/ghi trong tổ chức của mình (qua `organization_members`);
`points_ledger`/`aha_reflections` của ai người nấy ghi; leaderboard công ty qua **view tổng hợp**
tôn trọng `leaderboard_visibility`. Demo fallback dùng key localStorage tương ứng.

## 6. Ưu tiên 3 ngày (đề xuất)
- **Ngày 1:** Aha Moment (mục 1, nối thẳng màn bài học đã làm) + nội dung HR chi tiết (mục 5).
  → Đủ để test trải nghiệm học của phòng HR.
- **Ngày 2:** Manager builder bản tick-chọn (mục 3) + invite gán phòng/vị trí (mục 2, demo).
- **Ngày 3:** Leaderboard + feed (mục 4) + nút "AI gợi ý lộ trình" + ráp nối, test luồng end-to-end.
- Backend thật (bảng công ty/phòng ban/lộ trình, RLS, Google OAuth) làm song song khi còn thời gian;
  không chặn demo.

## 7. Anti-conflict & lệnh kiểm tra (chạy trên máy, Node 20)
- Trước khi làm: `git checkout develop && git pull origin develop` → nhánh mới.
- Trước khi push: `git fetch origin && git rebase origin/develop`.
- Commit chọn lọc (`git add -p`), KHÔNG `git add .` (tránh ~200 file nhiễu CRLF).
- Kiểm tra:
  ```
  npx -y -p node@20 node node_modules/eslint/bin/eslint.js .
  npx -y -p node@20 node node_modules/vitest/vitest.mjs run
  npx -y -p node@20 node node_modules/next/dist/bin/next build
  ```

## 8. Việc đang dang dở từ đợt trước (liên quan)
- Màn bài học 5 bước đã port xong (`components/module-lesson-content.tsx`) + 2 module
  kế toán (`lib/roles.ts`) — xem `docs/handoff-lesson-ui-v2.md`. Aha Moment (mục 1) build
  tiếp ngay trên màn này.
