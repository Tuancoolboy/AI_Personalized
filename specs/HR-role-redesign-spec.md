# Spec — Thiết kế lại nội dung vai trò HR (`van-hanh`) theo 8 nhóm nhu cầu

> **Mục tiêu:** thiết kế lại lộ trình + bộ câu hỏi cho vai trò *"Nhân viên Hành chính / Nhân sự (HR)"* (`van-hanh`) để phủ đúng 8 nhóm nhu cầu HR. Mỗi nhóm = 1 module đầy đủ: bài học + prompt thực hành + **file mẫu** + rubric chấm + 1 câu quiz tình huống.
> **Trạng thái:** spec để duyệt. Code (sửa `roles.ts` + tạo file) làm sau khi anh OK.
> Khớp data model hiện có trong `src/frontend/lib/roles.ts` (`RoleModule`, `AttachedFile`, `RubricCriterion`, `QuizQuestion`).

## Cấu trúc lộ trình đề xuất

Giữ **3 module nền tảng** hiện có (level 1, dùng chung): Nền tảng AI · Viết prompt · An toàn dữ liệu.
Thay 3 module chung chung (m3–m5 cũ) bằng **8 module chuyên môn** dưới đây (level 2–3), mỗi module = 1 nhóm nhu cầu.

| # | Module (nhóm nhu cầu) | Level | Skill slug | File thực hành |
|---|---|---|---|---|
| 1 | Tuyển dụng | 2 | `tuyen-dung-ai`, `loc-cv` | `cv-ung-vien-mau.txt` *(tái dùng)* |
| 2 | Năng suất tổng thể / Khác | 2 | `nen-tang-ai` | `cau-hoi-nhan-vien-mau.txt` *(mới)* |
| 3 | Tự động hóa quy trình | 2 | `tu-dong-hoa-quy-trinh` | `quy-trinh-onboarding-mau.txt` *(mới)* |
| 4 | Quản lý, đánh giá & chính sách NV | 3 | `danh-gia-chinh-sach` | `noi-quy-cong-ty-mau.txt` *(mới)* |
| 5 | Phân tích dữ liệu & ra quyết định | 3 | `phan-tich-du-lieu-ns` | `bang-cham-cong-mau.csv` *(mới)* |
| 6 | C&B & Tính lương | 3 | `cb-tinh-luong`, `an-toan-du-lieu` | `bang-luong-mau.csv` *(mới)* |
| 7 | Đào tạo / L&D | 2 | `dao-tao-ld` | `ke-hoach-dao-tao-mau.txt` *(mới)* |
| 8 | Hành chính & soạn thảo văn bản | 1–2 | `van-ban-hanh-chinh`, `tom-tat-tai-lieu` | `cong-van-mau.txt` *(mới)* |

**Skill slug mới cần thêm vào `SKILL_LABELS`:** `tuyen-dung-ai` (Ứng dụng AI trong tuyển dụng), `tu-dong-hoa-quy-trinh` (Tự động hoá quy trình HR), `danh-gia-chinh-sach` (Đánh giá & chính sách nhân sự), `phan-tich-du-lieu-ns` (Phân tích dữ liệu nhân sự), `cb-tinh-luong` (C&B & kiểm tra bảng lương), `dao-tao-ld` (Thiết kế đào tạo / L&D).

---

## Chi tiết 8 module

### 1. Tuyển dụng — `van-hanh-m4`
- **content:** "AI giúp viết JD chuẩn, sàng lọc CV theo tiêu chí, soạn email mời/từ chối, chuẩn bị câu hỏi phỏng vấn. Nguyên tắc: AI **hỗ trợ chấm**, con người ra quyết định cuối — không để AI tự loại ứng viên."
- **learnings:** Viết JD theo yêu cầu · Sàng lọc CV theo tiêu chí khách quan · Soạn email tuyển dụng
- **practicePrompt:** "Bạn là HR. Từ JD vị trí [VỊ TRÍ] và CV đính kèm, chấm mức phù hợp theo 4 tiêu chí (kinh nghiệm, kỹ năng, học vấn, độ ổn định) — mỗi tiêu chí 1–5 kèm lý do. KHÔNG tự kết luận loại/nhận."
- **attachedFile:** `cv-ung-vien-mau.txt` — *"CV ứng viên mẫu (đã ẩn thông tin định danh). Có một khoảng trống thời gian làm việc — đừng để AI tự suy diễn tiêu cực, chỉ nêu là điểm cần làm rõ khi phỏng vấn."*
- **rubric:** Bám đúng 4 tiêu chí (30) · Khách quan, không thiên lệch (30) · Nêu điểm cần làm rõ thay vì kết luận (20) · Tôn trọng an toàn dữ liệu ứng viên (20)
- **quiz:** "Khi dùng AI để sàng lọc CV, cách làm ĐÚNG là gì?"
  - A. Để AI tự quyết loại/nhận cho nhanh
  - B. **AI chấm theo tiêu chí, HR ra quyết định cuối** ✓
  - C. Dán cả CV kèm số CMND lên công cụ AI công cộng
  - D. Tin tuyệt đối điểm AI chấm
  - *Giải thích:* AI hỗ trợ đánh giá khách quan nhưng quyết định tuyển dụng thuộc con người; tuyệt đối không đưa dữ liệu định danh lên AI công cộng.

### 2. Năng suất tổng thể / Khác — `van-hanh-m5`
- **content:** "Dùng AI cho việc lặp hằng ngày: tóm tắt email dài, lập to-do theo ưu tiên, gom câu hỏi nhân viên thành FAQ, nhắc deadline. Gộp nhiều tác vụ nhỏ để tiết kiệm 1–2 giờ/ngày."
- **learnings:** Tóm tắt & ưu tiên công việc · Xây FAQ nội bộ · Tạo prompt tái dùng cho việc lặp
- **practicePrompt:** "Từ danh sách câu hỏi nhân viên đính kèm, gom thành bảng FAQ ngắn gọn, mỗi câu trả lời ≤3 dòng, gộp các câu trùng ý."
- **attachedFile:** `cau-hoi-nhan-vien-mau.txt` *(mới)* — *"Danh sách câu hỏi nhân viên gửi HR. Có 2 câu trùng ý diễn đạt khác nhau — cần gộp; 1 câu mơ hồ — cần làm rõ trước khi trả lời."*
- **rubric:** Gom/gộp hợp lý (30) · Trả lời ngắn, đúng trọng tâm (30) · Nhận ra câu mơ hồ (20) · Trình bày dễ tra cứu (20)
- **quiz:** "AI phù hợp nhất để hỗ trợ việc nào sau đây trong HR?"
  - A. **Tóm tắt & gom việc lặp lại có tính chất văn bản** ✓
  - B. Tự ý quyết định kỷ luật nhân viên
  - C. Ký duyệt hợp đồng lao động
  - D. Quyết định mức lương cuối cùng
  - *Giải thích:* AI mạnh ở xử lý văn bản/việc lặp; các quyết định nhân sự hệ trọng vẫn thuộc con người.

### 3. Tự động hóa quy trình — `van-hanh-m6`
- **content:** "Biến quy trình lặp (onboarding, nghỉ phép, công văn) thành **checklist + template prompt tái dùng**. Mỗi quy trình chuẩn hóa 1 lần → nhân viên mới chỉ việc theo."
- **learnings:** Mô hình hoá quy trình thành checklist · Template prompt tái dùng · Nhận diện bước thiếu/rủi ro
- **practicePrompt:** "Từ mô tả quy trình onboarding đính kèm, tạo checklist các bước + người phụ trách + mốc thời gian. Chỉ ra bước nào đang thiếu."
- **attachedFile:** `quy-trinh-onboarding-mau.txt` *(mới)* — *"Mô tả quy trình onboarding nhân viên mới, viết lộn xộn. Thiếu hẳn bước khai báo BHXH/thuế — học viên cần phát hiện."*
- **rubric:** Checklist đủ bước, đúng thứ tự (35) · Gán người + mốc thời gian (25) · Phát hiện bước thiếu (25) · Trình bày rõ (15)
- **quiz:** "Lợi ích lớn nhất khi chuẩn hóa quy trình HR thành template AI là gì?"
  - A. Không cần con người nữa
  - B. **Nhân viên mới làm đúng ngay, đỡ đào tạo lại từ đầu** ✓
  - C. Tự động duyệt mọi đơn từ
  - D. Thay thế phần mềm HR
  - *Giải thích:* Template + checklist giúp chuẩn hoá và truyền đạt quy trình, giảm phụ thuộc trí nhớ cá nhân.

### 4. Quản lý, đánh giá & chính sách NV — `van-hanh-m7`
- **content:** "AI soạn nháp chính sách/nội quy, khung tiêu chí đánh giá KPI, tổng hợp feedback. Cảnh báo: chính sách phải đúng **Luật Lao động** — AI chỉ nháp, người + pháp chế rà trước khi ban hành."
- **learnings:** Soạn nháp chính sách/nội quy · Khung tiêu chí đánh giá · Rà rủi ro pháp lý
- **practicePrompt:** "Soạn nháp quy định làm việc từ xa cho công ty 50 người: phạm vi, điều kiện, trách nhiệm, ≤1 trang. Đánh dấu rõ chỗ cần pháp chế rà."
- **attachedFile:** `noi-quy-cong-ty-mau.txt` *(mới)* — *"Bản nội quy công ty mẫu. Có 1 điều khoản phạt tiền nhân viên — trái Luật Lao động Việt Nam; học viên cần phát hiện và gắn cờ."*
- **rubric:** Đúng cấu trúc chính sách (25) · Nội dung hợp lý (25) · **Phát hiện điều khoản trái luật** (30) · Đánh dấu chỗ cần pháp chế (20)
- **quiz:** "Khi dùng AI soạn nội quy/chính sách công ty, điều BẮT BUỘC là gì?"
  - A. Ban hành ngay vì AI viết chuẩn
  - B. **Người + pháp chế rà lại tính hợp pháp trước khi áp dụng** ✓
  - C. Sao chép nội quy công ty khác
  - D. Giữ bí mật không cho nhân viên biết
  - *Giải thích:* AI có thể viết sai/thiếu so với luật; trách nhiệm pháp lý thuộc con người.

### 5. Phân tích dữ liệu & ra quyết định — `van-hanh-m8`
- **content:** "AI hỗ trợ đọc bảng chấm công, turnover, chi phí nhân sự → tìm bất thường, tóm tắt cho ban giám đốc. AI đọc số, **con người diễn giải bối cảnh** và quyết định."
- **learnings:** Đọc & tóm tắt bảng số liệu · Phát hiện bất thường · Đề xuất hành động dựa trên dữ liệu
- **practicePrompt:** "Từ bảng chấm công đính kèm, chỉ ra 3 điểm bất thường (đi muộn nhiều, nghỉ bất thường, OT cao) và đề xuất hành động cho mỗi điểm."
- **attachedFile:** `bang-cham-cong-mau.csv` *(mới)* — *"Bảng chấm công 1 tháng (đã ẩn tên thật). Có 1 nhân viên OT cao bất thường — có thể do lỗi nhập liệu; đừng kết luận vội, nêu là điểm cần xác minh."*
- **rubric:** Đọc đúng số liệu (25) · Tìm đúng bất thường (30) · Không kết luận vội/bịa (25) · Đề xuất hành động hợp lý (20)
- **quiz:** "Khi AI chỉ ra một con số bất thường trong dữ liệu nhân sự, HR nên làm gì?"
  - A. Tin ngay và xử lý nhân viên
  - B. **Xác minh nguồn gốc (có thể lỗi nhập) trước khi kết luận** ✓
  - C. Bỏ qua vì AI hay sai
  - D. Công khai cho cả công ty
  - *Giải thích:* Số bất thường có thể do lỗi dữ liệu; cần kiểm chứng trước khi ra quyết định ảnh hưởng con người.

### 6. C&B & Tính lương — `van-hanh-m9`
- **content:** "AI giúp giải thích cấu trúc lương, kiểm tra công thức, phát hiện sai sót tính toán. **ĐẶC BIỆT QUAN TRỌNG:** lương là dữ liệu nhạy cảm — luôn ẩn danh (bỏ tên, mã NV) trước khi đưa lên công cụ AI công cộng."
- **learnings:** Hiểu cấu trúc lương gross/net · Kiểm tra công thức & sai sót · An toàn dữ liệu lương
- **practicePrompt:** "Kiểm tra bảng lương đính kèm: công thức 'thực nhận' có nhất quán với (gross − khấu trừ) không? Chỉ ra dòng sai. Dữ liệu đã ẩn tên."
- **attachedFile:** `bang-luong-mau.csv` *(mới)* — *"Bảng lương mẫu (đã ẩn tên, chỉ còn mã ẩn danh). Có 1 dòng sai: thực nhận ≠ gross − khấu trừ. Học viên cần tìm ra."*
- **rubric:** Tìm đúng dòng sai (30) · Giải thích công thức đúng (25) · **Cảnh báo ẩn danh dữ liệu lương** (25) · Không bịa số (20)
- **quiz:** "Trước khi nhờ AI công cộng kiểm tra bảng lương, việc BẮT BUỘC là gì?"
  - A. Gửi nguyên file có tên + số tài khoản cho nhanh
  - B. **Ẩn danh: bỏ tên, mã NV, số tài khoản — chỉ giữ số liệu cần tính** ✓
  - C. Không cần, lương không nhạy cảm
  - D. Đăng lên nhóm chung để nhiều người xem
  - *Giải thích:* Lương + thông tin định danh là dữ liệu nhạy cảm; phải ẩn danh trước khi đưa lên công cụ AI công cộng.

### 7. Đào tạo / L&D — `van-hanh-m10`
- **content:** "AI giúp soạn outline khóa đào tạo, tạo quiz kiểm tra, lộ trình onboarding kiến thức, tài liệu hướng dẫn. Mục tiêu đào tạo cần **đo được** (SMART)."
- **learnings:** Soạn outline đào tạo · Tạo quiz/đánh giá · Đặt mục tiêu học tập đo được
- **practicePrompt:** "Thiết kế outline buổi đào tạo 2 giờ về 'An toàn lao động' cho nhân viên mới: mục tiêu (đo được), nội dung từng phần, 3 câu quiz cuối buổi."
- **attachedFile:** `ke-hoach-dao-tao-mau.txt` *(mới)* — *"Brief kế hoạch đào tạo mẫu. Mục tiêu viết mơ hồ ('giúp nhân viên hiểu hơn') — học viên cần biến thành mục tiêu SMART đo được."*
- **rubric:** Outline rõ, logic (30) · **Mục tiêu SMART đo được** (30) · Quiz bám nội dung (25) · Phù hợp đối tượng (15)
- **quiz:** "Mục tiêu đào tạo nào sau đây 'đo được' (tốt nhất)?"
  - A. "Giúp nhân viên hiểu hơn về an toàn"
  - B. **"Sau buổi học, 90% nhân viên đạt ≥8/10 bài kiểm tra an toàn lao động"** ✓
  - C. "Nâng cao nhận thức chung"
  - D. "Làm nhân viên yêu thích công ty"
  - *Giải thích:* Mục tiêu tốt phải cụ thể, đo lường được — nền tảng để đánh giá hiệu quả đào tạo.

### 8. Hành chính & soạn thảo văn bản — `van-hanh-m11`
- **content:** "AI soạn công văn, quyết định, thông báo, biên bản đúng thể thức hành chính; tóm tắt biên bản họp thành đầu việc. Luôn rà thể thức + số liệu trước khi ban hành."
- **learnings:** Soạn văn bản đúng thể thức · Tóm tắt biên bản thành đầu việc · Rà số liệu trước khi gửi
- **practicePrompt:** "Soạn thông báo nội bộ về lịch nghỉ Tết: đúng thể thức (kính gửi, nội dung, nơi nhận, ký), giọng trang trọng, ≤200 từ."
- **attachedFile:** `cong-van-mau.txt` *(mới)* — *"Công văn mẫu thiếu thể thức (thiếu phần 'nơi nhận' và số văn bản). Học viên cần bổ sung cho đúng chuẩn hành chính."*
- **rubric:** Đúng thể thức văn bản (35) · Nội dung rõ, đủ ý (30) · Giọng phù hợp (20) · Phát hiện phần thiếu (15)
- **quiz:** "Khi dùng AI soạn công văn hành chính, bước cuối quan trọng nhất là gì?"
  - A. Gửi ngay khi AI viết xong
  - B. **Người rà lại thể thức + số liệu + thông tin trước khi ban hành** ✓
  - C. Để AI tự gửi
  - D. Copy nguyên không sửa
  - *Giải thích:* AI có thể sai thể thức/số liệu; văn bản hành chính cần con người chịu trách nhiệm rà soát.

---

## File thực hành cần tạo (trong `src/frontend/public/files/`)

| File | Loại | Có sẵn? | "Điểm bẫy" để kiểm tra học viên |
|---|---|---|---|
| `cv-ung-vien-mau.txt` | txt | ✅ tái dùng | khoảng trống thời gian làm việc |
| `cau-hoi-nhan-vien-mau.txt` | txt | mới | 2 câu trùng ý + 1 câu mơ hồ |
| `quy-trinh-onboarding-mau.txt` | txt | mới | thiếu bước BHXH/thuế |
| `noi-quy-cong-ty-mau.txt` | txt | mới | điều khoản phạt tiền trái luật |
| `bang-cham-cong-mau.csv` | csv | mới | OT bất thường (có thể lỗi nhập) |
| `bang-luong-mau.csv` | csv | mới | 1 dòng sai công thức thực nhận |
| `ke-hoach-dao-tao-mau.txt` | txt | mới | mục tiêu mơ hồ, chưa SMART |
| `cong-van-mau.txt` | txt | mới | thiếu thể thức (nơi nhận, số VB) |

## IMPLEMENTATION — CHỐT: ADDITIVE (giữ nguyên 10 module cũ, chỉ THÊM 4 module)

> **Thực tế repo:** `van-hanh` đã có `van-hanh-m1..m10` phủ 6/8 nhóm (Tuyển dụng=m8, Hành chính/soạn thảo=m3/m7/m9, Năng suất=m3/m5/m9, Tự động hóa≈m4). **KHÔNG sửa/xóa module cũ.** Chỉ THÊM 4 module cho 4 nhóm còn thiếu: #4, #5, #6, #7 — dùng nội dung đã thiết kế ở **mục 4–7** phía trên, chỉ đổi `id` cho khớp.

**4 module mới (append vào cuối mảng `modules` của `van-hanh`):**
- `van-hanh-m11` ← Nhóm **4** Quản lý/đánh giá/chính sách · level 3 · skills `["danh-gia-chinh-sach"]` · file `noi-quy-cong-ty-mau.txt`
- `van-hanh-m12` ← Nhóm **5** Phân tích dữ liệu & ra quyết định · level 3 · skills `["phan-tich-du-lieu-ns"]` · file `du-lieu-nhan-su-mau.csv`
- `van-hanh-m13` ← Nhóm **6** C&B & Tính lương · level 3 · skills `["cb-tinh-luong","an-toan-du-lieu"]` · file `bang-luong-mau.csv`
- `van-hanh-m14` ← Nhóm **7** Đào tạo / L&D · level 2 · skills `["dao-tao-ld"]` · file `ke-hoach-dao-tao-mau.txt`

(Lấy nguyên `content`, `learnings`, `practicePrompt`, `attachedFile.desc` (điểm bẫy), `rubric`, và câu `quiz` từ mục 4/5/6/7 tương ứng.)

**Skill slug mới (4) thêm vào `SKILL_LABELS`:** `danh-gia-chinh-sach`, `phan-tich-du-lieu-ns`, `cb-tinh-luong`, `dao-tao-ld`.

**File thực hành mới (4) trong `src/frontend/public/files/`** (dữ liệu ẩn danh + điểm bẫy):
- `noi-quy-cong-ty-mau.txt` — nội quy mẫu, có 1 điều khoản phạt tiền trái Luật LĐ.
- `du-lieu-nhan-su-mau.csv` — dữ liệu nhân sự (headcount/turnover/đi muộn theo phòng), 1 con số bất thường có thể do lỗi nhập.
- `bang-luong-mau.csv` — bảng lương ẩn danh, 1 dòng sai (thực nhận ≠ gross − khấu trừ).
- `ke-hoach-dao-tao-mau.txt` — brief đào tạo, mục tiêu mơ hồ chưa SMART.

**Quiz:** append 4 câu (mục 4–7) vào `van-hanh.quiz[]` (giữ câu cũ).

**Verify & ship:** `npm run lint` + `npm run test` + `npx next build src/frontend` (Node 20) đều xanh → branch `feat/lucas/hr-content-4-modules` → PR vào `develop`.
