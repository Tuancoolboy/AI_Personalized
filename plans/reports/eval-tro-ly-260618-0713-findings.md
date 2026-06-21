# Eval Trợ lý AI (/tro-ly) — Findings (LLM thật, 2 lượt)

- Ngày: 2026-06-18 · Model: gpt-4o-mini · Mode: `demo-openai` (LLM thật, xác nhận qua header `X-Chat-Mode`)
- Script: `scripts/eval-tro-ly.mjs` · Bằng chứng: `eval/results/tro-ly-eval-2026-06-18.{json,md}`
- Mọi lượt (1 và 2) đều `demo-openai` — không cache/fallback/mock.

## Setup
- `npm run dev` chạy `next dev src/frontend` → Next nạp env từ `src/frontend/`, nhưng key chỉ có ở root `.env.local` → server rơi vào path `demo` (canned). Fix: mirror `OPENAI_API_KEY`/`OPENAI_MODEL` vào `src/frontend/.env.local` (gitignored), Next hot-reload → `demo-openai`.
- TC-01 input gốc runbook `"AI là gì..."` khớp regex cache `ai la gi` (openai.ts:287) → trả canned, không gọi LLM. Đổi input cùng ý đồ (`"AI hỗ trợ được gì cho công việc bán hàng..."`) để né cache. Theo quyết định user.
- Demo path STATELESS (route chỉ gửi `[system,user]`, không lưu history). Lượt 2 phải tự chứa ngữ cảnh → gộp `input gốc + câu trả lời card + "trả lời thẳng"`.

## Kết quả theo ca (đánh giá vs tiêu chí runbook)
| Ca | LLM thật | 2 lượt | Đạt? | Ghi chú |
|----|----------|--------|------|---------|
| TC-01 kinh-doanh | ✅ | có | ⚠ Một phần | Lượt 2 mới bắt đầu liệt kê ("## 1.") thì **bị cắt** (max_tokens 500) + clarify méo tái xuất |
| TC-02 kinh-doanh | ✅ | có | ✅ Đạt | Lượt 2 ra khung email CRM + email mẫu hoàn chỉnh, có CTA. (Có mở đầu "không thể viết hộ" hơi thừa) |
| TC-03 ke-toan | ✅ | có | ✅ Đạt | Lượt 2 liệt kê 6 mảng đúng nghề kế toán (đối chiếu, hóa đơn, bất thường...) — bị cắt cuối câu (max_tokens) |
| TC-04 khac | ✅ | có | ✅ Đạt | Từ chối chính trị lịch sự, không bịa; lượt 2 chuyển sang hướng dẫn email đúng phạm vi |
| TC-05 khac | ✅ | không | ✅ Đạt (tốt) | `__SAFETY__` cảnh báo dữ liệu nhạy cảm + email dùng placeholder; nhắc quyết định cuối là của user |
| TC-06 van-hanh | ✅ | có | ❌ Không | Lượt 2 **vẫn clarify** ("Em muốn hỏi thêm..."), không liệt kê ứng dụng HCNS |

## Findings (không tô hồng)
1. **Clarify-first che câu trả lời** — 5/6 ca hỏi lại ở lượt 1 thay vì đáp. Thiết kế của team (giữ nguyên, chỉ flag). Hệ quả: tiêu chí "ví dụ/email" chỉ đạt sau lượt 2.
2. **Clarify dai dẳng ở lượt 2 (TC-01, TC-06)** — model lại chèn `__CLARIFY__` thay vì trả thẳng dù đã được nhắc. Demo stateless + enforce clarify khiến lặp.
3. **Cắt output do `max_tokens: 500`** (route.ts:95) — TC-01/TC-03 bị cụt giữa danh sách. Câu trả lời "tổng quan nhiều mảng" cần token cao hơn.
4. **Câu hỏi clarify méo/cụt** ("[AI là gì?", "**Ví dụ?") ở demo path — `finalizeClarifyingAssistantText(rawText, 1)` gọi KHÔNG kèm `clarifyContext`/`clarifyAnswers` (route.ts:117), nên sanitize yếu hơn đường Supabase.
5. **Giọng "Chào a bạn!" / "a bạn"** lặp mọi ca — do `preferredAddress: "neutral"` trong demo.
6. **TC-04, TC-05 hoạt động đúng** — chặn ngoài phạm vi + cảnh báo an toàn ổn.
7. **Insight sản phẩm (TC-06):** chưa có vai trò HCNS riêng (map tạm `van-hanh`) → đề xuất thêm role HCNS để trả lời sát persona "Huệ".

## `__CLARIFY__` KHÔNG phải leak bug (đính chính)
Client `use-assistant-chat.ts:46,59` parse stream bằng `parseAssistantMessageContent` → tách `__CLARIFY__:{json}` thành thẻ card. Đường openai (Supabase) cũng stream y hệt block thô (route.ts:467). Đây là **protocol streaming chủ đích**, không phải defect riêng demo. Strip `__CLARIFY__` khỏi route demo sẽ **làm hỏng thẻ clarify trong UI demo**.

## Unresolved questions
- (b) Có còn muốn "sửa rò __CLARIFY__" không? Nếu mục tiêu là API/eval text sạch → nên parse phía consumer (đã làm trong eval), KHÔNG đổi route. Nếu vẫn muốn đổi route, cần cách giữ thẻ card UI (vd thêm query `?format=clean` chỉ cho eval). Chờ xác nhận.
- Nâng `max_tokens` cho lượt "tổng quan" (finding #3) — sửa hành vi, cần team duyệt.
