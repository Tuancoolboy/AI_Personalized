---
description: "Checklist bắt buộc trước khi báo task xong — git, verify, docs, render AI output an toàn"
activation: always-on
---

# Task Completion Checklist — Bắt buộc

> Áp dụng **mọi** AI agent/tool trước khi kết luận task hoàn thành, mở PR, hoặc commit feature.
> Canonical source: file này. Mirror Cursor: `.cursor/rules/task-completion-checklist.mdc`.
> Bài học rút từ review PR `feat/chat-module-lesson-links` (2026-06-16).

Đọc file này **sau khi code xong**, **trước khi** báo user "đã xong".

---

## 1. Git — không code feature trên `develop`

- [ ] Task là feature/fix/refactor mới → đã `git checkout develop && git pull origin develop`
- [ ] Đã tạo nhánh `{type}/{noi-dung-kebab}` **trước** khi sửa code (không commit feature trực tiếp trên `develop`/`main`)
- [ ] Tên nhánh đúng convention (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`)

Chi tiết: `.agents/rules/agent-workflow.md` §1.

---

## 2. Verify — bằng chứng chạy lệnh

- [ ] `npm run lint` pass (0 error)
- [ ] `npm run test` hoặc phần suite liên quan pass
- [ ] `npm run build` pass (Node < 20 → dùng Node 20, xem `AGENTS.md`)
- [ ] Đã review toàn bộ diff: scope, edge case, copy tiếng Việt, không lộ secret

**Không** báo xong nếu chưa chạy hoặc chưa pass.

---

## 3. Docs — cập nhật trong lúc làm

- [ ] `specs/PROJECT-CONTINUATION.md` — append change-log (date, goal, files, decision, tests)
- [ ] `WORKLOG.md` — nếu có quyết định kỹ thuật / đổi hướng quan trọng
- [ ] Spec checklist / implementation notes nếu task bám spec BE/Phase 2

---

## 4. Render nội dung AI / parser tùy biến

> Áp dụng khi task chạm: chat UI, rich text, markdown nhẹ, link từ LLM/user input.

### 4.1 Parser — scoped, không phải Markdown đầy đủ

- [ ] Parser chỉ hỗ trợ subset cần thiết (vd. bold, link nội bộ, guillemet fallback)
- [ ] Có comment hoặc test mô tả **phạm vi cố ý** — tránh reviewer/ agent sau mở rộng regex ad-hoc
- [ ] Pattern lồng nhau (`**[Title](/path)**`): ưu tiên token cụ thể (link) trước wrapper (bold), hoặc parse đệ quy nội dung bold
- [ ] Parser đệ quy có **depth guard** (vd. `MAX_INLINE_PARSE_DEPTH`) — tránh stack overflow nếu regex đổi sau này
- [ ] Inline parser chat: **giới hạn độ dài dòng** + **cap số token**; ưu tiên quét tuyến tính thay vì `matchAll` global regex trên input dài
- [ ] Vòng `while (index)` phải **đảm bảo index tăng** mỗi vòng (guard khi token rỗng / logic stall)
- [ ] Tránh regex `[^…]+` không giới hạn trên input dài — dùng `indexOf` / scan có bound

### 4.2 Href từ AI/user — whitelist bắt buộc

- [ ] Chỉ render `<a href>` khi pass hàm whitelist (vd. `^/lo-trinh/[a-z0-9-]+$`)
- [ ] Từ chối: `javascript:`, `https://`, protocol-relative, query/hash, path segment thừa
- [ ] Fail-safe: href không hợp lệ → **plain text**, không link

### 4.3 React — phân biệt escape vs XSS thật

- [ ] Text trong JSX `{variable}` → React auto-escape; **không** gọi là XSS chỉ vì label chứa `<img...>`
- [ ] **Không** dùng `dangerouslySetInnerHTML` cho output AI trừ khi có sanitize rõ ràng
- [ ] Link ngoài / tab mới: `target="_blank"` + `rel="noopener noreferrer"` khi product yêu cầu

### 4.4 Prompt + UI — hai lớp

- [ ] System prompt / context block hướng AI output format chuẩn (vd. `[Tên](/lo-trinh/{id})`)
- [ ] Context knowledge embed URL/id từ nguồn canonical — AI không phải đoán path
- [ ] UI fallback format cũ (vd. «tên module») map sang link qua dữ liệu tĩnh, không trust freeform URL

### 4.5 Test regression

- [ ] Parser có test: `javascript:`, external URL, encoded/special href, path thừa
- [ ] Nếu reviewer nghi XSS label: thêm test `renderToStaticMarkup` chứng minh React escape (không cần DOMPurify cho text child)

Ví dụ tham chiếu: `src/frontend/lib/module-lesson-links.ts`, `module-lesson-links.test.ts`, `assistant-chat-render.test.ts`.

---

## 5. Câu kết luận cuối (agent tự kiểm)

Trước khi trả lời user "đã xong", xác nhận:

1. Đang ở **đúng nhánh feature** (không phải develop trừ docs-only có user cho phép)
2. Có **output lệnh** lint/test/build pass
3. Docs đã cập nhật
4. Nếu có parser/link AI output → đã áp dụng §4

Nếu thiếu mục nào → hoàn thiện trước, không báo xong.
