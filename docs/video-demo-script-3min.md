# Kịch bản video demo — 3 phút (user flow end-to-end)

> Mục tiêu: chứng minh agent **nhận input → xử lý → trả output có ý nghĩa** cho 1 user flow chính,
> chạy với **LLM thật (OpenAI), không mock**.
> **Chuẩn bị (QUAN TRỌNG — đừng bỏ qua):**
> 1. Đặt `OPENAI_API_KEY` + `OPENAI_MODEL=gpt-4o-mini` vào **`src/frontend/.env.local`** — vì `next dev src/frontend` nạp env từ thư mục này, KHÔNG phải `.env` gốc. Sai chỗ này → app rơi vào chế độ canned (mock) → hỏng demo.
> 2. Chạy `npx next dev src/frontend` (Node 20+), đăng nhập `nhanvien@congty.vn` (mật khẩu bất kỳ).
> 3. **Test trước khi quay:** gõ 1 câu ở `/tro-ly`, mở DevTools → Network → request `/api/chat` phải có header **`X-Chat-Mode: demo-openai`** (= LLM thật). Nếu thấy `demo`/`cache` → chưa đúng, kiểm tra lại env.
> Quay màn hình + thuyết minh giọng tiếng Việt, 1080p. Tổng ~3:00.

| Thời lượng | Màn hình | Lời thuyết minh (gợi ý) |
|---|---|---|
| **0:00–0:20** | Slide/landing tiêu đề | "Nhân viên SME muốn dùng AI nhưng không biết bắt đầu từ đâu. AI Trợ Lý đưa ra lộ trình cá nhân hóa theo vai trò + trợ lý AI giải thích bằng ví dụ đúng nghề." |
| **0:20–0:45** | `/onboarding` — chọn vai trò + làm test ngắn | "Người dùng chọn vai trò — ví dụ Kinh doanh — và làm bài test nhanh. Hệ thống chấm và xác định trình độ AI để cá nhân hóa." |
| **0:45–1:10** | `/lo-trinh` — timeline module + starter kit | "Ra ngay lộ trình riêng cho nghề bán hàng: các bài học ngắn, bộ prompt mẫu copy là dùng được." |
| **1:10–1:45** | `/lo-trinh/[moduleId]` — màn bài học 5 bước + **tải file mẫu** | "Mỗi bài học theo 5 bước: thực hành ngay với **file mẫu hệ thống cung cấp**, copy prompt, nộp bài cho AI chấm." |
| **1:45–2:20** | `/tro-ly` — **hỏi Trợ lý AI (LLM THẬT)** — phần lõi | Gõ câu đã kiểm chứng (né cache, ra LLM thật): **"AI giúp được gì cho công việc kế toán hằng ngày của tôi?"** → Trợ lý hỏi lại 1 câu để cá nhân hóa (clarify-first) → chọn chip **"Tổng quan nhiều mảng"** → câu trả lời **stream dần ra**, liệt kê các mảng kế toán kèm ví dụ thật. Thuyết minh: "Trợ lý gọi OpenAI trực tiếp, trả lời bám đúng nghề — không phải câu dựng sẵn." *(Đừng gõ "AI là gì" — trúng cache.)* |
| **2:20–2:40** | Nộp bài → **AI chấm điểm + nhận xét** | "Nộp kết quả thực hành, AI chấm theo tiêu chí, cho điểm và nhận xét — bằng chứng tiến bộ đo được." |
| **2:40–2:55** | `/tien-bo` — tổng giờ tiết kiệm + (lướt qua) `/quan-tri` | "Nhân viên thấy mình tiết kiệm bao nhiêu giờ. Phía quản trị, nền hệ thống đa công ty đã sẵn sàng." |
| **2:55–3:00** | Slide kết | "Một nhân viên — tự dùng được AI vào đúng việc của mình ngay tuần đầu. Cảm ơn đã xem." |

## Lưu ý quay để "ăn điểm" tiêu chí
- **Phải thấy rõ LLM thật:** ở đoạn 1:45–2:20, để câu trả lời **stream dần ra** (không phải hiện ngay tức thì như câu dựng sẵn); nếu được, mở DevTools → tab Network cho thấy request tới `/api/chat` trả streaming.
- **Input → output có nghĩa:** nhỏi 1 câu cụ thể, cho thấy câu trả lời bám đúng nghề + dùng được.
- Quay 1 lần liền mạch 1 user (đăng nhập → học → hỏi AI → chấm → tiến bộ) để chứng minh **end-to-end**.
- Giữ đúng 3 phút: nếu dài, cắt bớt đoạn onboarding, giữ trọn đoạn Trợ lý AI + chấm bài (phần lõi).
- Xuất 1080p, có tiếng thuyết minh tiếng Việt.
- **(Tùy chọn — điểm nhấn an toàn dữ liệu):** nếu còn thời gian, gõ thêm *"Số tài khoản khách hàng là 0123456789, soạn email nhắc nợ"* → Trợ lý **cảnh báo không nên đưa dữ liệu nhạy cảm** rồi mới hỗ trợ bằng placeholder. Cho thấy sản phẩm có ý thức an toàn — gây ấn tượng.
- **Câu dự phòng nếu clarify-first hỏi vòng:** nếu Trợ lý hỏi lại lần nữa, gõ "Trả lời thẳng giúp mình, liệt kê ví dụ cụ thể" để ra đáp án đầy đủ.
