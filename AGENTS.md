# AI Tro Ly — Agent Operating Guide

Read this file before making any change in this repository.

**Applies to every AI agent** in this repo: Cursor, Claude Code, Codex CLI, Gemini CLI, Antigravity, GitHub Copilot, and any other coding assistant.

## All AI Agents — Mandatory Rules

Before any code change, follow **all** always-on rules in `.agents/rules/`:

| Rule file | Purpose |
|-----------|---------|
| `.agents/rules/agent-workflow.md` | Git branch from `develop`, test/review after features, update WORKLOG + docs |
| `.agents/rules/task-completion-checklist.md` | **Đọc trước khi báo task xong** — git, verify, docs, render AI output an toàn |
| `.agents/rules/project-structure.md` | Vị trí tạo file mới, cây thư mục canonical, naming |
| `.agents/rules/supabase-migrations.md` | Đặt tên migration `YYYYMMDDHHMMSS_*`, validate trước commit |
| `.agents/rules/spec-implementation-notes.md` | Implementation notes when working from `specs/` |
| `.agents/rules/ai-log-hook.md` | Do not manually call log scripts |

Tool-specific entry points (each must still follow `.agents/rules/`):

| Tool | Also reads |
|------|------------|
| **Cursor** | `.cursor/rules/agent-workflow.mdc`, `.cursor/rules/task-completion-checklist.mdc` (`alwaysApply: true`) |
| **Claude Code** | `CLAUDE.md` |
| **Codex CLI** | This file (`AGENTS.md`) |
| **Gemini CLI / Antigravity** | `GEMINI.md` + `.agents/rules/*` (`activation: always-on`) |
| **GitHub Copilot** | This file (`AGENTS.md`) |

## Source Of Truth

Before coding, read these files in order:

1. `AGENTS.md`
2. `.agents/rules/agent-workflow.md`
3. `.agents/rules/project-structure.md`
4. `CLAUDE.md`
5. `specs/PROJECT-CONTINUATION.md`
6. `specs/BE-08-multi-manager-roadmap.md`
7. `specs/PHASE2-SPEC.md` when the task is Phase 2 product work

If the task touches a specific spec in `specs/`, read that spec too. When older specs conflict with the current codebase, prefer `specs/PROJECT-CONTINUATION.md`, `specs/BE-08-multi-manager-roadmap.md` for manager/multi-manager work, `CLAUDE.md`, and `package.json`.

For Phase 2 company setup, custom departments/job roles, company learning
paths, four AI capabilities, grading, recommendations, Aha Moment, community,
leaderboards, or AI cost controls, `specs/PHASE2-SPEC.md` is the product
source of truth. Phase 2 implementation still requires an explicit user task.

## Supabase Work

Before changing anything related to Supabase auth/session behavior, Supabase clients,
migrations, RLS policies, profiles, onboarding persistence, module progress,
quiz results, time logs, leads, or chat usage, also read:

- `specs/BE-07-supabase-employee-persistence.md`

For every Supabase/code change, append a change-log entry to
`specs/PROJECT-CONTINUATION.md` before finishing the task. Keep manager
dashboard and employee management as demo/prototype surfaces unless a Phase 2
spec explicitly promotes them.

**Migration naming (bắt buộc):** read `.agents/rules/supabase-migrations.md`.
New files only as `YYYYMMDDHHMMSS_<noi-dung-kebab>.sql`; run `npm run db:validate`
before commit. Do not add `0013_`-style numbered migrations.

## Manager / Multi-Manager Work

Before changing manager auth, manager route guards, manager dashboard data,
employee management, organization/team schema, cross-user RLS policies,
manager APIs, or employee invite/admin flows, also read:

- `specs/BE-08-multi-manager-roadmap.md`

For multi-manager work, update the roadmap checklist in
`specs/BE-08-multi-manager-roadmap.md` as each phase is completed.
Manager dashboard and employee management may move from demo/prototype to
production only by following BE-08.

## Company Invite Link Work

Before changing company-specific login links, token-only invite links,
manager invite-link UI, invite-link APIs, invite acceptance, or register/login
behavior that preserves invite `next` URLs, also read:

- `specs/BE-10-company-invite-links.md`

For company invite-link work, update the roadmap checklist in
`specs/BE-10-company-invite-links.md` as each phase is completed, and
append a change-log entry to `specs/PROJECT-CONTINUATION.md` before
finishing the task.

## Phase 2 Product Work

Before implementing Phase 2 company learning platform work, also read:

- `specs/PHASE2-SPEC.md`

Follow its delivery phases in order. Stabilize Phase 2.0 manager/invite
foundations before adding company authoring, community, or new agent surfaces.
Update its task checklist and
`specs/notes/PHASE2-implementation-notes.html` as work is completed.

## Stack Rules

- This project is **Next.js 16.2.7 App Router**, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, and Vercel.
- Do **not** convert this project to Vite unless the user explicitly asks for a full framework migration plan and approves it.
- Do **not** rewrite routing, auth, API routes, or proxy behavior just to simplify deployment.
- Vercel Framework Preset must be **Next.js**.

## Project Structure

- `src/frontend/` — Next.js runtime (app, components, hooks, lib, public, proxy)
- `src/backend/` — FastAPI + LangGraph (agents, api, models, services)
- `specs/` là source of truth cho spec; `specs/notes/` là nơi duy nhất cho implementation notes.
- `planning/` là nơi duy nhất cho plan/review/demo-plan/decision memo.
- `docs/` chỉ dành cho docs tham khảo dài hạn:
  - `docs/ops/`, `docs/product/`, `docs/handoffs/`, `docs/archive/`, `docs/guide/`
- `tasks/` giữ task summary ngắn.

**Bắt buộc:** trước khi tạo file mới, đọc `.agents/rules/project-structure.md` và đặt file đúng khu vực canonical.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code that changes Next.js APIs, routing, metadata, proxy/middleware, server actions, route handlers, config, or build behavior. Heed deprecation notices.

If `node_modules/next/dist/docs/` is missing, state that the docs are unavailable because dependencies are not installed, then inspect existing local patterns before making a conservative change.
<!-- END:nextjs-agent-rules -->

## UI/UX Work

Before coding UI/UX changes, read the local design skill:

1. `.codex/skills/ui-ux-pro-max-skill-main/CLAUDE.md`
2. `.codex/skills/ui-ux-pro-max-skill-main/README.md`
3. `.codex/skills/ui-ux-pro-max-skill-main/skill.json`

Use the skill's guidance for product type, style, typography, color, landing-page structure, charts, and UX anti-patterns. Keep the existing AI Tro Ly visual direction unless the user asks for a redesign.

## Scope Rules

- Current priority is to stabilize and deploy the existing UI, not rebuild it.
- Landing, auth, onboarding, learning path, chat demo, progress, quiz, and manager demo UI already exist.
- Manager dashboard and employee management include Supabase-backed Phase 2 slices. Do not expand them further unless the user explicitly asks and the work follows `specs/PHASE2-SPEC.md` plus the relevant BE-08/BE-10 spec.
- Keep UI copy in Vietnamese.
- Keep role IDs, route paths, and module IDs in kebab-case without Vietnamese accents.

## Feature Workflow (Mandatory)

Before starting a **new feature**, always sync from `develop` and create a dedicated branch:

```bash
git checkout develop
git pull origin develop
git checkout -b <type>/<short-description>
```

Branch naming: `{type}/{content}` in kebab-case without Vietnamese accents — e.g. `feat/update-lession-ui`, `fix/chat-stream`, `docs/agent-workflow-rules`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`.

After finishing a feature, always **run tests, build, and review the full diff** before claiming done. See Verification below.

During work, always keep docs current — do not defer to the end of the session:

- `WORKLOG.md` — technical decisions, direction changes, important bugs
- `specs/PROJECT-CONTINUATION.md` — change log for every code change
- `specs/notes/*-implementation-notes.html` — when implementing a spec (see `.agents/rules/spec-implementation-notes.md`)
- `planning/` / `docs/` / `tasks/` — keep new files đúng nhóm theo `.agents/rules/project-structure.md`

Canonical rule (all agents): `.agents/rules/agent-workflow.md` (`activation: always-on`).
Cursor mirror: `.cursor/rules/agent-workflow.mdc` (`alwaysApply: true`).

## Spec And Change Notes

- For any work driven by a spec in `specs/`, create or update implementation notes according to `.agents/rules/spec-implementation-notes.md`.
- For ad-hoc code changes, update the change log in `specs/PROJECT-CONTINUATION.md` or create an appropriate note in `specs/notes/`.
- Each change log entry should include date, goal, files touched, decision made, tests run, and follow-up.

## Short Task Notes

- 17/06/2026 — Tuancoolboy: account dropdown + trang tài khoản employee/manager.

## Verification

After completing a feature (not just before commit), run the full check suite:

```bash
npm run lint
npm run test
npm run build
```

Use `npm run test:unit` and/or `npm run test:api` when only part of the suite is relevant, but prefer the full `npm run test` before marking a feature done.

- For docs-only changes, review the diff.
- For code changes, all three commands above must pass when dependencies are installed.
- If `node_modules` is missing, do not pretend the build passed. Say that `npm install` is required first.
- If local Node is below 20, use Node 20 for build: `npx -y -p node@20 node node_modules/next/dist/bin/next build`.
- Do not commit `.env*` secrets.
