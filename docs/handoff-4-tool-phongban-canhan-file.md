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
