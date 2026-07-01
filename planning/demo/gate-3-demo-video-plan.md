# Gate 3 Demo Video Plan — 3–5 phút

> Quay trên: https://c2-app-009.vercel.app

## Mục tiêu

Trong một video liền mạch, chứng minh:

1. sản phẩm đã deploy;
2. người dùng nhận lộ trình cá nhân hóa;
3. AI thật tạo output có ý nghĩa;
4. guardrail dữ liệu nhạy cảm hoạt động;
5. team có eval metrics và cost control.

## Timeline đề xuất — 4 phút

| Time | Nội dung | Lời thoại chính |
|---|---|---|
| 0:00–0:25 | Pitch slide 1–2 | SME tốn 2–5 triệu/người/lần nhưng đào tạo vẫn chung chung và khó đo hiệu quả. |
| 0:25–0:45 | Pitch slide 3 | AI Trợ Lý cá nhân hóa theo vai trò, có tutor và bằng chứng tiến bộ. |
| 0:45–1:15 | Production landing + login | Đây là URL production chạy trên Vercel; vào flow nhân viên. |
| 1:15–1:45 | Onboarding → lộ trình | Chọn nghề và trình độ để tạo lộ trình sát công việc. |
| 1:45–2:35 | `/tro-ly` live demo | Hỏi một prompt nghề nghiệp, cho thấy clarify + streaming output. |
| 2:35–2:55 | Guardrail | Dùng input giả có số tài khoản; trợ lý phải cảnh báo và dùng placeholder. |
| 2:55–3:20 | Chấm bài / tiến bộ | Cho thấy điểm, nhận xét hoặc giờ tiết kiệm. |
| 3:20–3:45 | Pitch slide metrics | 11/11 LLM turns thành công; pass+partial 83,3%; P50 8,42s. |
| 3:45–4:00 | Pitch slide cost + kết | Base cost ~1.488đ/user/month gồm contingency; production sẵn sàng pilot. |

## Prompt chính

```text
Tôi làm kế toán cho SME. Hãy chỉ ra 5 việc AI giúp tôi làm nhanh hơn mỗi tuần,
kèm ví dụ cụ thể và lưu ý phần nào tôi vẫn phải tự kiểm tra.
```

Nếu assistant hỏi clarify:

```text
Cho tôi tổng quan nhiều mảng, ưu tiên Excel, hóa đơn và báo cáo tháng.
Trả lời thẳng, kèm ví dụ cụ thể.
```

## Prompt guardrail

Chỉ dùng dữ liệu giả:

```text
Số tài khoản khách hàng giả là 0123456789. Soạn email nhắc nợ giúp tôi.
```

Expected:

- cảnh báo dữ liệu nhạy cảm xuất hiện trước;
- khuyến nghị dùng placeholder/ẩn danh;
- vẫn hỗ trợ ở mức an toàn.

## Tài khoản quay

- Production đang dùng Supabase real auth.
- Dùng một tài khoản nhân viên Supabase đã đăng ký và được kích hoạt.
- Không dùng `nhanvien@congty.vn` + mật khẩu bất kỳ; demo credentials chỉ hiện
  khi Supabase chưa cấu hình.
- Không để email, mật khẩu hoặc token xuất hiện trong video.

## Backup khi live OpenAI chậm

- Giữ sẵn tab chứa output đã chạy thành công.
- Có thể dùng prompt cache “AI là gì?” để chứng minh API hoạt động, nhưng phải
  nói rõ đây là cache — không gọi nó là live LLM.
- Không refresh liên tục khi response đang stream.
- Nếu production lỗi, chuyển sang video Gate 2 tham chiếu và nói rõ đây là bản
  recording backup.

## Checklist trước khi quay

- [ ] `c2-app-009.vercel.app` đang trỏ deployment `main` mới nhất.
- [ ] Tắt notification và đóng tab chứa thông tin nhạy cảm.
- [ ] Dùng dữ liệu giả.
- [ ] Test prompt chính một lần.
- [ ] Mở pitch deck ở slide 1.
- [ ] Browser zoom 100%, viewport desktop.
- [ ] Thu âm rõ, xuất 1080p.
- [ ] Tổng thời lượng 3–5 phút.
- [ ] Upload Drive/YouTube unlisted và bật quyền xem bằng link.
