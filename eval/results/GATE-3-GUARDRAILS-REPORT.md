# Gate 3 Guardrails Report

> Verified: 25/06/2026

## Implemented controls

| Layer | Control | Evidence |
|---|---|---|
| Input | Reject empty or >4.000-char chat message | `app/api/chat/route.ts` |
| Privacy | Detect phone/account/password/ID-like content | `lib/safety.ts` |
| Privacy | Redact sensitive text before chat-memory summary | `lib/chat-prompt-safety.ts` |
| Prompt safety | Strip common instruction override patterns | `lib/chat-prompt-safety.ts` |
| Prompt safety | Strip fake `NGUỒN`, `TRÍ NHỚ`, `__CLARIFY__` headers | `lib/chat-prompt-safety.ts` |
| Context isolation | Wrap untrusted context and label it as data | `lib/chat-prompt-safety.ts` |
| Scope | Employee/manager system prompts define allowed topics | `lib/openai.ts` |
| Abuse/cost | Per-user daily chat limit | `lib/chat-rate-limit.ts` |
| Abuse | Lead and platform-admin rate limits | API route handlers |
| Access | Supabase session + RLS | Supabase clients/migrations |
| Privilege | Platform-admin server authorization | `/api/platform-admin` |
| Redirect | Reject unsafe external post-auth paths | `lib/post-auth-redirect.ts` |

## Automated verification

Command:

```bash
npx vitest run \
  src/frontend/lib/safety.test.ts \
  src/frontend/lib/chat-prompt-safety.test.ts \
  src/frontend/lib/google-oauth.test.ts \
  src/frontend/lib/post-auth-redirect.test.ts
```

Result: **4 test files, 23 tests passed**.

## Live production verification

```text
GET https://c2-app-009.vercel.app/api/platform-admin
HTTP 403
{"error":{"code":"FORBIDDEN", ...}}
```

## Eval evidence

- TC-04: out-of-scope political question refused.
- TC-05: sensitive bank-account-like input triggered `__SAFETY__`.

## Limitations

- Pattern-based PII detection is intentionally lightweight and may miss names,
  addresses or uncommon identifier formats.
- In-memory limits reset across serverless instances; persistent chat usage is
  used for authenticated users, while some auxiliary endpoints remain
  best-effort serverless limits.
- Guardrails reduce risk but do not replace human review for legal, HR,
  financial or high-impact decisions.
