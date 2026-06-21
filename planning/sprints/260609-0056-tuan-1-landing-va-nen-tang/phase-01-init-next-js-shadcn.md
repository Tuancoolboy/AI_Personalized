---
phase: 1
title: Init Next.js + shadcn
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Init Next.js + shadcn

## Overview

Khởi tạo Next.js 16 (App Router, TypeScript, Tailwind v4) trong thư mục dự án (path có dấu tiếng Việt — phải né lỗi validate npm name), init shadcn/ui, cài Supabase + OpenAI SDK.

## Requirements

- **Functional:** `npm run build` + `npm run lint` chạy không lỗi; có thể `import { Button } from "@/components/ui/button"`.
- **Non-functional:** package name hợp lệ (`ai-tro-ly`); cấu trúc thư mục theo CLAUDE.md §5.

## Architecture

- Init Next.js trong subfolder tạm `ai-tro-ly-init/` (vì path gốc có dấu) → move contents lên root → xóa subfolder + `.git` nested.
- Tailwind v4 dùng `@tailwindcss/postcss` (không có `tailwind.config.js` như v3).
- shadcn preset `base-nova` (lệnh `npx shadcn@latest init -d -y --no-monorepo --pointer`).

## Related Code Files

- Create:
  - `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
  - `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
  - `components/ui/{button,input,card,label}.tsx`, `lib/utils.ts`
  - `components.json` (shadcn config)
  - `AGENTS.md` (Next.js agent rules)
- Modify: `CLAUDE.md` — ghi đúng version (Next 16, Tailwind v4)

## Implementation Steps (đã hoàn thành)

1. ✔ `npx create-next-app@latest ai-tro-ly-init --typescript --tailwind --app --eslint --no-src-dir --import-alias="@/*" --use-npm --yes`
2. ✔ Move contents từ `ai-tro-ly-init/` lên root, xóa `.git` nested và subfolder.
3. ✔ Rename `package.json` name: `ai-tro-ly-init` → `ai-tro-ly`.
4. ✔ `npm install @supabase/supabase-js @supabase/ssr openai`.
5. ✔ `npx shadcn@latest init -d -y --no-monorepo --pointer`.
6. ✔ `npx shadcn@latest add input card label -y`.
7. ✔ Verify `npm run build` pass.
8. ✔ Update CLAUDE.md tech stack (Next 16 thay vì 14, Tailwind v4).

## Success Criteria

- [x] `npm run build` exit 0, sinh `.next/` đầy đủ.
- [x] `components/ui/{button,input,card,label}.tsx` tồn tại và import được qua `@/components/ui/*`.
- [x] `package.json > name = "ai-tro-ly"`.
- [x] Dependencies hiện diện: `next@16.x`, `react@19.x`, `@supabase/supabase-js`, `@supabase/ssr`, `openai`.

## Risk Assessment

- ⚠ **Tailwind v4 + shadcn:** preset `base-nova` đã handle, nhưng nếu sau này add component qua MCP/script khác có thể conflict. Workaround: luôn dùng `npx shadcn@latest add ...`.
- ⚠ **Next 16 breaking changes:** đọc `AGENTS.md` + `node_modules/next/dist/docs/` trước khi dùng API mới (e.g. `unstable_instant`, server actions thay đổi).

## Outcome

Phase 1 hoàn thành. Project sẵn sàng cho Phase 2 (landing page).
