# Implementation Notes — [SPEC-ID]: [Tên ngắn của task]
> Spec: `specs/[spec-filename].md`
> Thực hiện bởi: [AI model — ví dụ: Claude Sonnet / Gemini / GPT-4o]
> Ngày: [YYYY-MM-DD]
> Branch: `feat/[name]/[spec-id]`

---

## 1. Quyết định AI tự ra (ngoài spec)

> Những gì AI chủ động quyết định mà spec không đề cập hoặc để ngỏ.

| # | Quyết định | Lý do |
|---|-----------|-------|
| 1 | _(ví dụ: Dùng `zod` để validate request body)_ | _(type-safe, tích hợp tốt với Next.js)_ |
| 2 | | |

---

## 2. Những chỗ AI thay đổi so với spec gốc

> Những gì spec nói nhưng AI implement khác — phải ghi rõ lý do.

| # | Spec nói | AI làm gì thay thế | Lý do |
|---|----------|-------------------|-------|
| 1 | _(ví dụ: Dùng Redis cho rate-limit)_ | _(Dùng DB table vì chưa có Redis)_ | _(Tránh thêm infra, đủ cho Phase 1)_ |
| 2 | | | |

_Nếu không có thay đổi: ghi "Không có — implement đúng theo spec."_

---

## 3. Tradeoff AI phải cân nhắc

> Các lựa chọn đã được xem xét và lý do chọn hướng hiện tại.

### [Tradeoff 1 — ví dụ: JWT vs Session Cookie]
- **Option A (đã chọn):** JWT stateless
  - ✅ Không cần server-side session store
  - ❌ Không thể revoke ngay lập tức
- **Option B:** Session cookie với Redis
  - ✅ Có thể revoke
  - ❌ Cần thêm Redis, phức tạp hơn cho Phase 1
- **Quyết định:** Chọn A vì Phase 1 chưa cần revoke, đơn giản hơn.

---

## 4. Những điều khác bạn nên biết

> Bất cứ điều gì quan trọng không nằm trong 3 mục trên: known limitation, gotcha, cần follow-up, dependency ngầm.

- _(ví dụ: **Known limitation:** Token không expire sớm nếu user đổi password — cần fix ở Phase 2)_
- _(ví dụ: **Gotcha:** Middleware `requireAuth` phải đặt TRƯỚC route handler, không phải sau)_
- _(ví dụ: **Cần follow-up:** Chưa có unit test cho `buildSystemPrompt()` — nên thêm trước Sprint 4)_
- _(ví dụ: **Dependency ngầm:** FE-06 phải gọi `/api/tutor/chat` với header `Authorization`, không dùng cookie)_

---

## Checklist trước khi commit

- [ ] File này đã điền đủ 4 section (không để trống không lý do)
- [ ] Tên file đúng format: `[SPEC-ID]-implementation-notes.md`
- [ ] File được commit **cùng PR** với code
- [ ] Nếu có thay đổi so với spec → đã thông báo cho team lead / người viết spec
