# SPEC: BE-06 — AI Tutor API
> Phase 1 · Sprint 3 · Backend

## Mô tả
Wrapper gọi LLM (OpenAI / Gemini), inject system prompt theo role + ngữ cảnh bài học, có rate-limit per user/day để kiểm soát chi phí.

## System Prompt Template

```
Bạn là trợ lý AI gia sư, giúp nhân viên [ROLE_LABEL] hiểu và áp dụng AI vào công việc hằng ngày.
Hiện tại người dùng đang học module: "[MODULE_TITLE]".

Nguyên tắc trả lời:
- Trả lời bằng tiếng Việt, ngôn ngữ đời thường, thân thiện.
- Luôn dùng ví dụ cụ thể từ công việc [ROLE_LABEL] (không nói chung chung).
- Chỉ trả lời câu hỏi liên quan AI và ứng dụng AI trong công việc.
- Nếu câu hỏi ngoài phạm vi → lịch sự từ chối và gợi ý người dùng hỏi đúng chủ đề.
- Nhắc người dùng KHÔNG đưa dữ liệu cá nhân, hợp đồng, thông tin mật lên công cụ AI công cộng khi câu trả lời liên quan đến dữ liệu nhạy cảm.
- Không bịa thông tin, không tự xưng là chuyên gia pháp lý/tài chính.
```

**Role label mapping:**
```
sales        → "Kinh doanh / Sales"
accounting   → "Kế toán"
marketing    → "Marketing"
operations   → "Vận hành"
other        → "nhân viên văn phòng"
```

## API Endpoint

### POST /api/tutor/chat
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "message": "AI là gì vậy?",
  "context_module_id": "module_uuid_optional"
}
```

**Response 200:**
```json
{
  "reply": "AI (Trí tuệ nhân tạo) là...",
  "usage": { "prompt_tokens": 150, "completion_tokens": 200 }
}
```

**Errors:**
- `429` — Rate limit: `{ "error": "RATE_LIMIT_EXCEEDED", "reset_at": "2026-06-09T00:00:00Z" }`
- `401` — Chưa login
- `400` — Message rỗng

## Rate Limit Logic

```
MAX_REQUESTS_PER_DAY = 20  (configurable qua env TUTOR_DAILY_LIMIT)
Reset: mỗi ngày UTC 00:00

Storage: Redis hoặc DB table user_tutor_usage (user_id, date, count)
```

## Task Checklist

### Setup
- [ ] Cài `openai` SDK hoặc `@google/generative-ai`
- [ ] Add `OPENAI_API_KEY` (hoặc `GEMINI_API_KEY`) vào `.env`
- [ ] Add `TUTOR_DAILY_LIMIT=20` vào `.env`
- [ ] Tạo bảng `user_tutor_usage` (user_id, date, count) — hoặc dùng Redis

### Code — Core
- [ ] Hàm `buildSystemPrompt(role, moduleTitle?)` → trả string prompt
- [ ] Hàm `checkRateLimit(userId)` → trả `{ allowed: bool, remaining: int, reset_at }`
- [ ] Hàm `incrementUsage(userId)`
- [ ] `POST /api/tutor/chat` handler:
  - [ ] Verify auth
  - [ ] Check rate limit → 429 nếu exceeded
  - [ ] Lấy role từ user profile
  - [ ] Nếu có `context_module_id` → fetch module title
  - [ ] Build system prompt
  - [ ] Gọi LLM API
  - [ ] Increment usage counter
  - [ ] Trả reply

### Code — Optional (nâng chất lượng)
- [ ] Streaming response (Server-Sent Events)
- [ ] Cache simple: nếu message giống hệt → trả cached (hash message + role)
- [ ] Lưu conversation history trong session (context 3-5 tin gần nhất)

### Test thủ công
- [ ] Login với role `sales`, hỏi "AI là gì?" → reply có ví dụ sales
- [ ] Login với role `accounting`, hỏi cùng câu → reply khác, ví dụ kế toán
- [ ] Hỏi câu ngoài phạm vi (ví dụ: "Hôm nay thời tiết thế nào?") → từ chối lịch sự
- [ ] Gửi đủ N request trong ngày → lần N+1 → 429 với `reset_at`
- [ ] Gọi không có token → 401
- [ ] Message rỗng → 400

### Cost Control
- [ ] Verify `OPENAI_API_KEY` không hardcode trong source code
- [ ] Log usage per request để monitor
- [ ] Đặt max_tokens = 500 (đủ cho 1 câu trả lời, tiết kiệm token)

## Chi phí ước tính
```
Model: GPT-4o-mini
Input: ~500 tokens (system prompt + history) × $0.15/1M = $0.000075/request
Output: ~300 tokens × $0.60/1M = $0.00018/request
Total/request: ~$0.00025 ≈ 6đ/request

20 requests/user/tháng = 120đ/user/tháng ✅ (dưới ngưỡng 22.000đ)
```

## Dependencies
- Blocked by: BE-02 (cần user role)
- Blocked by: BE-05 (cần module title nếu có context)

## Owner
- BE dev (assign khi planning sprint)

## Definition of Done
- [ ] API chạy được trên dev
- [ ] Rate limit hoạt động đúng
- [ ] API key không lộ ra client/log
- [ ] Test với ít nhất 2 role khác nhau
