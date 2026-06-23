# SPEC: BE-10 — Company Invite Links Token-Only

> Phase 2 · Company-scoped invite links · Token-only entry into an
> organization from manager employee management.

## Goal

Managers can create a token-only invite link for their company/organization.
Employees use that link to register or log in, then the app automatically adds
them to the correct `organization_members` row.

No company slug, subdomain, or public company directory is required in this
phase.

## Scope

### In scope

- Token-only invite URL: `/moi/[token]`.
- One active invite link per manager per organization.
- Manager can create/copy the current active link.
- Manager can rotate the token to invalidate the old link.
- Invite links attach to:
  - `organization_id`
  - `created_by` manager user id
  - random URL-safe `token`
- Register/login links preserve `next=/moi/[token]/accept`.
- Accepting a valid invite creates or keeps an `organization_members` row with:
  - `member_role = employee`
  - `department_id = khac` when no existing department exists
  - `invited_by = created_by`
- Manual employee add by email remains available.

### Out of scope

- Company slug routes such as `/c/acme/login`.
- Subdomain routing.
- Expiring invite links by time.
- Seat limits, billing, audit logs.
- Email delivery/custom email templates.
- Public listing of companies.

## Data Model

Migration `supabase/migrations/0011_company_invite_links.sql` adds:

- `organization_invite_links`

Columns:

- `id uuid primary key`
- `organization_id uuid references public.organizations`
- `created_by uuid references auth.users`
- `token text unique`
- `is_active boolean`
- `created_at timestamptz`
- `updated_at timestamptz`
- `last_used_at timestamptz`

There must be at most one active link per `(organization_id, created_by)`.

`token` is a bearer secret. Do not log token values in server logs.
RLS is enabled with no anon/client policies; Route Handlers use the Supabase
service role key after checking manager context.

## Runtime Behavior

### Demo mode

When Supabase env vars are missing:

- manager UI can show that real invite links require Supabase
- no persistent invite token is created
- manual demo employee add remains available

### Supabase real mode

When Supabase env vars exist:

- manager invite link APIs require a manager session through BE-08 membership
- API reads/writes invite links with service role inside Route Handlers only
- public `/moi/[token]` validates an active token and shows organization name
- logged-out users are sent to register/login with `next=/moi/[token]`
- `/moi/[token]/accept` accepts membership only via explicit `POST`; `GET`
  redirects back to the invite page without mutating data
- authenticated users submit the invite form on `/moi/[token]` to POST accept
- accept validates the token, writes membership, updates `used_count`, and
  redirects to onboarding or learning path
- an existing manager/owner membership must not be downgraded to employee
- an existing membership in another organization blocks invite acceptance with
  a clear Vietnamese error; invite links do not move users between companies

## Phase Checklist

- [x] Phase 3.1 — Create BE-10 spec and require it in `AGENTS.md`.
- [x] Phase 3.2 — Add invite-link migration and RLS policies.
- [x] Phase 3.3 — Add manager invite-link APIs.
- [x] Phase 3.4 — Add public `/moi/[token]` and accept flow.
- [x] Phase 3.5 — Add manager UI for create/copy/rotate link.
- [ ] Phase 3.6 — Smoke test two real managers/organizations in production-like Supabase.

Update 2026-06-23: tài khoản thường không được tạo membership Cộng đồng. Vì
vậy accept invite hợp lệ sẽ chuyển audience Học tập sang công ty vừa nhận;
XP Cộng đồng vẫn được giữ trong ledger cũ, còn XP công ty bắt đầu từ 0.
Phase 3.6 vẫn mở cho tới khi smoke test production-like xác nhận toàn bộ flow.

## Acceptance Criteria

- Manager A and Manager B receive different tokens.
- Employee joining with Manager A's token appears only in Manager A's
  organization team.
- Invalid or inactive tokens show a clear Vietnamese error page.
- Existing logged-in users can accept a valid invite.
- Existing logged-in users who already belong to another organization cannot
  accept a second company's invite.
- New users can register through a valid invite and are added after login.
- Manual add-by-email still works.
- Build passes with Node 20:
  `npx -y -p node@20 node node_modules/next/dist/bin/next build`.
