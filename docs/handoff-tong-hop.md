# Bàn giao TỔNG HỢP — AI Trợ Lý (gửi Claude Code)

> File gộp của 3 bàn giao, làm theo ĐÚNG THỨ TỰ phụ thuộc (móng trước):
> - **Phần A — Phase 2** (nền: 5 tính năng mentor + kiến trúc SaaS phân tầng §0.2).
> - **Phần B — 3 thay đổi UX** (chấm rubric + prompt động + công cụ AI).
> - **Phần C — Tool theo phòng ban / Cá nhân vs Doanh nghiệp / File đính kèm.**
>
> Quy tắc chung: tuân thủ CLAUDE.md, .agents/rules/agent-workflow.md; UI tiếng Việt; demo localStorage
> fallback; KHÔNG phá Phase 1. Mỗi cụm việc 1 nhánh, tách đúng thứ tự phụ thuộc, không tách từ develop
> trống nếu phụ thuộc nhánh trước. Chạy lint + test + build (Node 20) xanh trước khi báo xong.
>
> Thứ tự thực thi & merge: **A (nền) → B → C**.

---
---

# ===== PHẦN A — PHASE 2 (NỀN) =====

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


---
---

# ===== PHẦN B — 3 THAY ĐỔI UX =====

# Bàn giao — 3 thay đổi UX sau review sản phẩm

> Người chốt: Lucas/Annie. Người code: Claude Code.
> Nhánh: tạo từ develop hoặc từ feature/phase2-mentor-features nếu đã merge.
> Tuân thủ: UI tiếng Việt, không phá Phase 1, demo localStorage fallback.
> ⚠ Đã rà soát đối chiếu code thật — các chỗ sửa được đánh dấu **[SỬA THEO REVIEW]**.

---

## 1. Nâng cấp chấm điểm: thêm ô paste text đáp án + chấm bằng rubric

### Hiện tại
- Chỉ nộp screenshot (tối đa 5 ảnh) → AI chấm từ ảnh → đạt khi >= `PRACTICE_PASS_SCORE` (hiện = 60).
- **[SỬA THEO REVIEW]** Trong màn bài học 5 bước hiện tại, phần chấm điểm nằm ở **Bước 2** (không phải Bước 3). Đối chiếu component trước khi sửa.
- **[SỬA THEO REVIEW]** Dùng hằng số `PRACTICE_PASS_SCORE` (từ `lib/practice-grader.ts`), KHÔNG hardcode "60" rải rác.

### Thay đổi
- Thêm **ô textarea "Paste kết quả AI trả về"** phía trên phần upload ảnh.
- Textarea có nút "Paste" + placeholder "Dán toàn bộ câu trả lời từ AI vào đây..."
- Textarea không bắt buộc (có thể chỉ nộp ảnh như cũ), nhưng hiện gợi ý: "Paste text giúp chấm chính xác hơn"
- Screenshot giữ nguyên vai trò **bằng chứng bổ sung**.

### Cách chấm mới
- Mỗi module trong `lib/learning-modules-data.ts` thêm field `rubric`:
```ts
rubric: [
  { criteria: "Đúng format văn bản hành chính", maxPoints: 15 },
  { criteria: "Đủ thông tin bắt buộc (tên, ngày, số hiệu)", maxPoints: 20 },
  { criteria: "Nội dung chính xác theo yêu cầu đề bài", maxPoints: 25 },
  { criteria: "Ngôn ngữ phù hợp, chuyên nghiệp", maxPoints: 15 },
  { criteria: "Có sử dụng file mẫu đính kèm đúng cách", maxPoints: 15 },
  { criteria: "Kết quả có thể dùng được ngay", maxPoints: 10 }
]
// Tổng: 100 điểm, đạt >= 60
```
- Khi chấm: gửi text đáp án + rubric với system prompt:
  "Bạn là giảng viên chấm bài thực hành AI. Chấm theo rubric sau, cho điểm từng tiêu chí, giải thích ngắn. Trả về JSON: { scores: [{criteria, points, comment}], total, passed }"
- **[SỬA THEO REVIEW] KHÔNG gửi qua `/api/chat`** — route đó đang giới hạn 30 lượt/ngày dùng chung với Trợ lý AI, chấm bài sẽ ăn vào quota chat của học viên. **Mở rộng route đã có `app/api/practice-review/route.ts`** để nhận thêm text (route này không vướng rate-limit chat).
- Nếu chỉ nộp ảnh (không paste text): chấm từ ảnh như cũ.
- **[SỬA THEO REVIEW] Khi nộp cả text lẫn ảnh:** gửi cả hai cho model, ưu tiên text làm căn cứ chính, ảnh là bằng chứng bổ sung.
- Hiển thị kết quả: bảng điểm từng tiêu chí + nhận xét + tổng điểm + ĐẠT/CHƯA ĐẠT.

### Chạm file
- `components/module-lesson-content.tsx` — **[SỬA THEO REVIEW]** phần **Bước 2** (chấm điểm thực hành), không phải Bước 3
- `lib/learning-modules-data.ts` — thêm rubric cho mỗi module
- **[SỬA THEO REVIEW]** Mở rộng `app/api/practice-review/route.ts` (KHÔNG dùng `/api/chat`)
- Demo mode: chấm bằng logic đơn giản — **[SỬA THEO REVIEW] random 40–95** (không phải 65–95) để demo được cả luồng ĐẠT lẫn CHƯA ĐẠT (xem 6.2)

---

## 2. Giữ + nâng cấp Prompt mẫu copy-dùng-ngay

### Hiện tại
- Bộ khởi đầu nhanh có prompt mẫu — GIỮ NGUYÊN, đây là IP cốt lõi.

### Thay đổi
- Prompt mẫu hiển thị **tên công cụ AI theo lựa chọn công ty** (xem mục 3).
- Ví dụ: nếu công ty chọn Claude → "Mở Claude → paste prompt này"
          nếu công ty chọn ChatGPT → "Mở ChatGPT → paste prompt này"
- Thêm note nhỏ dưới prompt: "Prompt này hoạt động tốt với mọi công cụ AI. Kết quả tốt nhất khi dùng [tool đã chọn]."
- Nút copy giữ nguyên.

### Chạm file
- `components/module-lesson-content.tsx` — phần hiển thị prompt mẫu
- Đọc `ai_tool` từ context organization (hoặc localStorage demo) để render tên tool động

---

## 3. Công cụ AI: Tool chính (công ty chọn) + Tool chuyên dụng (theo bài học)

### Triết lý
- **Tool chính** (1 tool, quản lý chọn khi setup): dùng cho text/phân tích/soạn thảo — áp TẤT CẢ phòng ban
- **Tool chuyên dụng** (hệ thống gắn sẵn theo bài): bài nào cần tạo ảnh/video/design → tự hiện tool phù hợp
- **Nhân viên không cần chọn gì** — mở bài, thấy đúng tool + hướng dẫn, làm theo
- **[SỬA THEO REVIEW] Thông điệp phải nhất quán:** app vừa hướng dẫn dùng tool ngoài (Claude/ChatGPT…) vừa có Trợ lý AI tích hợp sẵn. Làm rõ với học viên: app là nơi **học cách dùng tool ngoài**, còn Trợ lý AI trong app là **gia sư hỏi đáp** — tránh để học viên bối rối giữa hai thứ.

### Ví dụ thực tế
- Bài "Soạn quyết định nhân sự" → dùng tool chính (Claude)
- Bài "Viết caption fanpage" → dùng tool chính (Claude)
- Bài "Tạo ảnh banner bằng AI" → tool chuyên dụng: ChatGPT (có DALL-E tạo ảnh)
- Bài "Tạo video giới thiệu sản phẩm" → tool chuyên dụng: Runway
- Bài "Thiết kế slide thuyết trình" → tool chuyên dụng: Canva AI

### Database
```sql
ALTER TABLE organizations ADD COLUMN ai_tool text DEFAULT 'claude'
  CHECK (ai_tool IN ('claude', 'chatgpt', 'gemini', 'copilot'));
```
Demo mode: `localStorage.setItem('org_ai_tool', 'claude')`.

> **[SỬA THEO REVIEW]** Cần tạo sẵn các file icon SVG trong `public/images/tools/`
> (`claude.svg`, `chatgpt.svg`, `gemini.svg`, `copilot.svg`, `canva.svg`, `runway.svg`),
> nếu không các đường dẫn `icon` bên dưới sẽ vỡ ảnh.

### Config tools (tạo file `lib/ai-tools-config.ts`)
```ts
export const AI_TOOLS = {
  // === TOOL CHÍNH (công ty chọn 1) ===
  claude: {
    name: 'Claude',
    provider: 'Anthropic',
    url: 'https://claude.ai',
    icon: '/images/tools/claude.svg',
    signupGuide: 'Truy cập claude.ai → Đăng ký bằng email hoặc Google → Bắt đầu dùng miễn phí',
    recommended: true,
    category: 'primary',
    pros: ['Trả lời chính xác nhất cho văn bản tiếng Việt', 'Hiểu context dài', 'Miễn phí cơ bản'],
    note: 'Được khuyên dùng — prompt trong khóa học được tối ưu cho Claude'
  },
  chatgpt: {
    name: 'ChatGPT',
    provider: 'OpenAI',
    url: 'https://chat.openai.com',
    icon: '/images/tools/chatgpt.svg',
    signupGuide: 'Truy cập chat.openai.com → Đăng ký → Dùng GPT-4o miễn phí',
    recommended: false,
    category: 'primary',
    pros: ['Phổ biến nhất', 'Tạo được ảnh (DALL-E)', 'Có app mobile'],
    note: null
  },
  gemini: {
    name: 'Gemini',
    provider: 'Google',
    url: 'https://gemini.google.com',
    icon: '/images/tools/gemini.svg',
    signupGuide: 'Truy cập gemini.google.com → Đăng nhập bằng tài khoản Google',
    recommended: false,
    category: 'primary',
    pros: ['Tích hợp Google Workspace', 'Miễn phí với tài khoản Google'],
    note: null
  },
  copilot: {
    name: 'Copilot',
    provider: 'Microsoft',
    url: 'https://copilot.microsoft.com',
    icon: '/images/tools/copilot.svg',
    signupGuide: 'Truy cập copilot.microsoft.com → Đăng nhập bằng tài khoản Microsoft',
    recommended: false,
    category: 'primary',
    pros: ['Tích hợp Microsoft 365', 'Có sẵn trong Edge/Windows'],
    note: null
  },

  // === TOOL CHUYÊN DỤNG (gắn theo bài học) ===
  'chatgpt-image': {
    name: 'ChatGPT (tạo ảnh)',
    provider: 'OpenAI',
    url: 'https://chat.openai.com',
    icon: '/images/tools/chatgpt.svg',
    signupGuide: 'Dùng ChatGPT → gõ "tạo ảnh..." → DALL-E tự tạo',
    recommended: false,
    category: 'specialist',
    capability: 'image',
    pros: ['Tạo ảnh từ mô tả text', 'Chỉnh sửa ảnh bằng lời'],
    note: 'Công cụ tối ưu cho bài học cần tạo ảnh'
  },
  'canva-ai': {
    name: 'Canva AI',
    provider: 'Canva',
    url: 'https://canva.com',
    icon: '/images/tools/canva.svg',
    signupGuide: 'Truy cập canva.com → Đăng ký miễn phí → Dùng Magic Design',
    recommended: false,
    category: 'specialist',
    capability: 'design',
    pros: ['Thiết kế slide, poster, banner', 'Template sẵn', 'Miễn phí cơ bản'],
    note: 'Dùng cho bài học cần thiết kế — tạo slide, poster, banner'
  },
  'runway': {
    name: 'Runway',
    provider: 'Runway',
    url: 'https://runwayml.com',
    icon: '/images/tools/runway.svg',
    signupGuide: 'Truy cập runwayml.com → Đăng ký → Dùng Gen-3 tạo video',
    recommended: false,
    category: 'specialist',
    capability: 'video',
    pros: ['Tạo video từ text/ảnh', 'Chỉnh sửa video bằng AI'],
    note: 'Dùng cho bài học cần tạo video ngắn'
  }
}
```

### Module gắn tool chuyên dụng
```ts
// lib/learning-modules-data.ts — mỗi module thêm field tool
{
  id: 'tao-anh-banner',
  title: 'Tạo ảnh banner bằng AI',
  tool: 'chatgpt-image',                    // override tool chính
  toolReason: 'Bài này cần tạo ảnh — dùng ChatGPT có DALL-E tích hợp sẵn',
  // ...
}

{
  id: 'viet-quyet-dinh',
  title: 'Soạn quyết định nhân sự',
  tool: null,                                // null = dùng tool chính công ty đã chọn
  // ...
}
```
> **[SỬA THEO REVIEW]** Field `tool` thêm vào data tĩnh thôi chưa đủ cho real mode:
> bảng `learning_modules` (migration 0004) không có cột này nên `fetchModule` từ DB sẽ
> trả về thiếu `tool` → mất tool chuyên dụng. **Thêm cột `tool text` (nullable) vào
> `learning_modules`** bằng migration mới nếu muốn chạy thật, không chỉ demo.

### Logic hiển thị trong bài học
```ts
// lib/ai-tool-helper.ts
export function getToolForModule(module, orgAiTool: string): AiToolConfig {
  if (module.tool) {
    // Bài này cần tool chuyên dụng → hiện tool đó + giải thích tại sao
    return { ...AI_TOOLS[module.tool], reason: module.toolReason }
  }
  // Dùng tool chính công ty đã chọn
  return AI_TOOLS[orgAiTool] || AI_TOOLS.claude
}
```

### UI chọn tool chính — trang setup công ty
- Route: `/quan-ly/cai-dat` hoặc trong flow onboarding công ty
- Hiển thị 4 card (chỉ category='primary'), mỗi card: icon + tên + pros
- Claude có badge "Khuyên dùng" (highlight border)
- Chọn 1 → lưu organizations.ai_tool
- Có thể đổi sau trong cài đặt
- **[SỬA THEO REVIEW]** Trang này chỉ cho **quản lý** (manager/owner) truy cập — chặn nhân viên thường đổi tool của cả công ty (kiểm tra quyền ở cả route lẫn UI).

### UI trong bài học (dynamic)
**Khi tool = tool chính:**
- "Mở [Claude] → Paste prompt bên dưới → Xem kết quả"
- Note: "Prompt tối ưu cho [Claude]"

**Khi tool = tool chuyên dụng:**
- Banner nhỏ: "⚡ Bài này dùng [ChatGPT tạo ảnh] — [lý do]"
- Hướng dẫn riêng cho tool đó
- Note: "Đây là công cụ chuyên dụng cho bài này, khác với tool chính của công ty bạn"

### Chạm file
- Tạo mới: `lib/ai-tools-config.ts`, `lib/ai-tool-helper.ts`
- Sửa: `components/module-lesson-content.tsx` (thay hardcode → dynamic theo getToolForModule)
- Sửa: `lib/learning-modules-data.ts` (thêm field tool + toolReason cho module cần)
- Tạo: `/quan-ly/cai-dat/page.tsx` (UI chọn tool chính)
- Migration: thêm cột `ai_tool` vào `organizations` + **[SỬA THEO REVIEW]** cột `tool` vào `learning_modules`

---

## 4. Ưu tiên triển khai
1. **Mục 3 trước** (chọn tool) — vì mục 1 và 2 phụ thuộc vào tool đã chọn
2. **Mục 2** (prompt mẫu dynamic) — nhanh, chỉ đổi render
3. **Mục 1** (chấm rubric) — phức tạp nhất, cần viết rubric cho mỗi module

## 5. Anti-conflict
- Nhánh từ develop (hoặc từ feature/phase2 nếu đã merge)
- Commit chọn lọc, KHÔNG git add .
- Build check: `npx next build` exit 0
- **[SỬA THEO REVIEW] Cảnh báo trùng file với handoff Phase 2:** file này sửa
  `components/module-lesson-content.tsx` và `lib/learning-modules-data.ts` — đúng 2 file mà
  handoff Phase 2 cũng đụng. **Làm tuần tự trên cùng 1 nhánh**, KHÔNG chạy song song (worktree)
  trên 2 file này để tránh xung đột.

---

## 6. Lưu ý kỹ thuật BẮT BUỘC (bổ sung sau review — không được bỏ sót)

Các điểm dưới đây là nơi spec dễ vỡ nhất khi chạy thật. Phải xử lý đủ trước khi báo "done".

### 6.1. Parse JSON từ AI không được giả định luôn đúng
- Model có thể trả JSON lỗi, kèm text thừa, hoặc bọc trong ```json ... ```.
- Bắt buộc:
  - Nếu dùng OpenAI: set `response_format: { type: 'json_object' }`.
  - Bọc `JSON.parse` trong try/catch. Khi parse fail → KHÔNG crash, trả về trạng thái "Chấm tự động thất bại, vui lòng thử lại / chấm thủ công" và log payload gốc để debug.
  - Strip ```json fences trước khi parse (phòng model vẫn bọc code block).
- Validate sau khi parse: `total` là số 0–100, `scores` là mảng, mỗi `points <= maxPoints` của tiêu chí tương ứng. Lệch thì clamp lại, không tin tuyệt đối output của model.

### 6.2. Demo mode phải test được cả 2 nhánh ĐẠT / CHƯA ĐẠT
- Random 65–95 luôn ≥ 60 → vĩnh viễn ĐẠT, không demo được màn "CHƯA ĐẠT".
- Đổi range demo thành **40–95** để cả hai luồng UI đều hiển thị được.

### 6.3. Module KHÔNG có rubric phải có fallback
- Rubric sẽ được thêm dần, không phải module nào cũng có ngay.
- Logic chấm: `if (module.rubric)` → chấm theo rubric; `else` → quay về chấm tự do như Phase 1. Tuyệt đối không để thiếu rubric gây lỗi runtime.

### 6.4. Một nguồn sự thật duy nhất cho `ai_tool`
- `getToolForModule` đọc `orgAiTool` từ DB *hoặc* localStorage → dễ lệch giữa 2 nơi.
- Tạo 1 helper duy nhất, ví dụ `getOrgAiTool()`: đã đăng nhập → đọc `organizations.ai_tool` từ DB; demo/chưa đăng nhập → đọc `localStorage('org_ai_tool')`; cả hai fail → mặc định `'claude'`. Mọi nơi (mục 1, 2, 3) chỉ gọi qua helper này.

### 6.5. Câu chữ tool chuyên dụng không được khẳng định sai
- KHÔNG ghi "tool chính không hỗ trợ tạo ảnh" — vì nếu công ty chọn Gemini/Copilot thì 2 tool này tạo được ảnh, note sẽ mâu thuẫn.
- Dùng câu trung tính: "Công cụ tối ưu cho bài này" / "Bài này dùng [tool] để có kết quả tốt nhất". (Đã sửa sẵn field `note` của `chatgpt-image` ở mục 3.)

### 6.6. Chi phí & bảo mật khi chấm
- Mỗi lần chấm gửi cả rubric + toàn bộ text đáp án lên API → cân nhắc giới hạn độ dài text (cắt/đếm token) để tránh chi phí phình to với bài dài.
- Không log nội dung đáp án nhạy cảm của học viên ra console ở production.


---
---

# ===== PHẦN C — TOOL THEO PHÒNG BAN / CÁ NHÂN / FILE ĐÍNH KÈM =====

# Bàn giao — Công cụ AI theo phòng ban, luồng Cá nhân vs Doanh nghiệp, file đính kèm

> Người chốt: Lucas/Annie. Người code: Claude Code.
> Nối tiếp `handoff-3-ux-changes.md` (đã làm tool chính cấp công ty) — file này **chỉnh lại**
> theo phản hồi: tool theo **phòng ban**, lộ trình theo **phòng ban**, tách **Cá nhân vs Doanh nghiệp**,
> và **đính kèm file mẫu** cho bài thực hành.
> Tuân thủ CLAUDE.md, agent-workflow.md, demo localStorage fallback. UI tiếng Việt.

---

## 1. Công cụ AI chọn theo PHÒNG BAN (không phải cả công ty)
**Vấn đề:** mỗi phòng làm việc khác nhau (media, kế toán, sale…) nên không thể ép cả công ty 1 tool.

**Thay đổi:**
- Chuyển lựa chọn tool từ cấp công ty → **cấp phòng ban**: mỗi phòng chọn 1 tool chính.
  → Cột `ai_tool` chuyển từ bảng `organizations` sang **bảng `departments`** (xem handoff-2 §5.1).
- Lộ trình học của phòng đó dùng tool này làm tool chính (tool chuyên dụng theo bài vẫn override như cũ).

**Xử lý khi đổi tool giữa chừng (đang học dở) — phương án đề xuất:**
- **KHÔNG khóa cứng vĩnh viễn**, nhưng cũng không đổi ngược tiến độ. Khi quản lý đổi tool của phòng:
  - Bài **đã hoàn thành**: giữ nguyên (không bắt học lại).
  - Bài **chưa học / lộ trình mới**: áp tool mới.
  - Hiện cảnh báo: "Đổi công cụ sẽ áp dụng cho các bài chưa học. Bài đã xong giữ nguyên."
- *Vì sao:* mềm dẻo, không phá tiến độ, không cần cơ chế khóa phức tạp. (Phương án B nếu muốn chặt hơn: khóa tool trong 1 lộ trình đang chạy, chỉ đổi ở kỳ học mới — phức tạp hơn, chưa cần.)

---

## 2. Thiết kế lộ trình theo PHÒNG BAN trước, override cá nhân sau
**Vấn đề (ảnh 2 hiện tại):** đang chọn từng nhân viên → công ty hàng trăm người không thể sửa từng người.

**Thay đổi — đảo cấp:**
1. Quản lý **chọn PHÒNG BAN** → set kỹ năng mong muốn → AI gợi lộ trình → **áp cho TẤT CẢ thành viên phòng** (mặc định giống hệt nhau).
2. Bên dưới có mục **"Tùy chỉnh cho cá nhân"** (tùy chọn): chỉ những ai cần khác phòng mới sửa.
   **Không sửa → mặc định theo lộ trình phòng ban.**

**Luồng màn (sửa từ ảnh 2):**
- Bước 1: chọn **Phòng ban** (thay vì chọn nhân viên).
- Bước 2: Kỹ năng mong muốn (như cũ).
- Bước 3: Chỉnh & áp cho cả phòng → danh sách thành viên hiện bên dưới, mỗi người có nút "Tùy chỉnh riêng".

**Chạm dữ liệu:** lộ trình gắn ở cấp `department` (mặc định) + bản ghi override cấp `member` (ngoại lệ).

---

## 3. Màn bài học: hiện đúng tool của phòng + kiểm tra tài khoản (ảnh 3)
**Vấn đề:** ảnh 3 đang hiện 4 tool chung chung. Nếu phòng đã chọn tool rồi thì phải hiện đúng tool đó.

**Thay đổi:**
- Mục "Công cụ AI dành cho bạn" hiện **đúng tool chính của phòng** (1 tool), không phải 4 tool.
  (Bài cần tool chuyên dụng — ảnh/video — vẫn hiện tool chuyên dụng kèm lý do, như handoff-3 mục 3.)
- Ngay bên dưới: dòng **"Bạn đã có tài khoản [tên tool] chưa?"** với 2 lựa chọn:
  - **Đã có** → mở lộ trình học bình thường.
  - **Chưa có** → hiện **video hướng dẫn tạo tài khoản** của đúng tool đó (mỗi tool 1 video riêng).
- Thêm field `videoGuide` (URL) cho mỗi tool trong `lib/ai-tools-config.ts`.
  - Claude: `https://www.youtube.com/watch?v=LYDxj8sAnz0`
  - Các tool khác: để trống tạm (`null`) — bổ sung link sau.

**Chạm file:** `components/module-lesson-content.tsx` (Bước 1 hiển thị tool), `lib/ai-tools-config.ts`
(thêm `videoGuide`), lưu trạng thái "đã có tài khoản" theo user (DB cột / localStorage demo).

---

## 4. Tách 2 luồng: Doanh nghiệp vs Cá nhân
Thêm `account_type` ('company' | 'individual') để rẽ luồng.

**Doanh nghiệp** (tài khoản do công ty tạo, mời nhân viên): theo mục 1–3 (tool & lộ trình theo phòng ban).

**Cá nhân** (người tự đăng ký học):
- Lộ trình **fix cứng theo từng nghiệp vụ** cho gọn (không có quản lý set up).
- **Chọn công cụ AI SAU khi làm bài test onboarding**: dựa vào vị trí/công việc của họ thiên về gì
  → gợi ý tool phù hợp. Ví dụ map:
  - thiên về **thiết kế/ảnh** → gợi ý ChatGPT (DALL-E) / Canva
  - thiên về **văn bản/phân tích** → gợi ý Claude
  - thiên về **bảng tính/Office** → gợi ý Copilot
  - thiên về **Google Workspace** → gợi ý Gemini
- Sau khi gợi ý, vẫn cho người dùng tự đổi nếu muốn.

**Chạm:** onboarding cá nhân (đọc kết quả test → map tool); `account_type` trên profile/tổ chức.

---

## 5. File mẫu đính kèm cho mọi bài thực hành (để chấm đáp án đúng)
**Mục tiêu:** mỗi bài thực hành đi kèm **file mẫu của hệ thống** (theo chuyên môn), thay vì để học viên
tự lấy file của họ — như vậy mới có **đáp án chuẩn để chấm** (nối với chấm rubric ở handoff-3 mục 1).

**Thêm field cho module** (`lib/learning-modules-data.ts` + cột DB `learning_modules` nếu real mode):
```ts
attachedFile: { name: string; path: string; desc: string } | null
```
File để trong `public/files/` (demo). Dữ liệu **ẩn danh**, nên cài sẵn vài "điểm bẫy" để kiểm tra
học viên có phát hiện không (giống file mẫu kế toán v2 đã có).

**Các bài đang cần file (rà từ `lib/roles.ts` — bổ sung file mẫu cho từng cái):**
| Vai trò | Bài / prompt | File mẫu cần tạo |
|---|---|---|
| Kế toán | Phân tích bảng chi phí Excel (m1) | `.xlsx` bảng chi phí 6 tháng (có sẵn ý tưởng ở mockup v2) |
| Kế toán | Đối chiếu công nợ (m7) | `.xlsx` bảng công nợ phải thu (ẩn tên khách) |
| Kế toán | Lập báo cáo quản trị (m8) | `.xlsx`/`.csv` số liệu doanh thu–chi phí–lợi nhuận theo tháng |
| Kế toán | Tóm tắt báo cáo tài chính | `.pdf`/`.docx` báo cáo tài chính mẫu |
| Kế toán | Phân loại chi phí | `.csv` danh sách khoản chi |
| Kinh doanh | Phân tích nhu cầu khách từ lịch sử chat (m4) | `.txt` đoạn chat mẫu |
| Kinh doanh | Tóm tắt cuộc gọi tư vấn | `.txt` transcript cuộc gọi mẫu |
| Marketing | Phân tích chiến dịch | `.csv` số liệu chiến dịch (impression/click/cost/CR) |
| Vận hành/HR | Tóm tắt biên bản họp | `.docx`/`.txt` biên bản họp mẫu |
| Vận hành/HR | Lọc CV tuyển dụng | `.pdf`/`.docx` vài CV ứng viên mẫu (ẩn danh) |

**Cẩn thận:** đặt tên file rõ, mô tả `desc` cho học viên biết mở sheet/phần nào; mọi dữ liệu ẩn danh;
file gắn đúng module qua `attachedFile`. Khi học viên nộp bài → chấm bằng rubric so với đáp án chuẩn của file mẫu.

---

## 6. Ưu tiên triển khai
1. Mục 5 (file mẫu + `attachedFile`) — nền để chấm đúng, phục vụ test HR/khách. Làm trước.
2. Mục 1 + 2 (tool & lộ trình theo phòng ban) — đụng builder & data model.
3. Mục 3 (tool + video trong bài học).
4. Mục 4 (tách Cá nhân vs Doanh nghiệp).

## 7. Cập nhật mô hình dữ liệu (so với handoff-2 §5.1)
- `departments` thêm cột `ai_tool` (bỏ `ai_tool` khỏi `organizations`).
- `learning_modules` thêm cột `attached_file` (jsonb hoặc 3 cột name/path/desc).
- `profiles`/tổ chức thêm `account_type` ('company'|'individual').
- Trạng thái "đã có tài khoản tool" theo user: cột riêng hoặc bảng `user_tool_status`.
- Lộ trình gắn cấp `department` (mặc định) + override cấp `member`.
- `ai-tools-config` thêm `videoGuide` (URL theo tool).

## 8. Anti-conflict
- Nhánh tách từ nhánh có handoff-2 + handoff-3 (vì nối tiếp), KHÔNG từ develop trống.
- Cùng đụng `module-lesson-content.tsx`, `learning-modules-data.ts`, `ai-tools-config.ts` với các handoff trước → **làm tuần tự**, không song song.
- Commit chọn lọc (`git add -p`), không `git add .`. Build check Node 20 trước khi báo xong.
