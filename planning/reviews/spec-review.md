# 🔍 Spec Review — Phase 1: AI Trợ Lý
> **Reviewer 1:** 🎯 PM Agent (Product Manager — góc nhìn sản phẩm, user story, PRD alignment)  
> **Reviewer 2:** 🔧 Senior Engineer Agent (góc nhìn technical feasibility, thiếu sót kỹ thuật, edge cases)  
> **Ngày review:** 08/06/2026  
> **Tài liệu gốc:** PRD v1.0, UI Flow wireframe, Decision & Plan doc

---

## Thang điểm

| Tiêu chí | Mô tả | Thang |
|----------|-------|-------|
| **Completeness** | Đủ thông tin để dev implement mà không cần hỏi lại | 1–10 |
| **Clarity** | Rõ ràng, không mơ hồ, không mâu thuẫn | 1–10 |
| **PRD Alignment** | Khớp với PRD + UI Flow + User Stories | 1–10 |
| **Feasibility** | Khả thi trong timeline 5 tuần với team nhỏ | 1–10 |
| **Actionability** | Checklist đủ chi tiết để track, có Definition of Done rõ | 1–10 |

---

## 📊 Score Card

### [PHASE1-SPEC.md](file:///Users/minhhai/workspace/ai/VinUni/Project/C2-App-009/specs/PHASE1-SPEC.md) — Master Spec

| Tiêu chí | PM | Senior | Avg |
|----------|:--:|:------:|:---:|
| Completeness | 7 | 6 | 6.5 |
| Clarity | 8 | 7 | 7.5 |
| PRD Alignment | 6 | 5 | 5.5 |
| Feasibility | 7 | 7 | 7.0 |
| Actionability | 8 | 7 | 7.5 |
| **Tổng** | **36/50** | **32/50** | **34/50** |

### [BE-01-auth.md](file:///Users/minhhai/workspace/ai/VinUni/Project/C2-App-009/specs/BE-01-auth.md)

| Tiêu chí | PM | Senior | Avg |
|----------|:--:|:------:|:---:|
| Completeness | 8 | 7 | 7.5 |
| Clarity | 9 | 8 | 8.5 |
| PRD Alignment | 7 | 7 | 7.0 |
| Feasibility | 9 | 9 | 9.0 |
| Actionability | 8 | 8 | 8.0 |
| **Tổng** | **41/50** | **39/50** | **40/50** |

### [BE-06-ai-tutor.md](file:///Users/minhhai/workspace/ai/VinUni/Project/C2-App-009/specs/BE-06-ai-tutor.md)

| Tiêu chí | PM | Senior | Avg |
|----------|:--:|:------:|:---:|
| Completeness | 8 | 7 | 7.5 |
| Clarity | 9 | 8 | 8.5 |
| PRD Alignment | 8 | 7 | 7.5 |
| Feasibility | 8 | 7 | 7.5 |
| Actionability | 8 | 8 | 8.0 |
| **Tổng** | **41/50** | **37/50** | **39/50** |

### [FE-03-onboarding.md](file:///Users/minhhai/workspace/ai/VinUni/Project/C2-App-009/specs/FE-03-onboarding.md)

| Tiêu chí | PM | Senior | Avg |
|----------|:--:|:------:|:---:|
| Completeness | 7 | 6 | 6.5 |
| Clarity | 9 | 8 | 8.5 |
| PRD Alignment | 6 | 6 | 6.0 |
| Feasibility | 9 | 9 | 9.0 |
| Actionability | 8 | 7 | 7.5 |
| **Tổng** | **39/50** | **36/50** | **37.5/50** |

---

## 🎯 PM Agent — Review chi tiết

### Vấn đề #1: **Thiếu User Story US-04 (Nhật ký "tiết kiệm giờ") trong flow chính**
> PRD mục 6.3 đặc tả rõ: nhật ký ứng dụng AI là tính năng P1. Nhưng trong PHASE1-SPEC, Journal API (BE-08) bị đẩy xuống Sprint 4 như P1 thay vì P0.

**Tác động:** Nhật ký là "bằng chứng tiến bộ" — PRD nhấn mạnh đây là dữ liệu quan trọng để pitch doanh nghiệp. Nếu Sprint 4 bị ép tiến độ, tính năng này sẽ bị cắt đầu tiên → mất luôn KPI "≥3 giờ/người/tuần tiết kiệm".

**Khuyến nghị:** Nâng BE-08 và FE-08 lên ít nhất Sprint 3, hoặc tích hợp Journal entry 1-tap vào ngay FE-05 (Lesson View) thay vì tách màn riêng.

---

### Vấn đề #2: **Thiếu US-06 (Công cụ AI gợi ý) — spec ghi P1–P2 nhưng PHASE1 không có task cụ thể**
> PRD ghi US-06 là P1–P2, UI Flow ghi "Công cụ AI gợi ý theo vai trò" là GĐ1–2. Starter Kit trong spec BE-03 có "danh sách công cụ" nhưng không có tính năng gợi ý riêng.

**Khuyến nghị:** Clarify rằng US-06 Phase 1 = Starter Kit nằm trong lộ trình (đã có), ghi rõ trong spec để team không confuse. Hoặc tạo task FE nhỏ "AI Tool Recommendation section" trong Lesson View.

---

### Vấn đề #3: **Landing Page spec quá mỏng**
> PRD đặt Landing Page là must-have ("chạy song song lúc phát triển — pre-launch"). Nhưng FE-01 spec chỉ có 3 dòng acceptance criteria. Không có: copy/messaging, social proof plan, CTA cụ thể, conversion tracking.

**Khuyến nghị:** Bổ sung: hero copy, value proposition rõ, testimonial placeholder, CTA dẫn sang `/register`, analytics tracking event (form submit).

---

### Vấn đề #4: **Thiếu mapping ngược từ User Story → Task ID**
> Team sẽ khó truy ngược "US-02 được cover bởi task nào?" vì master spec không có bảng traceability.

**Khuyến nghị:** Thêm bảng User Story ↔ Task mapping vào master spec.

---

### Vấn đề #5: **Thiếu KPI tracking trong spec**
> PRD mục 2 có 6 KPIs cụ thể (activation ≥80%, retention ≥40%, satisfaction ≥8/10...). Không có spec nào đề cập cách đo, event nào cần track, hoặc analytics plan.

**Khuyến nghị:** Thêm task BE/FE cho event tracking (ít nhất: onboarding complete, lesson complete, tutor used, quiz passed, journal logged).

---

### Vấn đề #6: **Onboarding spec thiếu "trình độ AI" trong BE contract**
> FE-03 ghi Step 2 là "trình độ AI hiện tại" nhưng BE-02 chỉ có field `role`, không có field `ai_level`. API contract `PUT /api/user/me/role` body cũng chỉ đề cập `role`.

**Khuyến nghị:** BE-02 cần thêm field `ai_level` vào schema. Hoặc quyết định rõ ràng: nếu Phase 1 skip trình độ thì FE-03 cũng bỏ Step 2.

---

## 🔧 Senior Engineer Agent — Review chi tiết

### Vấn đề #1: **BE-01 thiếu password validation rules**
> Spec ghi nhận `password` nhưng không đặt bất kỳ rule nào: min length? max length? complexity?

**Tác động:** Dev sẽ tự quyết định → mỗi người một kiểu → inconsistent UX.

**Khuyến nghị:** Định nghĩa rõ: min 8 chars, max 128. Phase 1 không cần complexity check (lowercase/uppercase/special char), nhưng ghi rõ quyết định đó.

---

### Vấn đề #2: **BE-01 users schema trộn lẫn auth + profile**
> Table `users` chứa cả `password_hash` (auth concern) và `role`, `onboarded_at` (profile concern). Đây là pattern đơn giản cho MVP nhưng nên ghi rõ đây là quyết định tradeoff.

**Khuyến nghị:** Ghi chú rõ: "Phase 1 dùng 1 bảng. Phase 2 nên tách `user_profiles` khi thêm field cho manager/HR." Không cần tách ngay.

---

### Vấn đề #3: **BE-06 rate-limit calculation sai**
> Spec ghi "20 requests/user/tháng = 120đ/user/tháng" nhưng rate limit đặt "20/user/**ngày**". Nếu user dùng 20/ngày × 30 ngày = 600 requests/tháng → chi phí = 600 × 6đ = 3.600đ/tháng. Vẫn dưới 22.000đ nhưng tính toán sai trong spec tạo confusion.

**Khuyến nghị:** Fix calculation: 20 requests/ngày × 30 ngày = 600 req/tháng. Chi phí thực: 600 × 6đ ≈ 3.600đ/user/tháng (vẫn OK, nhưng con số phải đúng).

---

### Vấn đề #4: **BE-06 conversation history — spec mâu thuẫn**
> Spec ghi "session-level, không cần persist qua session" nhưng request body không có `conversation_id` hoặc `messages[]` history. LLM call sẽ stateless hoàn toàn → mỗi câu hỏi riêng lẻ, không có context cuộc trò chuyện.

**Khuyến nghị:** Quyết định 1 trong 2:
- **Option A (đơn giản):** Mỗi request là stateless. FE giữ history, gửi kèm 3–5 tin gần nhất trong `messages[]` array.
- **Option B:** BE lưu session chat (in-memory / Redis). Request gửi `session_id`.
Cả 2 option đều OK nhưng phải chọn rõ và spec phải match.

---

### Vấn đề #5: **Tech stack chưa chốt — "hoặc" xuất hiện quá nhiều**
> Master spec ghi: "Next.js **hoặc** FastAPI", "NextAuth **hoặc** custom JWT", "PostgreSQL **hoặc** SQLite", "OpenAI **hoặc** Gemini". Mỗi "hoặc" = 1 quyết định dev phải tự ra → rủi ro chọn khác nhau → integration fail.

**Khuyến nghị:** **Chốt 1 stack** duy nhất trước khi Sprint 1 bắt đầu. Ghi decision vào spec, chuyển các option còn lại thành footnote "alternative đã cân nhắc".

---

### Vấn đề #6: **Quiz schema thiếu support retry**
> `quiz_results` lưu 1 record (user_id, module_id, score, submitted_at). Nếu user làm lại quiz, record mới sẽ overwrite hay append? FE-07 có nút "Làm lại" nhưng BE-07 không spec hành vi retry.

**Khuyến nghị:** Spec rõ: "Mỗi lần submit tạo mới. `GET /api/progress` lấy điểm cao nhất (max) để tính tiến độ. FE hiển thị best score."

---

### Vấn đề #7: **FE-03 component path dùng Next.js pages router nhưng gợi ý App Router**
> Spec gợi ý `pages/onboarding/index.tsx` (Pages Router). Nhưng master spec gợi ý Next.js 14 App Router → path nên là `app/onboarding/page.tsx`.

**Khuyến nghị:** Thống nhất: nếu dùng App Router thì tất cả FE spec phải dùng `app/` directory convention.

---

### Vấn đề #8: **Thiếu error format chuẩn**
> BE-01 dùng `{ "error": "EMAIL_EXISTS" }`, BE-06 dùng `{ "error": "RATE_LIMIT_EXCEEDED", "reset_at": "..." }`. Cần 1 chuẩn error response cho toàn app.

**Khuyến nghị:** Định nghĩa error format chung:
```json
{
  "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} }
}
```

---

### Vấn đề #9: **Master spec thiếu Database ER diagram**
> Có schema rải rác trong từng spec nhưng không có view tổng thể. Dev sẽ không biết các bảng liên kết thế nào.

**Khuyến nghị:** Thêm ER diagram (Mermaid) vào master spec.

---

## 📋 Tổng hợp Action Items

| # | Vấn đề | Severity | File cần sửa | Action |
|---|--------|----------|-------------|--------|
| 1 | US-04 Journal bị đẩy quá xa | 🔴 High | PHASE1-SPEC | Tích hợp Journal vào Sprint 3, hoặc embed 1-tap vào Lesson View |
| 2 | US-06 không rõ scope Phase 1 | 🟡 Medium | PHASE1-SPEC | Clarify: Starter Kit = US-06 Phase 1 |
| 3 | Landing page spec mỏng | 🟡 Medium | PHASE1-SPEC | Bổ sung copy, social proof, tracking |
| 4 | Thiếu US → Task mapping | 🟡 Medium | PHASE1-SPEC | Thêm bảng traceability |
| 5 | Thiếu KPI / analytics task | 🔴 High | PHASE1-SPEC | Thêm event tracking task |
| 6 | Onboarding `ai_level` thiếu ở BE | 🔴 High | PHASE1-SPEC, FE-03 | Sync BE-02 + FE-03 |
| 7 | Password validation rules thiếu | 🟡 Medium | BE-01 | Thêm min/max length |
| 8 | Schema single-table ghi chú tradeoff | 🟢 Low | BE-01 | Thêm note |
| 9 | Rate-limit cost calculation sai | 🔴 High | BE-06 | Fix math |
| 10 | Conversation history mâu thuẫn | 🔴 High | BE-06 | Chọn rõ stateless vs session |
| 11 | Tech stack chưa chốt | 🔴 High | PHASE1-SPEC | Chốt 1 stack duy nhất |
| 12 | Quiz retry behavior thiếu | 🟡 Medium | PHASE1-SPEC | Spec rõ hành vi |
| 13 | FE path convention mâu thuẫn | 🟡 Medium | FE-03 | Thống nhất App Router |
| 14 | Error format chưa chuẩn hoá | 🟡 Medium | PHASE1-SPEC | Thêm standard error format |
| 15 | Thiếu ER diagram | 🟡 Medium | PHASE1-SPEC | Thêm Mermaid diagram |

---

> [!TIP]
> Điểm tổng: **37.6/50** — Specs hiện tại ở mức **khá, nhưng chưa production-ready**. Các vấn đề 🔴 High cần fix trước khi team bắt đầu Sprint 1 để tránh rework.
