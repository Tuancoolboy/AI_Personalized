# SPEC: BE-07 — Supabase Employee Persistence

> Phase 1 · Supabase real mode · Source of truth for employee persistence work.

## Goal

Turn the existing employee demo flow into a real Supabase-backed flow while
preserving demo mode. When Supabase env vars are missing, the app must keep
using demo cookies and `localStorage`. When Supabase env vars exist, employee
data must persist to Supabase through user-scoped RLS.

This spec is required reading before any change involving Supabase auth,
clients, migrations, RLS policies, profiles, onboarding persistence,
module progress, quiz results, time logs, leads, or chat usage.

## Scope

### In scope for Phase 1

- Employee auth/session behavior already using Supabase Auth.
- Employee onboarding persistence:
  - selected role
  - assessment summary
  - daily task tags
  - AI level
- Employee learning progress persistence in `module_progress`.
- Employee quiz score persistence in `quiz_results`.
- Employee time-saved log persistence in `time_logs`.
- Landing lead persistence in `leads`.
- Chat usage table remains ready for later OpenAI rate-limit work.
- Demo mode fallback remains functional without Supabase env vars.

### Out of scope for this spec

- Manager dashboard data from Supabase.
- Employee invitation/admin flows.
- Organization/team/multi-tenant schema.
- OpenAI chat route implementation.
- Billing, seats, or Phase 2 HR workflows.

Manager dashboard and employee management stay demo/mock surfaces until a
Phase 2 spec explicitly promotes them.

## Data Model

Keep existing tables from `supabase/migrations/0001_init.sql`:

- `profiles`
- `module_progress`
- `quiz_results`
- `time_logs`
- `chat_usage`
- `leads`

Add migration `supabase/migrations/0003_employee_profile_assessment.sql`:

- `profiles.assessment_result jsonb`
- `profiles.daily_tasks text[]`
- `profiles.ai_level int check (ai_level between 0 and 5)`
- `profiles.updated_at timestamptz`
- insert policy for users to create their own profile if the auth trigger did
  not create it.

Add migration `supabase/migrations/0010_profile_phone_number.sql`:

- `profiles.phone_number text`
- auth trigger copies register metadata `phone_number` into the profile row.

RLS requirement: user-scoped rows remain readable/writable only by
`auth.uid()`. Service role keys must never be imported into client components.

## Runtime Behavior

### Demo mode

If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing:

- auth uses demo cookies
- employee data uses `localStorage`
- UI continues to show the demo banner
- no Supabase client call is required for employee persistence

### Supabase real mode

If Supabase env vars exist:

- onboarding writes the selected role and assessment summary to `profiles`
- learning path reads and upserts `module_progress`
- quiz inserts `quiz_results`
- progress page reads `profiles`, `module_progress`, `quiz_results`, and
  `time_logs`
- progress page inserts new `time_logs`
- all writes use the browser Supabase client with the logged-in user's session
  and RLS, not service role

If a real-mode Supabase operation fails, the UI should show or preserve a safe
state and log a concise client-side warning. Do not silently claim persistence
succeeded when Supabase rejected the write.

## Implementation Notes

- Prefer a small data access layer under `lib/supabase/` for employee profile,
  progress, quiz, and time log operations.
- Keep component-level UI changes minimal; this is a persistence task, not a
  redesign.
- Preserve Vietnamese UI copy and existing route paths.
- Do not expand manager routes beyond their current demo behavior.
- After any implementation task for this spec, update:
  - `specs/PROJECT-CONTINUATION.md`
  - `specs/notes/BE-07-implementation-notes.html`

## Acceptance Criteria

- Without Supabase env vars, employee demo flow still works:
  login -> onboarding -> lộ trình -> quiz -> tiến bộ.
- With Supabase env vars and migrations applied:
  register/login -> onboarding creates/updates `profiles` -> module completion
  writes `module_progress` -> quiz writes `quiz_results` -> time log writes
  `time_logs`.
- Reloading the app in real mode keeps the employee's role, AI level, module
  progress, quiz stats, and total hours saved.
- Manager dashboard remains mock/demo.
- Build passes with Node 20:
  `npx -y -p node@20 node node_modules/next/dist/bin/next build`.
