# AI20K-083 — Decision & Plan

> Team 9 — AI20K Build Cohort 2
> Ngày chốt đề tài: 04/06/2026
> Ngày chốt kế hoạch làm việc: 05/06/2026

---

## 1. Dòng Thời Gian Quyết Định

### 31/05/2026 — Shortlist ban đầu

Team chọn nhóm **AI Literacy** và shortlist một số hướng sản phẩm. Ở thời điểm này, AI20K-089 từng được ưu tiên vì có khả năng demo automation workflow trực quan.

Đây là bước phân tích ban đầu, chưa phải quyết định cuối.

### 04/06/2026 — Chốt AI20K-083

Team chốt đề:

> **AI Trợ Lý Phổ Cập Kiến Thức AI Nền Tảng Cho Nhân Viên**

AI20K-083 được đưa vào bàn cân sau khi team review lại tài liệu đề bài và nhận ra hướng này vẫn nằm trong nhóm AI Literacy nhưng có scope MVP gọn hơn AI20K-089.

Lý do chốt:

- Scope phù hợp hơn với MVP web app.
- Buyer rõ: doanh nghiệp 10-200 người cần đào tạo AI nền tảng cho nhân viên.
- Có thể demo rõ bằng learning path, AI tutor, assessment và dashboard.
- Không cần xử lý sandbox automation phức tạp trong MVP.

| Tiêu chí | AI20K-083 | AI20K-084 | AI20K-086 | AI20K-089 |
|---|---|---|---|---|
| MVP feasibility | Cao | Trung bình | Cao | Trung bình-thấp |
| Buyer clarity | Doanh nghiệp 10-200 nhân viên | HR/L&D | Người cần tìm use case AI | SME/freelancer automation |
| Demoability | Flow học + tutor + quiz + dashboard | Assessment score | Use-case recommendation | Workflow automation chạy thật |
| Technical risk | Thấp-trung bình | Trung bình | Thấp nhưng dễ mỏng | Cao vì sandbox/automation runtime |
| Decision | Chọn | Không chọn | Không chọn | Superseded |

### 05/06/2026 — Chốt kế hoạch làm việc

Team chia kế hoạch thành action table:

| Task | Owner tạm thời | Deadline | Artifact | Acceptance criteria | Status |
|---|---|---|---|---|---|
| Persona + user journey | Lucas | 07/06 | `docs/product/user-journey.md` | Có learner persona, manager persona, end-to-end journey | Planned |
| Lesson/content outline | Tuancoolboy | 07/06 | `docs/content-outline.md` | Có outline bài học cho ít nhất 2 role mẫu | Planned |
| Wireframe notes | Tuancoolboy | 07/06 | `docs/wireframe-notes.md` | Có onboarding, lesson, tutor, assessment, dashboard | Planned |
| Data model + AI flow | minhhai203 | 07/06 | `docs/data-and-ai-flow.md` | Có user/role/lesson/quiz/progress và tutor context contract | Planned |
| Tech stack decision | minhhai203 | 07/06 | `docs/tech-stack.md` | Chốt frontend, backend, storage, LLM provider, deploy target | Planned |
| Demo plan | Cả team | 08/06 | `planning/demo/demo-plan.md` | Có seed data, demo account, demo script, public URL plan | Planned |

---

## 2. Mô Tả Ý Tưởng Theo Công Thức 3 Ô

Nhân viên tại các doanh nghiệp 10-200 người đang gặp khó khăn: muốn dùng AI vào công việc nhưng không biết bắt đầu từ đâu, đào tạo tập trung thì tốn kém, nội dung lại không sát thực tế từng người. Team 9 giúp họ hiểu và áp dụng được AI vào đúng công việc của mình ngay trong tuần đầu bằng web app có lộ trình học cá nhân hóa theo vai trò, trợ lý AI giải thích bằng ví dụ từ đúng công việc, bài kiểm tra tình huống và dashboard tiến bộ. Doanh nghiệp trả 2.000.000 VNĐ/tháng cho 10 người vì đang tốn 2-5 triệu/người/lần cho đào tạo tập trung mà kết quả khó đo và phải đào tạo lại nhiều lần.

Nguồn/assumption: nội dung problem, pricing và chi phí đào tạo được lấy từ tài liệu quyết định dự án do team cung cấp ngày 06/06; đây là giả định ban đầu cần validate thêm bằng phỏng vấn user/doanh nghiệp.

---

## 3. Khách Hàng

Nhân viên ở mọi phòng ban tại doanh nghiệp 10-200 người:

- Kế toán
- Sales
- Marketing
- Vận hành
- Nhân sự
- Các vai trò văn phòng khác

Người học không cần nền tảng kỹ thuật, nhưng cần hiểu AI đủ tốt để biết dùng đúng trong công việc hằng ngày.

---

## 4. Vấn Đề

- Nhân viên muốn áp dụng AI nhưng không biết AI làm được gì trong công việc của mình.
- Không biết dùng AI sao cho đúng và tránh rủi ro.
- Đào tạo tập trung tốn khoảng 2.000.000-5.000.000 VNĐ/người/lần.
- Nội dung đào tạo chung chung, không sát vai trò cụ thể.
- Học xong khó áp dụng và khó đo kết quả.
- Nhân viên mới vào lại phải đào tạo từ đầu.

---

## 5. Giải Pháp MVP

Web app phổ cập kiến thức AI nền tảng cho nhân viên, gồm:

1. **Onboarding theo vai trò:** người học chọn phòng ban, vai trò và trình độ AI hiện tại.
2. **Lộ trình học cá nhân hóa:** bài học nền tảng được sắp theo đúng vai trò.
3. **AI tutor:** giải thích khái niệm bằng ví dụ đời thường và đúng ngữ cảnh công việc.
4. **Bài kiểm tra tình huống:** đo khả năng áp dụng AI vào scenario thực tế.
5. **Dashboard tiến bộ:** quản lý xem được trạng thái học và năng lực AI của từng người/toàn đội.

---

## 6. Top 3 Tính Năng Phải Có

| # | Tính năng | Vì sao quan trọng |
|---|---|---|
| 1 | Lộ trình học cá nhân hóa theo vai trò | Tránh học chung chung; sales học khác kế toán |
| 2 | Trợ lý AI trong web app | Người học hỏi ngay khi không hiểu, có ví dụ sát công việc |
| 3 | Bài kiểm tra tình huống + dashboard | Biến việc học thành kết quả đo được cho quản lý |

---

## 7. Pricing Dự Kiến

| Gói | Giá |
|---|---:|
| User cá nhân | 300.000 VNĐ/tháng |
| Gói doanh nghiệp 10 users | 2.000.000 VNĐ/tháng |

Ghi chú: pricing là team assumption từ tài liệu đề, chưa phải giá đã validate qua user interview.

---

## 8. Definition Of Done Cho MVP

- Có web app chạy được bằng public URL.
- Có đăng nhập và phân quyền cơ bản.
- Có onboarding theo vai trò.
- Có ít nhất 1-2 lộ trình học mẫu theo vai trò.
- Có lesson view và AI tutor theo ngữ cảnh bài học.
- Có bài kiểm tra tình huống.
- Có dashboard tiến độ học.
- Có demo data và kịch bản demo rõ ràng.
- Có demo account cho learner và manager/admin.
- Có user journey end-to-end: onboarding -> lesson -> hỏi AI tutor -> quiz -> dashboard cập nhật tiến độ.
- Có manager/admin journey: xem danh sách người học, tiến độ, điểm quiz/tình huống.
- UI responsive cơ bản và có trạng thái loading/empty/error cho các màn chính.
- AI tutor có guardrails tối thiểu: trả lời trong phạm vi bài học/vai trò, nhắc người học kiểm tra dữ liệu nhạy cảm trước khi dùng AI.
- Quiz có scoring hoặc rubric đơn giản để dashboard hiển thị được tiến bộ.
