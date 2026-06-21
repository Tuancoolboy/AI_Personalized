---
description: "Quy tắc bắt buộc về cấu trúc thư mục, vị trí tạo file mới, và naming trong toàn repo"
activation: always-on
---

# Project Structure — Bắt buộc cho mọi agent/tool

> Canonical source cho vị trí tạo file mới trong repo này.
> Mọi AI agent/tool phải tuân theo rule này trước khi tạo file hoặc thư mục mới.

## 1. Nguyên tắc cốt lõi

- Một loại artifact chỉ nên có **một khu vực canonical**.
- Khi tạo file mới, **không** được đặt ở "chỗ tiện tay"; phải đặt đúng thư mục chức năng.
- Nếu chưa rõ file nên nằm ở đâu, agent phải:
  1. đối chiếu rule này,
  2. đối chiếu `README.md` + `docs/README.md`,
  3. rồi mới tạo file.
- Nếu vẫn không có vị trí phù hợp, agent phải:
  - nêu rõ lý do,
  - đề xuất vị trí mới,
  - và cập nhật rule/docs cấu trúc trong **cùng task** nếu user yêu cầu tạo file đó.

## 2. Cây thư mục canonical

```text
/
├── README.md · AGENTS.md · CLAUDE.md · GEMINI.md
├── WORKLOG.md · JOURNAL.md
├── specs/                 # Source of truth cho product/backend/frontend specs
│   └── notes/             # Implementation notes theo spec hoặc ad-hoc
├── adrs/                  # Architecture decision records
├── planning/              # Kế hoạch, review, decision docs, backlog, sprint plans
│   ├── backlog.md
│   ├── decisions/
│   ├── demo/
│   ├── reviews/
│   └── sprints/
├── tasks/                 # Task summary ngắn, bám theo sprint/task id
├── docs/                  # Tài liệu tham khảo dài hạn, không phải spec/planning
│   ├── README.md
│   ├── archive/
│   ├── handoffs/
│   ├── ops/
│   ├── product/
│   └── guide/
├── src/                   # Application source
│   ├── frontend/          # Next.js 16 (app, components, hooks, lib, public, proxy)
│   └── backend/           # FastAPI + LangGraph (agents, api, models, services)
├── scripts/               # Script CLI/tooling/test helpers
├── supabase/              # Config, migrations, SQL scripts
└── legacy/                # Deprecated — đã chuyển vào src/backend
```

## 3. Quy tắc đặt file theo loại

### 3.1 App code

**Frontend (Next.js):**

- Route/page/layout/loading/error/API route → `src/frontend/app/**`
- Reusable UI component → `src/frontend/components/**`
- Shared hook → `src/frontend/hooks/**`
- Shared business logic/helper/type/test fixture → `src/frontend/lib/**`
- Static public asset → `src/frontend/public/**`
- Next.js proxy (auth guard) → `src/frontend/proxy.ts`

**Backend (FastAPI + LangGraph):**

- LangGraph agent → `src/backend/agents/**`
- FastAPI routes → `src/backend/api/**`
- Pydantic schemas → `src/backend/models/**`
- Services (LLM, …) → `src/backend/services/**`
- Backend tests → `src/backend/tests/**`

**Cấm:**
- tạo lại `app/`, `components/`, `hooks/`, `lib/` ở root hoặc trực tiếp dưới `src/` (ngoài `frontend/`)
- đặt Next.js runtime mới ngoài `src/frontend/`

### 3.2 Specs và implementation notes

- Spec sản phẩm / BE / FE / roadmap source of truth → `specs/*.md` hoặc `specs/*.html`
- Implementation notes theo spec → `specs/notes/[SPEC-ID]-implementation-notes.html`
- Ad-hoc implementation note → `specs/notes/adhoc-[slug]-implementation-notes.html`

**Cấm:**
- tạo spec mới trong `docs/`
- tạo implementation note ngoài `specs/notes/`

### 3.3 Planning artifacts

- Sprint plan / phase plan → `planning/sprints/<task-id-or-sprint-slug>/`
- Demo plan → `planning/demo/`
- Review notes / review checklist / audit review → `planning/reviews/`
- Decision plan / pre-implementation decision memo → `planning/decisions/`
- Backlog tổng → `planning/backlog.md`

**Cấm:**
- tạo planning doc mới ở root `docs/` nếu bản chất là kế hoạch hoặc review

### 3.4 Docs tham khảo dài hạn

- Hướng dẫn setup / vận hành / môi trường / deploy / OAuth / Supabase → `docs/ops/`
- User journey / product context / product explainer không phải spec → `docs/product/`
- Handoff / bàn giao / kết quả tổng hợp → `docs/handoffs/`
- Tài liệu cũ, file nhập từ ngoài, file không còn là source of truth → `docs/archive/`
- Guidebook / tài liệu học / template tham khảo → `docs/guide/`

**Cấm:**
- lưu spec source of truth trong `docs/`
- lưu sprint/task planning trong `docs/`

### 3.5 Database và scripts

- Supabase migration mới → `supabase/migrations/`
- Supabase admin/reset/seed SQL script → `supabase/scripts/`
- Node/bash/python helper script → `scripts/`

### 3.6 Assets

- Asset public runtime → `src/frontend/public/`
- Sample file tải xuống theo tính năng → `src/frontend/public/files/`
- Ảnh tool/UI public → `src/frontend/public/images/`

**Cấm:**
- đặt asset runtime trong `docs/` hoặc `planning/`

### 3.7 Backend boilerplate

- FastAPI/LangGraph Python code → `src/backend/`

**Cấm:**
- import Next.js runtime từ `src/backend/`
- thêm feature frontend mới ngoài `src/frontend/` trừ khi user yêu cầu tách package

## 4. Naming conventions

- File/folder mới mặc định dùng `kebab-case` ASCII, không dấu.
- Exception:
  - spec IDs giữ format đang dùng như `BE-08-multi-manager-roadmap.md`
  - ADRs giữ format `0001-topic.md`
  - implementation notes giữ format rule riêng
  - Next.js special files giữ convention framework (`page.tsx`, `layout.tsx`, `route.ts`, ...)

## 5. Checklist trước khi tạo file mới

Trước khi tạo file mới, agent/tool phải tự kiểm:

1. Đây là code, spec, planning, docs tham khảo, hay asset?
2. Đã có thư mục canonical cho loại file này chưa?
3. Tên file đã đúng convention chưa?
4. Có đang tạo trùng một source of truth hiện có không?
5. Có cần cập nhật link/reference/rule trong cùng task không?

## 6. Các ví dụ bắt buộc

- Tạo spec Phase 2 mới → `specs/PHASE2-xyz.md`
- Tạo note triển khai cho `BE-13` → `specs/notes/BE-13-implementation-notes.html`
- Tạo plan demo → `planning/demo/<slug>.md`
- Tạo review checklist → `planning/reviews/<slug>.md`
- Tạo hướng dẫn setup OAuth → `docs/ops/<slug>.md`
- Tạo handoff bàn giao → `docs/handoffs/<slug>.md`
- Tạo task summary → `tasks/<task-id-or-date>-<slug>.md`
- Tạo utility mới cho app → `src/frontend/lib/<slug>.ts`

