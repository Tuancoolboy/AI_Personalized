---
phase: 5
title: Auth login/register
status: completed
priority: P1
effort: 2h
dependencies:
  - 1
  - 3
---

# Phase 5: Auth login/register

## Overview

Setup Supabase Auth email/password: trang `/login`, `/register`, middleware bảo vệ route group `(app)`, trigger Postgres auto-tạo `profiles` row khi user đăng ký. UI tối thiểu — polish ở tuần 2.

## Requirements

- **Functional:** user đăng ký email/password → nhận email confirm (hoặc skip confirm nếu config) → login → redirect `/onboarding`. Truy cập `(app)` chưa login → redirect `/login`.
- **Non-functional:** session lưu cookie (qua `@supabase/ssr`); SSR-safe.
- **Bảo mật:** password tối thiểu 8 ký tự; error message generic ("Email hoặc mật khẩu sai") không enumerate.

## Architecture

- `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` — server components render client form.
- `components/auth-login-form.tsx`, `components/auth-register-form.tsx` — client components, dùng `lib/supabase/client.ts` từ Phase 4.
- `middleware.ts` — Next.js middleware kiểm session qua `@supabase/ssr`, bảo vệ pattern `(app)/*`.
- Trigger Postgres `on_auth_user_created` — sau khi `INSERT INTO auth.users`, auto `INSERT INTO profiles (id) VALUES (NEW.id)`. Bổ sung vào migration `0001_init.sql` hoặc tạo `0002_auth_trigger.sql`.
- Layout `app/(app)/layout.tsx` — server-check `getUser()`, render shell có nav.

## Related Code Files

- Create:
  - `middleware.ts` (project root)
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/register/page.tsx`
  - `app/(auth)/layout.tsx` — layout đơn giản cho auth pages
  - `app/(app)/layout.tsx` — layout có user check
  - `components/auth-login-form.tsx`
  - `components/auth-register-form.tsx`
  - `supabase/migrations/0002_profiles_trigger.sql`
- Modify: `lib/supabase/server.ts` — thêm helper `getUser()` cho server components

## Implementation Steps

1. Tạo middleware `middleware.ts` — pattern matcher `/onboarding`, `/lo-trinh`, `/tro-ly`, `/kiem-tra`, `/tien-bo` redirect về `/login` nếu chưa auth.
2. Tạo trigger SQL `0002_profiles_trigger.sql`:
   ```sql
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id) values (new.id);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute function public.handle_new_user();
   ```
3. Tạo `components/auth-register-form.tsx` — useState email/password, gọi `supabase.auth.signUp(...)`, redirect `/onboarding` nếu thành công.
4. Tạo `components/auth-login-form.tsx` — tương tự với `signInWithPassword`.
5. Tạo pages `(auth)/login/page.tsx` + `(auth)/register/page.tsx` import form tương ứng.
6. Tạo `(auth)/layout.tsx` — center card, link qua lại giữa login/register.
7. Tạo `(app)/layout.tsx` — gọi `getUser()` server-side, redirect `/login` nếu null, render nav placeholder.
8. Test luồng register → login → vào `/onboarding` (placeholder page) → logout (button trong nav).

## Success Criteria

- [ ] Register email/password → tạo `auth.users` row + `profiles` row tự động.
- [ ] Login với credentials đúng → redirect `/onboarding`; sai → error "Email hoặc mật khẩu sai".
- [ ] Truy cập `/lo-trinh` chưa login → redirect `/login`.
- [ ] Login → truy cập được `/lo-trinh` (dù page placeholder).
- [ ] Logout → session clear, không vào `(app)` được nữa.
- [ ] Migration `0002` chạy thành công trên Supabase.

## Risk Assessment

- ⚠ **Email confirm bật mặc định trên Supabase:** user sẽ phải verify email trước khi login. **Mitigation:** trong dev tắt confirm (Supabase Dashboard → Auth → Providers → Email → Confirm email = off). Bật lại trước production.
- ⚠ **Middleware matcher Next 16:** API có thể đổi nhẹ từ Next 14. **Mitigation:** đọc `node_modules/next/dist/docs/01-app/03-api-reference/04-file-conventions/middleware.md` trước khi viết.
- ⚠ **Trigger fail khi user xóa:** profiles có FK cascade (`on delete cascade`), nên xóa `auth.users` tự động xóa profile. OK.
