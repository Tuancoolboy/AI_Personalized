# SPEC: BE-08 — Multi-Manager Roadmap

> Phase 2 · Manager thật · Source of truth for organization membership,
> manager access, team data, and employee invite/admin flows.

## Goal

Promote the existing manager dashboard and employee management screens from
demo/prototype to Supabase-backed manager surfaces. Manager access must be based
on organization membership, not email pattern, when Supabase real mode is
configured.

Demo mode must keep working when Supabase env vars are missing.

## Scope

### In scope

- `organizations` and `organization_members` schema with RLS.
- Manager/owner membership as the real-mode source of truth.
- Manager route/API guards based on `organization_members`.
- Team list/dashboard data scoped to the manager's organization.
- Manager team table can read employee contact info from profiles, including
  phone number.
- Until organization switching UI exists, each manager email gets one private
  organization by default (`Công ty của <email>`).
- Until organization switching UI exists, each Auth user/email may belong to
  only one organization.
- Manager employee invite flow:
  - email
  - verify an existing registered auth user by email before assigning
    membership/role
  - use the employee profile role as department when available, otherwise
    default to `khac`
  - optional manager access checkbox
- Token-only company invite links are governed by
  `specs/BE-10-company-invite-links.md`.

### Out of scope

- Billing and seat limits.
- Multiple organization switching UI.
- Excel import.
- Custom email templates beyond Supabase Auth defaults.
- Production-grade audit logs.

## Data Model

Migration `supabase/migrations/0008_multi_manager_core.sql` adds:

- `organizations`
- `organization_members`

`organization_members.member_role` values:

- `owner`
- `manager`
- `employee`

`organization_members.department_id` values reuse app role IDs:

- `kinh-doanh`
- `ke-toan`
- `marketing`
- `van-hanh`
- `khac`

Employee contact fields remain on `profiles`:

- `profiles.phone_number`

Migration `supabase/migrations/0015_single_organization_membership.sql` adds a
global unique constraint on `organization_members.user_id` after cleaning up
older duplicate memberships.

## Runtime Behavior

### Demo mode

When Supabase env vars are missing:

- demo manager cookie still allows `/quan-ly`
- team data falls back to `lib/team-data.ts`
- adding an employee returns a local/demo member

### Supabase real mode

When Supabase env vars exist:

- manager access is read from `organization_members`
- team GET is scoped to the manager's organization
- manager dashboard/team screens must show an empty team when the organization
  has no members; they must not fall back to demo names in real mode
- manager dashboard/team screens exclude the currently logged-in manager from
  the employee list and team metrics
- manager POST finds an existing auth user by email, uses `profiles`/auth
  metadata for display info when available, then writes `organization_members`
- manager POST with "Cấp quyền quản lý" creates a private organization for the
  matched email instead of adding that manager to the current manager's company
- manager POST and company invite accept both reject users who already belong
  to another organization
- service role is used only inside server Route Handlers

## Phase Checklist

- [x] Phase 2.1 — Create organization/membership schema and RLS.
- [x] Phase 2.2 — Use membership for real-mode manager auth/route guards.
- [x] Phase 2.3 — Read manager dashboard/team data from Supabase in real mode.
- [x] Phase 2.4 — Add manager invite flow with email + department + permission checkbox.
- [ ] Phase 2.5 — Smoke test multiple organizations/managers in production-like Supabase.
- [ ] Phase 2.6 — Add Excel import or bulk invite.
- [ ] Phase 2.7 — Add audit log and seat-limit enforcement.

Update 2026-06-23: Học tập now resolves Community/Company audience from
`organization_members`; room list/create/preview/join and quiz XP are isolated
to that audience. Cross-company room codes are blocked again. Migration
`20260623023753` has been applied; Phase 2.5 remains open until the
multi-account Supabase/Vercel smoke matrix passes.

## Acceptance Criteria

- Without Supabase env vars, manager demo flow still works.
- With Supabase env vars and migrations applied, non-manager users cannot access
  `/quan-ly`.
- A manager can add an employee by email when the email belongs to an existing
  registered Supabase Auth user.
- A manager cannot add an email that already belongs to another organization;
  the API returns a conflict instead of moving the employee.
- A manager can check "Cấp quyền quản lý" and the matched user can access
  manager routes through that user's private organization after membership is
  written.
- A logged-in user who already belongs to organization A cannot accept an invite
  link for organization B.
- Two promoted manager emails must not see the same default organization/team
  unless a future organization-switching UI explicitly joins them.
- Build passes with Node 20:
  `npx -y -p node@20 node node_modules/next/dist/bin/next build`.
