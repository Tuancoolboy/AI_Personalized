---
description: "Quy trình bắt buộc cho MỌI AI agent — git branch, test/review, cập nhật worklog"
activation: always-on
---

# Agent Workflow — Bắt buộc (mọi AI tool)

> Áp dụng cho **mọi** AI agent làm việc trong repo này: Cursor, Claude Code, Codex, Gemini CLI, Antigravity, Copilot, v.v.
> Canonical source: file này. Bản sao: `.cursor/rules/agent-workflow.mdc`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.

Trước khi tạo file/thư mục mới, đọc thêm `.agents/rules/project-structure.md`.

## 1. Bắt đầu feature mới (Git)

Trước khi code feature mới, **luôn** đồng bộ từ `develop` và tạo nhánh riêng:

```bash
git checkout develop
git pull origin develop
git checkout -b <type>/<noi-dung-ngan>
```

**Đặt tên nhánh:** `{type}/{noi-dung}` — kebab-case, không dấu tiếng Việt.

| Type | Khi nào dùng |
|------|--------------|
| `feat` | Tính năng mới hoặc cải tiến hành vi |
| `fix` | Sửa bug |
| `chore` | Tooling, deps, config |
| `docs` | Chỉ tài liệu |
| `refactor` | Tái cấu trúc, không đổi hành vi |

Ví dụ: `feat/update-lession-ui`, `fix/chat-rate-limit`, `docs/agent-workflow-rules`

**Không** bắt đầu feature trên nhánh cũ/stale mà chưa pull `develop`, trừ khi user yêu cầu rõ.

## 2. Sau khi hoàn thành feature (Test & Review)

Trước khi báo xong, **bắt buộc** chạy và pass:

```bash
npm run lint
npm run test          # hoặc npm run test:unit + npm run test:api nếu phù hợp
npm run build
```

Nếu Node local < 20, dùng Node 20 cho build (xem `AGENTS.md` Verification).

Sau test, **review toàn bộ diff** so với yêu cầu: scope, edge case, copy tiếng Việt, không lộ secret, không mở rộng sang GĐ2–3.

**Trước khi báo task xong:** chạy checklist `.agents/rules/task-completion-checklist.md` (git nhánh, verify, docs, render AI output nếu có).

Chỉ báo hoàn thành khi có bằng chứng lệnh chạy pass. Không giả vờ build/test đã pass.

## 3. Cập nhật Worklog & tài liệu (trong suốt quá trình)

Cập nhật **trong lúc làm**, không để cuối session:

| File | Khi nào |
|------|---------|
| `WORKLOG.md` | Quyết định kỹ thuật, đổi hướng, bug quan trọng |
| `specs/PROJECT-CONTINUATION.md` | Mọi thay đổi code — append change-log (date, goal, files, decision, tests, follow-up) |
| `specs/notes/*-implementation-notes.html` | Task theo spec trong `specs/` |
| Spec checklist tương ứng | BE-07 / BE-08 / BE-10 nếu chạm phạm vi đó |

Thứ tự đọc trước khi code: `AGENTS.md` → `CLAUDE.md` → `specs/PROJECT-CONTINUATION.md`.

## 4. Supabase migration (bắt buộc khi đụng schema)

Đọc `.agents/rules/supabase-migrations.md`. Tóm tắt:

- File mới: `YYYYMMDDHHMMSS_<noi-dung-kebab>.sql` (14 chữ số UTC).
- **Không** tạo `0017_xxx.sql` / `0024_xxx.sql`.
- Trước commit: `npm run db:validate`.
- Tạo file: `npx supabase migration new <ten-ngan>`.
