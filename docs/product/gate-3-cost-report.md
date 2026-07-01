# Gate 3 Cost Report — Estimated Cost / User / Month

> Updated: 25/06/2026 · Currency assumption: 1 USD = 26.000 VND

## Model pricing

Runtime model: `gpt-4o-mini`.

Official OpenAI model pricing checked on 25/06/2026:

- input: **$0.15 / 1M tokens**;
- cached input: **$0.075 / 1M tokens**;
- output: **$0.60 / 1M tokens**.

Source: https://developers.openai.com/api/docs/models/gpt-4o-mini

This report intentionally uses the normal input price, not the lower cached
input price, to stay conservative.

## Per-call assumptions

| Capability | Input tokens | Output tokens | Cost/call |
|---|---:|---:|---:|
| Tutor chat | 3.000 | 400 | $0.000690 |
| Practice grading | 1.500 | 900 | $0.000765 |
| Learning-path generation | 2.000 | 900 | $0.000840 |
| Aha reflection | 500 | 80 | $0.000123 |

Formula:

```text
cost = input_tokens × 0.15 / 1.000.000
     + output_tokens × 0.60 / 1.000.000
```

Tutor input is deliberately estimated above the old 500-token spec because the
current product can inject role, curriculum, personal progress, organization
context and recent conversation memory.

## Monthly scenarios

### Low usage

- 20 tutor calls
- 1 grading call
- 1 path generation
- 1 Aha reflection

Estimated: **$0.015528 = ~404đ/user/month**.

With 25% contingency: **~505đ/user/month**.

### Base usage

- 60 tutor calls — average 2/day
- 4 grading calls
- 1 path generation
- 4 Aha reflections

Estimated: **$0.045792 = ~1.191đ/user/month**.

With 25% contingency: **~1.488đ/user/month**.

### High usage / configured chat ceiling

- 900 tutor calls — 30/day × 30 days
- 8 grading calls
- 2 path generations
- 8 Aha reflections

Estimated: **$0.629784 = ~16.374đ/user/month**.

With 25% contingency: **~20.468đ/user/month**.

## Business guardrail

Internal AI cost ceiling: **~22.000đ/user/month**.

Under the assumptions above, even the maximum chat scenario remains under the
ceiling after adding 25% contingency. However, this is a model-only estimate.

Not included:

- Vercel paid plan or overages;
- Supabase paid plan/storage/egress;
- email delivery;
- observability tools;
- retries caused by provider/network failures;
- future use of more expensive models.

## Controls already implemented

- `gpt-4o-mini` default model;
- 30 chat calls/user/day limit;
- cache for common questions;
- bounded output tokens;
- deterministic fallback when OpenAI is unavailable;
- `chat_usage` persistence for authenticated usage;
- concise Aha generation;
- metadata-only path-agent input.

## Measurement gap and next step

Current streaming responses do not persist exact OpenAI input/output token
usage. After Gate 3:

1. enable streaming usage reporting where supported;
2. persist model, prompt tokens, completion tokens and estimated USD cost;
3. report average and P95 cost/request by capability;
4. alert at 70%, 85% and 100% of monthly organization budget.
