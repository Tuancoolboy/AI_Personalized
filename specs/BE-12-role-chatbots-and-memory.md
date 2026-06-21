# SPEC: BE-12 — Role-based Chatbots & Long-term Memory

> Phase 1 slice · Backend + Chat UI · 2026-06-10

## Mô tả

Tách chatbot thành 2 trợ lý riêng theo quyền **nhân viên** và **quản lý**, mỗi bên có system prompt, boundary và trí nhớ dài hạn riêng. Nhân viên được kèm cặp học AI theo tiến độ thật; quản lý được phân tích tiến độ team từ Supabase (lát cắt Phase 2 có chủ đích — dashboard `/quan-ly` vẫn mock).

## Phạm vi

### Nhân viên (`audience = employee`)

- System prompt: `Trợ lý AI (trợ lý riêng của {tên})` — giọng nhiệt tình, ân cần, như bạn kèm cặp.
- Inject vào prompt: `core_context` + tóm tắt tiến độ (`module_progress`, `quiz_results`, `time_logs`, `profiles`).
- Boundary: chỉ AI trong công việc, lộ trình, prompt, công cụ, an toàn dữ liệu.
- Lưu tin nhắn + tóm tắt core context sau hội thoại (throttle ≥5 phút hoặc ≥3 lượt).

### Quản lý (`audience = manager`)

- System prompt: `Trợ lý AI (trợ lý riêng của quản lý {tên})`.
- Inject: `core_context` + `teamSummary` đọc từ Supabase service role (profiles + progress + quiz + time logs), loại tài khoản manager theo email pattern.
- Boundary: phân tích học tập team + hướng dẫn app quản lý; từ chối câu ngoài lề.
- Không yêu cầu `role_id` / onboarding nhân viên.

### Demo mode

- Không lưu DB; canned responses như cũ.
- UI vẫn hiển thị tiêu đề theo quyền.

## Schema (`0012_chat_memory.sql`)

| Bảng | Mục đích |
|------|----------|
| `chat_conversations` | Phiên chat theo `user_id` + `audience` |
| `chat_messages` | Lịch sử tin nhắn user/assistant |
| `chat_memories` | Core context dài hạn (PK: user_id + audience) |

RLS: user chỉ đọc/ghi dữ liệu của mình.

## API

### POST `/api/chat`

Body:
```json
{
  "message": "string",
  "role_id": "kinh-doanh (optional, employee only)",
  "conversation_id": "uuid (optional)"
}
```

Headers response: `X-Conversation-Id`, `X-Chat-Mode`.

### GET `/api/chat/history`

Trả conversation gần nhất + `coreContext` + `messages[]`.

## Files chính

- `lib/openai.ts` — `buildEmployeeSystemPrompt`, `buildManagerSystemPrompt`
- `lib/chat-context.ts` — progress/team summary, memory refresh
- `app/api/chat/route.ts`, `app/api/chat/history/route.ts`
- `hooks/use-assistant-chat.ts`, `components/tro-ly-chat.tsx`, `components/floating-assistant-widget.tsx`

## Acceptance

- [ ] Nhân viên chat → prompt có tiến độ học; reload trang vẫn thấy lịch sử (Supabase mode).
- [ ] Quản lý chat không cần onboarding; hỏi "ai chậm tiến độ" → trả lời dựa dữ liệu thật.
- [ ] Câu ngoài lề → từ chối + gợi ý quay lại nhiệm vụ.
- [ ] UI hiển thị `Trợ lý AI (trợ lý riêng của ...)`.
- [ ] Rate-limit 30 lượt/ngày vẫn hoạt động.
- [ ] `npm run build` pass (Node 20+).

## Out of scope

- Thay mock dashboard `/quan-ly` bằng dữ liệu thật (ngoại trừ chatbot manager đọc Supabase).
- `profiles.user_type` column (vẫn dùng email pattern GĐ1).
