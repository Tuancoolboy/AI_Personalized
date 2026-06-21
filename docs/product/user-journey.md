# User Journey — Team 9 / AI20K-083

> Owner: Lucas. Deadline: 07/06/2026 (đã ship).

## Personas

### P1 — Nhân viên (người dùng cuối, persona chính GĐ1)

| | |
|---|---|
| **Ai** | Nhân viên 25-45 tuổi, các phòng ban kinh doanh / kế toán / marketing / vận hành tại DN 10-200 người |
| **Nỗi đau** | "Em muốn dùng AI nhưng không biết bắt đầu từ đâu" · "Sợ làm sai làm lộ data" · "Sợ bị AI thay thế" |
| **Kết quả mong muốn** | Trong tuần đầu: dùng được AI vào ít nhất 1 việc thường ngày + có ví dụ cụ thể cho nghề mình |
| **Vai trò trong quyết định mua** | Trải nghiệm → giới thiệu cho công ty mua |

### P2 — HR / Trưởng phòng (GĐ2)

| | |
|---|---|
| **Ai** | HR / L&D / trưởng phòng được giao "tìm khóa đào tạo AI" |
| **Nỗi đau** | Cần công cụ đo được hiệu quả — không phải "đã xem video xong" mà là "đã áp dụng được" |
| **Kết quả mong muốn** | Dashboard cho biết ai đang giỏi / ai cần hỗ trợ / phòng nào đang dẫn |
| **Vai trò trong quyết định mua** | Tìm + đề xuất tool cho chủ DN |

### P3 — Chủ doanh nghiệp (GĐ2)

| | |
|---|---|
| **Ai** | Chủ DN SME 10-200 người |
| **Nỗi đau** | Đào tạo cũ tốn 2-5tr/người/lần, không đo được, nhân viên mới phải đào tạo lại |
| **Kết quả mong muốn** | Năng suất tăng có con số chứng minh + nhân viên giỏi hơn hẳn so với khóa offline |
| **Vai trò trong quyết định mua** | Quyết định chi tiền |

## Journey P1 — Nhân viên (đầy đủ flow MVP)

```
[Landing /]
  ↓ click "Đăng nhập"
[/login] → nhập email + password (demo mode: email bất kỳ)
  ↓ detect không phải manager email → vào employee flow
[/onboarding] Bước 1/4: chọn 1 trong 4 vai trò (kinh doanh / kế toán / marketing / vận hành)
  ↓
[/onboarding] Bước 2/4: "Tại sao em cần hỏi 6 câu" — giải thích lý do làm test
  ↓
[/onboarding] Bước 3/4: 6 câu assessment (vị trí, lĩnh vực, công việc hằng ngày, mức độ AI, kỹ năng prompt, công cụ đã dùng)
  ↓
[/onboarding] Bước 4/4: Kết quả — ring score AI level 0-5 + breakdown lộ trình
  ↓ click "Bắt đầu học ngay"
[/lo-trinh]
  ├─ Hero ring progress 0%
  ├─ 3 starter prompts (button Copy)
  ├─ 4 công cụ AI gợi ý theo role
  └─ 6 module timeline (cấp nhập môn / trung cấp / nâng cao)
       ↓ click module
     [Modal] nội dung + "học xong sẽ biết" + button đánh dấu hoàn thành
       ↓ check
     Progress ring cập nhật → 17% → 33% → ...

[/tro-ly] Chat AI
  ├─ Câu hỏi gợi ý theo role
  ├─ Safety check khi paste data nhạy cảm (số điện thoại, tài khoản)
  └─ Canned responses thông minh hoặc OpenAI real (khi có key)

[/kiem-tra/{roleId}] Quiz tình huống
  ├─ 3 câu trắc nghiệm
  ├─ Feedback xanh/đỏ ngay sau khi chọn + giải thích
  └─ Ring score → ≥70% pass

[/tien-bo] Tiến bộ
  ├─ Hero "tổng giờ AI tiết kiệm"
  ├─ 3 stats: % hoàn thành / điểm KT / trình độ AI
  └─ Ghi nhật ký 1-chạm: chip +0.5h / +1h / +2h / +4h + slider hữu ích 1-10
```

## Journey P2 — Quản lý (đầy đủ MVP)

```
[/login] → email "quanly@..." / "manager@..." / "hr@..." / "admin@..."
  ↓ detect manager → redirect /quan-ly (bypass onboarding)
[/quan-ly] Dashboard
  ├─ Header: badge "Quản lý" + "Chị Quản lý · Trưởng phòng"
  ├─ 4 stat cards: Tổng 12 NV / Hoàn thành TB 63% / Đang học 7 / Điểm KT TB 81%
  ├─ Bar chart: Hoàn thành theo phòng ban
  ├─ Donut chart: Trạng thái toàn đội (hoàn thành / đang học / chưa bắt đầu)
  ├─ Line chart: Tiến bộ qua 6 tuần
  └─ Top 6 leaderboard

[/quan-ly/nhan-vien]
  ├─ Filter chip: Tất cả / Kinh doanh / Kế toán / Marketing / Vận hành
  ├─ Bảng 12 NV với avatar màu phòng ban + progress bar + status badge
  ├─ Button "Thêm nhân viên" → modal nhập tên + chọn phòng ban → toast confirm
  └─ Button "Nhập Excel" placeholder cho GĐ2
```

## MVP feature list

### Must-have (đã ship)

- [x] Onboarding 4 bước với assessment 6 câu
- [x] Lộ trình 6 module theo role với starter kit (prompt + tool)
- [x] Trợ lý AI chat với canned responses theo role + safety triggers
- [x] Quiz tình huống 3 câu × 4 role với scoring
- [x] Nhật ký giờ 1-chạm + dashboard tiến bộ cá nhân
- [x] Dashboard quản lý với 3 biểu đồ + bảng team
- [x] Demo mode bypass cho lúc demo thầy (không cần Supabase/OpenAI thật)

### Nice-to-have (GĐ2)

- [ ] Wire-up Supabase thật (replace localStorage)
- [ ] Wire-up OpenAI thật cho /tro-ly (replace canned)
- [ ] Import nhân viên từ Excel
- [ ] Email mời nhân viên khi thêm
- [ ] Notification cho manager khi nhân viên hoàn thành module
- [ ] Bảng so sánh phòng ban detail

### Out of scope (GĐ3)

- AI Agent tự thiết kế lộ trình từ dữ liệu công ty
- Gói VIP lưu prompt nội bộ thành khóa học
- Tự động hóa nghiệp vụ (đọc hóa đơn...)
- Affiliate công cụ AI
