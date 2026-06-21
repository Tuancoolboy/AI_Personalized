# GEMINI.md — AI Trợ Lý

> Hướng dẫn cho **Gemini CLI**, **Antigravity IDE**, và mọi agent Gemini làm việc trong repo này.
> Đọc kỹ trước khi viết bất kỳ dòng code nào.

## Bắt buộc đọc trước

1. `AGENTS.md` — operating guide chung
2. `CLAUDE.md` — phạm vi Giai đoạn 1, stack, user stories
3. `specs/PROJECT-CONTINUATION.md` — trạng thái hiện tại
4. **`.agents/rules/agent-workflow.md`** — quy trình git branch, test/review, worklog (**bắt buộc**)
5. **`.agents/rules/task-completion-checklist.md`** — checklist trước khi báo task xong (**bắt buộc**)
6. **`.agents/rules/project-structure.md`** — vị trí tạo file mới (**bắt buộc**)
7. Các rule always-on khác trong `.agents/rules/` (spec notes, AI logging)

## Quy trình làm feature (tóm tắt)

```bash
git checkout develop && git pull origin develop
git checkout -b <type>/<noi-dung>   # vd. feat/update-lession-ui
```

Sau khi xong: `npm run lint` → `npm run test` → `npm run build` + review diff + checklist `.agents/rules/task-completion-checklist.md`.

Trong lúc làm: cập nhật `WORKLOG.md` và `specs/PROJECT-CONTINUATION.md`.

Chi tiết đầy đủ: `.agents/rules/agent-workflow.md`.

Khi tạo file mới: bắt buộc theo `.agents/rules/project-structure.md`.

## Nguyên tắc vàng

Chỉ build đúng phạm vi **Giai đoạn 1**. Mọi thứ GĐ2–3 → `// TODO: Giai đoạn 2`, không code.
