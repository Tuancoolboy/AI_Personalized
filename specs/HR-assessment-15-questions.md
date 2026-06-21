# Bộ câu hỏi khảo sát đầu vào — Vai trò HR (15 câu + 1 câu mở)

> Hiện sau khi học viên chọn vị trí HR. Mục tiêu: hiểu đúng nghiệp vụ HR + trình độ AI → cá nhân hóa lộ trình.
> Dùng được 2 cách: (a) dán vào **Google Form**, (b) làm nguồn cho code (`assessment.ts`, `roleFilter: ["van-hanh"]`).
> Đa số là chọn nhanh (1 lựa chọn / nhiều lựa chọn) để không tốn thời gian.

## NHÓM A — Bối cảnh nghề HR (để cá nhân hóa lộ trình)

**1. Mảng HR chính của bạn hiện tại?** *(1 lựa chọn)*
- Tuyển dụng (Recruiter / TA)
- HR tổng hợp (làm nhiều mảng)
- C&B / Tính lương & phúc lợi
- Đào tạo / L&D
- HRBP / Quản lý / Giám đốc nhân sự
- Hành chính nhân sự / HR Ops

**2. Quy mô công ty bạn?** *(1 lựa chọn)*
- Dưới 50 nhân viên
- 50 – 100 nhân viên
- 100 – 200 nhân viên
- Trên 200 nhân viên

**3. Công ty bạn thuộc ngành nào?** *(1 lựa chọn)*
- Bán lẻ / Thương mại điện tử
- Dịch vụ (F&B, spa, giáo dục...)
- Sản xuất / Phân phối
- Công nghệ / Phần mềm
- Khác / Tổng hợp

**4. Số năm kinh nghiệm làm HR của bạn?** *(1 lựa chọn)*
- Dưới 1 năm
- 1 – 3 năm
- 3 – 5 năm
- Trên 5 năm
- Cấp quản lý nhân sự

**5. Việc HR nào bạn muốn AI hỗ trợ NHẤT?** *(nhiều lựa chọn)*
- Tuyển dụng & sàng lọc CV
- Onboarding & Đào tạo (L&D)
- C&B, tính lương & phúc lợi
- Đánh giá hiệu suất & KPI/OKR
- Quan hệ lao động & chính sách
- Hành chính & soạn thảo văn bản
- Phân tích dữ liệu HR & báo cáo
- Tự động hóa quy trình & năng suất

**6. Việc HR nào tốn thời gian nhất của bạn hiện nay?** *(nhiều lựa chọn)*
- Sàng lọc CV / tuyển dụng
- Soạn email & văn bản
- Chấm công / tính lương
- Làm báo cáo, số liệu
- Trả lời câu hỏi của nhân viên
- Soạn quy trình / chính sách

**7. Bạn đang dùng công cụ gì cho việc HR?** *(nhiều lựa chọn)*
- Excel / Google Sheets
- Phần mềm HRM (Base, Misa, ...)
- Word / soạn thảo
- Email
- Giấy tờ / thủ công

## NHÓM B — Trình độ AI hiện tại (để xếp đúng cấp lộ trình)

**8. Bạn đã dùng AI (ChatGPT, Claude, Copilot...) chưa?** *(1 lựa chọn)*
- Chưa bao giờ
- Đã thử 1 – 2 lần
- Thỉnh thoảng cho công việc
- Vài lần / tuần cho công việc
- Hằng ngày, là công cụ không thể thiếu

**9. Bạn đã dùng AI cho việc HR cụ thể nào chưa?** *(nhiều lựa chọn)*
- Soạn email / văn bản
- Sàng lọc CV
- Tóm tắt tài liệu / biên bản
- Tính toán / xử lý số liệu
- Chưa dùng cho việc HR

**10. Mức tự tin khi viết câu lệnh (prompt) cho AI?** *(1 lựa chọn)*
- Không biết viết
- Mới làm quen
- Viết được cơ bản
- Viết tốt
- Rất thành thạo

**11. Bạn có biết khi nào KHÔNG nên đưa dữ liệu (lương, CV, thông tin nhân viên) lên AI công cộng?** *(1 lựa chọn)*
- Không biết
- Mơ hồ
- Biết cơ bản
- Biết rõ và luôn ẩn danh trước

## NHÓM C — Mục tiêu & cách học (để điều chỉnh trải nghiệm)

**12. Mục tiêu lớn nhất khi học AI cho HR?** *(1 lựa chọn)*
- Tiết kiệm thời gian
- Giảm sai sót
- Nâng chất lượng công việc
- Theo kịp xu hướng

**13. Bạn thích học theo kiểu nào?** *(1 lựa chọn)*
- Thực hành ngay với ví dụ
- Hiểu lý thuyết trước
- Vừa học vừa làm

**14. Bạn dành được bao nhiêu thời gian học mỗi tuần?** *(1 lựa chọn)*
- Dưới 1 giờ
- 1 – 2 giờ
- 2 – 4 giờ
- Trên 4 giờ

**15. Bạn từng gặp khó / sai sót khi dùng AI cho việc HR chưa?** *(1 lựa chọn)*
- Chưa từng dùng
- Chưa gặp
- Có, vài lần
- Có, khá thường xuyên

## CÂU MỞ

**16. Ngoài những việc trên, công việc HR cụ thể nào khác bạn đang làm và muốn AI hỗ trợ?** *(câu trả lời ngắn — tự mô tả)*

---

## Ghi chú cho code (không cần đưa vào Google Form)
- **Loại input (assessment.ts):** Q1–Q4, Q8, Q10–Q15 = `likert` (1 lựa chọn) · Q5, Q6, Q7, Q9 = `multi-chip` · Q16 = `free-text`.
- **Tính điểm AI level (chỉ các câu này có `score`, còn lại `score: 0`):** Q4 (kinh nghiệm 1→5), Q8 (0→6), Q9 (mỗi mục đã dùng +1, "chưa dùng" 0), Q10 (0→5), Q11 (0→4). → giữ thang aiLevel 0–5 như cũ.
- **roleFilter:** tất cả gắn `["van-hanh"]`. Khi role = van-hanh hiển thị bộ này; vai trò khác giữ 6 câu generic.
- Q16 `free-text` cần 1 nhánh textarea trong `StepAssessment` (onboarding-flow.tsx) — không tính điểm, lưu vào `goalTags`/profile để Agent tham khảo.
