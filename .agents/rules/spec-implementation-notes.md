---
description: "Bắt buộc ghi implementation-notes khi thực thi bất kỳ spec nào trong specs/ (Ưu tiên HTML hơn MD)"
activation: always-on
---

# Rule: Implementation Notes — Bắt buộc khi làm việc với Spec

## Trigger

Rule này kích hoạt **bất cứ khi nào** AI đọc, thực thi, hoặc implement một spec từ `specs/`.

## Yêu cầu bắt buộc

Trước khi kết thúc một task spec, AI **PHẢI** tạo hoặc cập nhật file note ghi nhận quá trình triển khai. 
- **Định dạng ưu tiên:** **HTML** (`.html`). Chỉ sử dụng Markdown (`.md`) nếu dự án không hỗ trợ hoặc có yêu cầu đặc biệt khác.
- **Đường dẫn lưu file:**
  ```
  specs/notes/[SPEC-ID]-implementation-notes.html (ƯU TIÊN)
  hoặc
  specs/notes/[SPEC-ID]-implementation-notes.md (Chỉ dùng khi không dùng được HTML)
  ```

Ví dụ:
- Spec `BE-01-auth.md` → `specs/notes/BE-01-implementation-notes.html`
- Spec `FE-03-onboarding.md` → `specs/notes/FE-03-implementation-notes.html`

## Cấu trúc bắt buộc của file notes

File phải có **đủ 4 phần** sau (nếu không có thông tin thì ghi "Không có"):
1. **Quyết định AI tự ra (ngoài spec):** Những gì AI tự chọn/thiết kế ngoài đặc tả của spec (thư viện, cấu trúc code, tên hàm, thuật toán...).
2. **Những chỗ AI phải thay đổi so với spec gốc:** Những điểm làm khác với tài liệu spec ban đầu và lý do.
3. **Tradeoff AI phải cân nhắc:** Các giải pháp/lựa chọn thay thế đã được đánh giá và lý do chọn giải pháp hiện tại.
4. **Bất kỳ điều gì khác cần lưu ý:** Những hạn chế đã biết (known limitations), lưu ý đặc biệt, gotcha, hoặc các việc cần làm tiếp theo (todo/follow-up).

## Quy tắc bổ sung

- **KHÔNG** bỏ qua file note này dù thay đổi nhỏ hay đơn giản.
- Nếu thực hiện task tự phát (ad-hoc) chưa có spec trước đó, đặt tên file note là `specs/notes/adhoc-[slug]-implementation-notes.html`.
- File note phải được commit và đẩy lên **cùng PR/commit** chứa code logic được implement.
- Nếu tiếp tục cập nhật tính năng của cùng một spec, hãy **chỉnh sửa tiếp trên file HTML notes sẵn có**, tránh tạo mới.

## Template sẵn

- HTML Template (Ưu tiên): `specs/notes/_TEMPLATE-implementation-notes.html`
- MD Template: `specs/notes/_TEMPLATE-implementation-notes.md`
