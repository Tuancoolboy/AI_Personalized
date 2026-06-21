# SPEC: BE-13 — Chat Dual Knowledge Base

> Phase 2 · Employee tutor · 2026-06-13

## Mục tiêu

Trợ lý AI chat nhân viên phải dựa trên **hai nền kiến thức tách bạch**:

1. **Nguồn 1 — Lộ trình & bài học:** module global/company đã thiết kế, trạng thái tiến độ, starter kit.
2. **Nguồn 2 — Hồ sơ cá nhân:** xưng hô (Anh/Chị/Không tiết lộ), assessment, việc hằng ngày, vướng mắc suy luận từ quiz/grading.

`chat_memories.core_context` chỉ là **trí nhớ hội thoại** (bổ sung), không thay hai nguồn trên.

## Schema

- `profiles.learning_profile jsonb` (migration `0022_learning_profile.sql`)
  - `preferredAddress`: `anh` | `chi` | `neutral`
  - `painPoints[]` (optional, future)
  - `notesFromUser` (optional, future)

## Onboarding

Bước 2/5: chọn Anh / Chị / Không tiết lộ (optional, default neutral).

## Files

| File | Vai trò |
|------|---------|
| `lib/chat-knowledge-curriculum.ts` | Build Nguồn 1 |
| `lib/chat-knowledge-personal.ts` | Build Nguồn 2 |
| `lib/learning-profile.ts` | Parse/validate profile |
| `lib/openai.ts` | System prompt 3 block |
| `app/api/chat/route.ts` | Wire employee chat |

## Quy tắc prompt

- Tutor **không bịa** module ngoài Nguồn 1.
- Xưng hô theo `preferredAddress` trong Nguồn 2.
- Company path từ `learning_assignments` khi có (0019).

## Acceptance

- [x] Onboarding lưu preferredAddress
- [x] Employee chat inject Nguồn 1 + 2 + trí nhớ
- [x] Vitest format + prompt structure
- [ ] Company module content từ `training_modules` (Phase 2.3)
- [ ] User chỉnh pain points trong settings (follow-up)

## Related

- BE-12 role chatbots
- P2-AI-07 tutor context expansion
