# Bài khảo sát chẩn đoán HR — bản đọc & dùng ngay

> Hiện **sau khi học viên chọn vai trò HR**. Mục tiêu: hiểu rõ từng người đang làm gì + muốn AI hóa việc nào → **Agent dựng lộ trình sát nhất**.
> Bản code: `src/frontend/lib/assessment-hr.ts`. Bản này để duyệt nội dung + **thu offline tối nay** (Google Form/Zalo) nếu muốn có dữ liệu trước khi web kịp lên.
>
> 9 câu, ~3–4 phút. Câu ⭐ là tín hiệu chính cho Agent.

---

## Câu 1 — Thâm niên *(tính trình độ)*
**Bạn làm HR được bao lâu / vị trí cụ thể?** (chọn 1)
- Nhân viên mới (< 1 năm)
- Nhân viên kinh nghiệm (1–3 năm)
- Nhân viên giàu kinh nghiệm (3–5 năm)
- Trưởng nhóm / Team lead
- Trưởng phòng / Quản lý

## Câu 2 — Mảng HR chính ⭐ *(routing track)*
**Mảng HR chính của bạn hiện tại là gì?** (chọn 1)
- Tuyển dụng (Recruiter / TA) → `tuyen-dung`
- HR Generalist (làm nhiều mảng) → `tong-hop`
- C&B / Tính lương → `cb-luong`
- Đào tạo / L&D / Trainer → `ld-dao-tao`
- HRBP / Quản lý / Giám đốc nhân sự → `hrbp-quan-ly`
- Hành chính nhân sự / HR Ops → `hanh-chinh`

## Câu 3 — Quy mô công ty *(bối cảnh)*
**Công ty bạn bao nhiêu người?** (chọn 1)
- Dưới 50 / 50–100 / 100–200 / Trên 200

## Câu 4 — Việc muốn AI hóa ⭐⭐ *(tín hiệu CỐT LÕI → lọc bài)*
**Bạn muốn Claude/AI giúp những việc HR nào?** (chọn nhiều)
- ☐ Tuyển dụng & sàng lọc ứng viên → `hr-tuyen-dung`
- ☐ Onboarding & Đào tạo (L&D) → `hr-onboarding-ld`
- ☐ C&B, tính lương & phúc lợi → `hr-cb-luong`
- ☐ Đánh giá hiệu suất & KPI/OKR → `hr-hieu-suat`
- ☐ Quan hệ lao động & chính sách → `hr-quan-he-chinh-sach`
- ☐ HR Ops, hành chính & soạn thảo → `hr-hanh-chinh-ops`
- ☐ Phân tích dữ liệu HR & báo cáo → `hr-phan-tich-du-lieu`
- ☐ Tự động hóa & năng suất → `hr-tu-dong-hoa`

## Câu 5 — Ưu tiên #1 ⭐ *(đặt lên đầu lộ trình)*
**Việc nào NGỐN THỜI GIAN NHẤT, muốn giải quyết trước?** (chọn 1 — cùng danh sách Câu 4)

## Câu 6 — Dữ liệu nhạy cảm *(nhấn an toàn dữ liệu)*
**Bạn có thường xử lý dữ liệu nhạy cảm (lương, hợp đồng, hồ sơ, CCCD)?** (chọn 1)
- Thường xuyên / Thỉnh thoảng / Hiếm khi

## Câu 7 — Tần suất dùng AI *(tính trình độ)*
**Bạn đã dùng AI (ChatGPT, Claude, Copilot…) tới mức nào?** (chọn 1)
- Chưa bao giờ / Đã thử 1–2 lần / Thỉnh thoảng / Vài lần/tuần / Hằng ngày

## Câu 8 — Kỹ năng prompt *(tính trình độ)*
**Mức tự tin khi viết prompt cho AI?** (chọn 1)
- Không biết prompt là gì / Hỏi cơ bản / Mô tả bối cảnh + yêu cầu / Tối ưu prompt, dùng role / Tự build template

## Câu 9 — Công cụ đang dùng *(bối cảnh)*
**Bạn đã dùng công cụ AI nào?** (chọn nhiều) — ChatGPT · Claude · Copilot · Gemini · Canva AI · Midjourney/DALL-E · Perplexity · Notion AI

## Câu 10 *(tùy chọn, rất giá trị)* — Mô tả việc thật
**Mô tả 1 việc lặp đi lặp lại bạn muốn dùng AI giải quyết trước (càng cụ thể càng tốt).**
*VD: "Mỗi tuần sàng lọc ~40 CV vị trí sale", "Cuối tháng làm báo cáo nhân sự cho sếp".*

---

## Câu hỏi → tín hiệu cho Agent

| Câu | id | Tín hiệu | Agent dùng để |
|---|---|---|---|
| 1 | `q1-position` | thâm niên | tính `aiLevel`, độ sâu nội dung |
| 2 | `q-hr-subfunction` | mảng HR | nhấn track tương ứng |
| 3 | `q-hr-company-size` | quy mô | ưu tiên tự động hóa nếu công ty nhỏ |
| 4 ⭐ | `q3hr-tasks` | `tasks[]` (slug) | **lọc bài** (join `module.skills`) |
| 5 ⭐ | `q-hr-priority` | `priorityTask` | đặt bài liên quan lên đầu |
| 6 | `q-hr-data` | `dataSensitivity` | chèn bài an toàn dữ liệu nếu cao |
| 7 | `q4-ai-frequency` | tần suất | tính `aiLevel` |
| 8 | `q5-ai-skill` | kỹ năng prompt | tính `aiLevel` (skip bài cơ bản nếu cao) |
| 9 | `q6-ai-tools` | công cụ | ngữ cảnh, gợi ý công cụ |
| 10 | `q-hr-recurring` | mô tả tự do | ngữ cảnh phong phú cho prompt Agent |

> Helper `extractHrSignals(answers)` trả thẳng các tín hiệu trên (xem README §3).

---

## Gợi ý dùng tối nay (offline)
Câu 2, 4, 5, 10 là phần quan trọng nhất để dựng lộ trình. Nếu cần nhanh, một Google Form gồm đúng 4 câu này (+ tên/email) đã đủ cho Agent chạy thử; các câu còn lại bổ sung độ chính xác trình độ.
