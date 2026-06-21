# Bàn giao — Lesson UI v2 (5 bước) + 2 module kế toán

> Người làm trước: Annie/Lucas (UI). Người xử lý nốt: Claude Code.
> Branch đề xuất: `feat/toinx/update-lession-ui` (đã có sẵn mockup, đang ngang `develop`).

## 1. Mục tiêu
Ghép thiết kế tĩnh `public/mockup-module-ke-toan-phien-ban-2.html` (flow 5 bước) vào app thật,
áp cho **mọi bài học của mọi vai trò**, và thêm 2 module kế toán mới. Yêu cầu: push lên
`develop` không conflict.

## 2. Đã làm xong (3 file, đã chỉnh trực tiếp trong repo)
- `lib/roles.ts` — thêm `ke-toan-m7` (đối chiếu công nợ + email nhắc thu hồi) và
  `ke-toan-m8` (báo cáo quản trị cho sếp) vào cuối mảng `modules[]` của vai trò kế toán.
  Không sửa module cũ.
- `components/module-lesson-content.tsx` — viết lại theo flow 5 bước, **data-driven, không đụng DB**:
  - Infographic công thức prompt (Vai trò + Bối cảnh + Yêu cầu = Kết quả).
  - Journey stepper 5 bước.
  - Bước 1: prompt thực hành chính (`mod.practice_prompt`) + dải lưu ý an toàn.
  - Bước 2: nộp ảnh cho AI chấm — tái dùng nguyên `ModulePracticeReview` (chấm thật).
  - Bước 3/4/5: khóa đến khi đạt ≥ `PRACTICE_PASS_SCORE` (70đ).
  - Bước 3 "hỏi sâu": lấy thẳng từ `role.starterKit.prompts` (đã có sẵn theo vai trò).
  - Bước 4 "cảm nghĩ": ghi giờ tiết kiệm vào nhật ký thật (`createTimeLog` real /
    `addDemoTimeLog` demo).
  - Bước 5: tóm tắt từ `mod.learnings` + nút lưu sổ tay.
- `lib/learning-modules-data.test.ts` — đổi assertion đếm module từ số cứng (30, 6/vai trò)
  sang tính động từ `ROLES` (kế toán giờ 8 bài).

Đã xác minh cả 3 file thật trên ổ đầy đủ & đóng đúng cú pháp (đọc trực tiếp file).

## 3. Lược bỏ có chủ đích so với mockup (cần làm nốt nếu muốn 100%)
- **Nút tải file Excel mẫu** (`du-lieu-thuc-hanh-ke-toan-v2.xlsx`): chưa render vì file chưa tồn tại.
  → Việc còn lại: tạo file mẫu thật, đặt trong `public/`, thêm field `sampleFile?` cho module
    (kế toán) và render filebox ở Bước 1 khi có.
- **Tab "dán text" để chấm**: bỏ vì grader thật chỉ chấm qua ảnh (`submitPracticeReview` nhận images).
  → Việc còn lại (tùy chọn): nếu muốn chấm text, cần thêm nhánh text ở API chấm + UI tab.

## 4. Việc Claude Code cần làm nốt
1. Chạy kiểm tra trên Node 20 và sửa nếu có lỗi:
   ```
   npx -y -p node@20 node node_modules/eslint/bin/eslint.js .
   npx -y -p node@20 node node_modules/vitest/vitest.mjs run
   npx -y -p node@20 node node_modules/next/dist/bin/next build
   ```
   (Sandbox Linux không chạy được vì node_modules là bản Windows — phải chạy trên máy.)
2. Test thủ công luồng vàng: mở 1 bài kế toán → copy prompt → nộp ảnh → đạt điểm →
   mở khóa bước 3/4/5 → gửi cảm nghĩ (kiểm tra ghi vào `/tien-bo`) → lưu sổ tay → bài tiếp theo.
   Kiểm tra ở cả vai trò khác (kinh doanh, marketing) vì UI dùng chung.
3. (Tùy chọn) Làm 2 mục ở phần 3.
4. Cập nhật `WORKLOG.md` + `docs/specs/PROJECT-CONTINUATION.md` theo `.agents/rules/agent-workflow.md`.

## 5. Anti-conflict khi push
- `git fetch origin && git rebase origin/develop` trước khi mở PR.
- `git add -p` chỉ 3 file trên — KHÔNG `git add .` (repo đang có ~200 file nhiễu CRLF, đừng commit nhiễu).
- Cả 3 file ít người đụng trên develop → rebase xong PR merge sạch.
