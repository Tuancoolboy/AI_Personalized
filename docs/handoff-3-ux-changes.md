# Bàn giao — 3 thay đổi UX sau review sản phẩm

> Người chốt: Lucas/Annie. Người code: Claude Code.
> Nhánh: tạo từ develop hoặc từ feature/phase2-mentor-features nếu đã merge.
> Tuân thủ: UI tiếng Việt, không phá Phase 1, demo localStorage fallback.
> ⚠ Đã rà soát đối chiếu code thật — các chỗ sửa được đánh dấu **[SỬA THEO REVIEW]**.

---

## 1. Nâng cấp chấm điểm: thêm ô paste text đáp án + chấm bằng rubric

### Hiện tại
- Chỉ nộp screenshot (tối đa 5 ảnh) → AI chấm từ ảnh → đạt khi >= `PRACTICE_PASS_SCORE` (hiện = 60).
- **[SỬA THEO REVIEW]** Trong màn bài học 5 bước hiện tại, phần chấm điểm nằm ở **Bước 2** (không phải Bước 3). Đối chiếu component trước khi sửa.
- **[SỬA THEO REVIEW]** Dùng hằng số `PRACTICE_PASS_SCORE` (từ `lib/practice-grader.ts`), KHÔNG hardcode "60" rải rác.

### Thay đổi
- Thêm **ô textarea "Paste kết quả AI trả về"** phía trên phần upload ảnh.
- Textarea có nút "Paste" + placeholder "Dán toàn bộ câu trả lời từ AI vào đây..."
- Textarea không bắt buộc (có thể chỉ nộp ảnh như cũ), nhưng hiện gợi ý: "Paste text giúp chấm chính xác hơn"
- Screenshot giữ nguyên vai trò **bằng chứng bổ sung**.

### Cách chấm mới
- Mỗi module trong `lib/learning-modules-data.ts` thêm field `rubric`:
```ts
rubric: [
  { criteria: "Đúng format văn bản hành chính", maxPoints: 15 },
  { criteria: "Đủ thông tin bắt buộc (tên, ngày, số hiệu)", maxPoints: 20 },
  { criteria: "Nội dung chính xác theo yêu cầu đề bài", maxPoints: 25 },
  { criteria: "Ngôn ngữ phù hợp, chuyên nghiệp", maxPoints: 15 },
  { criteria: "Có sử dụng file mẫu đính kèm đúng cách", maxPoints: 15 },
  { criteria: "Kết quả có thể dùng được ngay", maxPoints: 10 }
]
// Tổng: 100 điểm, đạt >= 60
```
- Khi chấm: gửi text đáp án + rubric với system prompt:
  "Bạn là giảng viên chấm bài thực hành AI. Chấm theo rubric sau, cho điểm từng tiêu chí, giải thích ngắn. Trả về JSON: { scores: [{criteria, points, comment}], total, passed }"
- **[SỬA THEO REVIEW] KHÔNG gửi qua `/api/chat`** — route đó đang giới hạn 30 lượt/ngày dùng chung với Trợ lý AI, chấm bài sẽ ăn vào quota chat của học viên. **Mở rộng route đã có `app/api/practice-review/route.ts`** để nhận thêm text (route này không vướng rate-limit chat).
- Nếu chỉ nộp ảnh (không paste text): chấm từ ảnh như cũ.
- **[SỬA THEO REVIEW] Khi nộp cả text lẫn ảnh:** gửi cả hai cho model, ưu tiên text làm căn cứ chính, ảnh là bằng chứng bổ sung.
- Hiển thị kết quả: bảng điểm từng tiêu chí + nhận xét + tổng điểm + ĐẠT/CHƯA ĐẠT.

### Chạm file
- `components/module-lesson-content.tsx` — **[SỬA THEO REVIEW]** phần **Bước 2** (chấm điểm thực hành), không phải Bước 3
- `lib/learning-modules-data.ts` — thêm rubric cho mỗi module
- **[SỬA THEO REVIEW]** Mở rộng `app/api/practice-review/route.ts` (KHÔNG dùng `/api/chat`)
- Demo mode: chấm bằng logic đơn giản — **[SỬA THEO REVIEW] random 40–95** (không phải 65–95) để demo được cả luồng ĐẠT lẫn CHƯA ĐẠT (xem 6.2)

---

## 2. Giữ + nâng cấp Prompt mẫu copy-dùng-ngay

### Hiện tại
- Bộ khởi đầu nhanh có prompt mẫu — GIỮ NGUYÊN, đây là IP cốt lõi.

### Thay đổi
- Prompt mẫu hiển thị **tên công cụ AI theo lựa chọn công ty** (xem mục 3).
- Ví dụ: nếu công ty chọn Claude → "Mở Claude → paste prompt này"
          nếu công ty chọn ChatGPT → "Mở ChatGPT → paste prompt này"
- Thêm note nhỏ dưới prompt: "Prompt này hoạt động tốt với mọi công cụ AI. Kết quả tốt nhất khi dùng [tool đã chọn]."
- Nút copy giữ nguyên.

### Chạm file
- `components/module-lesson-content.tsx` — phần hiển thị prompt mẫu
- Đọc `ai_tool` từ context organization (hoặc localStorage demo) để render tên tool động

---

## 3. Công cụ AI: Tool chính (công ty chọn) + Tool chuyên dụng (theo bài học)

### Triết lý
- **Tool chính** (1 tool, quản lý chọn khi setup): dùng cho text/phân tích/soạn thảo — áp TẤT CẢ phòng ban
- **Tool chuyên dụng** (hệ thống gắn sẵn theo bài): bài nào cần tạo ảnh/video/design → tự hiện tool phù hợp
- **Nhân viên không cần chọn gì** — mở bài, thấy đúng tool + hướng dẫn, làm theo
- **[SỬA THEO REVIEW] Thông điệp phải nhất quán:** app vừa hướng dẫn dùng tool ngoài (Claude/ChatGPT…) vừa có Trợ lý AI tích hợp sẵn. Làm rõ với học viên: app là nơi **học cách dùng tool ngoài**, còn Trợ lý AI trong app là **gia sư hỏi đáp** — tránh để học viên bối rối giữa hai thứ.

### Ví dụ thực tế
- Bài "Soạn quyết định nhân sự" → dùng tool chính (Claude)
- Bài "Viết caption fanpage" → dùng tool chính (Claude)
- Bài "Tạo ảnh banner bằng AI" → tool chuyên dụng: ChatGPT (có DALL-E tạo ảnh)
- Bài "Tạo video giới thiệu sản phẩm" → tool chuyên dụng: Runway
- Bài "Thiết kế slide thuyết trình" → tool chuyên dụng: Canva AI

### Database
```sql
ALTER TABLE organizations ADD COLUMN ai_tool text DEFAULT 'claude'
  CHECK (ai_tool IN ('claude', 'chatgpt', 'gemini', 'copilot'));
```
Demo mode: `localStorage.setItem('org_ai_tool', 'claude')`.

> **[SỬA THEO REVIEW]** Cần tạo sẵn các file icon SVG trong `public/images/tools/`
> (`claude.svg`, `chatgpt.svg`, `gemini.svg`, `copilot.svg`, `canva.svg`, `runway.svg`),
> nếu không các đường dẫn `icon` bên dưới sẽ vỡ ảnh.

### Config tools (tạo file `lib/ai-tools-config.ts`)
```ts
export const AI_TOOLS = {
  // === TOOL CHÍNH (công ty chọn 1) ===
  claude: {
    name: 'Claude',
    provider: 'Anthropic',
    url: 'https://claude.ai',
    icon: '/images/tools/claude.svg',
    signupGuide: 'Truy cập claude.ai → Đăng ký bằng email hoặc Google → Bắt đầu dùng miễn phí',
    recommended: true,
    category: 'primary',
    pros: ['Trả lời chính xác nhất cho văn bản tiếng Việt', 'Hiểu context dài', 'Miễn phí cơ bản'],
    note: 'Được khuyên dùng — prompt trong khóa học được tối ưu cho Claude'
  },
  chatgpt: {
    name: 'ChatGPT',
    provider: 'OpenAI',
    url: 'https://chat.openai.com',
    icon: '/images/tools/chatgpt.svg',
    signupGuide: 'Truy cập chat.openai.com → Đăng ký → Dùng GPT-4o miễn phí',
    recommended: false,
    category: 'primary',
    pros: ['Phổ biến nhất', 'Tạo được ảnh (DALL-E)', 'Có app mobile'],
    note: null
  },
  gemini: {
    name: 'Gemini',
    provider: 'Google',
    url: 'https://gemini.google.com',
    icon: '/images/tools/gemini.svg',
    signupGuide: 'Truy cập gemini.google.com → Đăng nhập bằng tài khoản Google',
    recommended: false,
    category: 'primary',
    pros: ['Tích hợp Google Workspace', 'Miễn phí với tài khoản Google'],
    note: null
  },
  copilot: {
    name: 'Copilot',
    provider: 'Microsoft',
    url: 'https://copilot.microsoft.com',
    icon: '/images/tools/copilot.svg',
    signupGuide: 'Truy cập copilot.microsoft.com → Đăng nhập bằng tài khoản Microsoft',
    recommended: false,
    category: 'primary',
    pros: ['Tích hợp Microsoft 365', 'Có sẵn trong Edge/Windows'],
    note: null
  },

  // === TOOL CHUYÊN DỤNG (gắn theo bài học) ===
  'chatgpt-image': {
    name: 'ChatGPT (tạo ảnh)',
    provider: 'OpenAI',
    url: 'https://chat.openai.com',
    icon: '/images/tools/chatgpt.svg',
    signupGuide: 'Dùng ChatGPT → gõ "tạo ảnh..." → DALL-E tự tạo',
    recommended: false,
    category: 'specialist',
    capability: 'image',
    pros: ['Tạo ảnh từ mô tả text', 'Chỉnh sửa ảnh bằng lời'],
    note: 'Công cụ tối ưu cho bài học cần tạo ảnh'
  },
  'canva-ai': {
    name: 'Canva AI',
    provider: 'Canva',
    url: 'https://canva.com',
    icon: '/images/tools/canva.svg',
    signupGuide: 'Truy cập canva.com → Đăng ký miễn phí → Dùng Magic Design',
    recommended: false,
    category: 'specialist',
    capability: 'design',
    pros: ['Thiết kế slide, poster, banner', 'Template sẵn', 'Miễn phí cơ bản'],
    note: 'Dùng cho bài học cần thiết kế — tạo slide, poster, banner'
  },
  'runway': {
    name: 'Runway',
    provider: 'Runway',
    url: 'https://runwayml.com',
    icon: '/images/tools/runway.svg',
    signupGuide: 'Truy cập runwayml.com → Đăng ký → Dùng Gen-3 tạo video',
    recommended: false,
    category: 'specialist',
    capability: 'video',
    pros: ['Tạo video từ text/ảnh', 'Chỉnh sửa video bằng AI'],
    note: 'Dùng cho bài học cần tạo video ngắn'
  }
}
```

### Module gắn tool chuyên dụng
```ts
// lib/learning-modules-data.ts — mỗi module thêm field tool
{
  id: 'tao-anh-banner',
  title: 'Tạo ảnh banner bằng AI',
  tool: 'chatgpt-image',                    // override tool chính
  toolReason: 'Bài này cần tạo ảnh — dùng ChatGPT có DALL-E tích hợp sẵn',
  // ...
}

{
  id: 'viet-quyet-dinh',
  title: 'Soạn quyết định nhân sự',
  tool: null,                                // null = dùng tool chính công ty đã chọn
  // ...
}
```
> **[SỬA THEO REVIEW]** Field `tool` thêm vào data tĩnh thôi chưa đủ cho real mode:
> bảng `learning_modules` (migration 0004) không có cột này nên `fetchModule` từ DB sẽ
> trả về thiếu `tool` → mất tool chuyên dụng. **Thêm cột `tool text` (nullable) vào
> `learning_modules`** bằng migration mới nếu muốn chạy thật, không chỉ demo.

### Logic hiển thị trong bài học
```ts
// lib/ai-tool-helper.ts
export function getToolForModule(module, orgAiTool: string): AiToolConfig {
  if (module.tool) {
    // Bài này cần tool chuyên dụng → hiện tool đó + giải thích tại sao
    return { ...AI_TOOLS[module.tool], reason: module.toolReason }
  }
  // Dùng tool chính công ty đã chọn
  return AI_TOOLS[orgAiTool] || AI_TOOLS.claude
}
```

### UI chọn tool chính — trang setup công ty
- Route: `/quan-ly/cai-dat` hoặc trong flow onboarding công ty
- Hiển thị 4 card (chỉ category='primary'), mỗi card: icon + tên + pros
- Claude có badge "Khuyên dùng" (highlight border)
- Chọn 1 → lưu organizations.ai_tool
- Có thể đổi sau trong cài đặt
- **[SỬA THEO REVIEW]** Trang này chỉ cho **quản lý** (manager/owner) truy cập — chặn nhân viên thường đổi tool của cả công ty (kiểm tra quyền ở cả route lẫn UI).

### UI trong bài học (dynamic)
**Khi tool = tool chính:**
- "Mở [Claude] → Paste prompt bên dưới → Xem kết quả"
- Note: "Prompt tối ưu cho [Claude]"

**Khi tool = tool chuyên dụng:**
- Banner nhỏ: "⚡ Bài này dùng [ChatGPT tạo ảnh] — [lý do]"
- Hướng dẫn riêng cho tool đó
- Note: "Đây là công cụ chuyên dụng cho bài này, khác với tool chính của công ty bạn"

### Chạm file
- Tạo mới: `lib/ai-tools-config.ts`, `lib/ai-tool-helper.ts`
- Sửa: `components/module-lesson-content.tsx` (thay hardcode → dynamic theo getToolForModule)
- Sửa: `lib/learning-modules-data.ts` (thêm field tool + toolReason cho module cần)
- Tạo: `/quan-ly/cai-dat/page.tsx` (UI chọn tool chính)
- Migration: thêm cột `ai_tool` vào `organizations` + **[SỬA THEO REVIEW]** cột `tool` vào `learning_modules`

---

## 4. Ưu tiên triển khai
1. **Mục 3 trước** (chọn tool) — vì mục 1 và 2 phụ thuộc vào tool đã chọn
2. **Mục 2** (prompt mẫu dynamic) — nhanh, chỉ đổi render
3. **Mục 1** (chấm rubric) — phức tạp nhất, cần viết rubric cho mỗi module

## 5. Anti-conflict
- Nhánh từ develop (hoặc từ feature/phase2 nếu đã merge)
- Commit chọn lọc, KHÔNG git add .
- Build check: `npx next build` exit 0
- **[SỬA THEO REVIEW] Cảnh báo trùng file với handoff Phase 2:** file này sửa
  `components/module-lesson-content.tsx` và `lib/learning-modules-data.ts` — đúng 2 file mà
  handoff Phase 2 cũng đụng. **Làm tuần tự trên cùng 1 nhánh**, KHÔNG chạy song song (worktree)
  trên 2 file này để tránh xung đột.

---

## 6. Lưu ý kỹ thuật BẮT BUỘC (bổ sung sau review — không được bỏ sót)

Các điểm dưới đây là nơi spec dễ vỡ nhất khi chạy thật. Phải xử lý đủ trước khi báo "done".

### 6.1. Parse JSON từ AI không được giả định luôn đúng
- Model có thể trả JSON lỗi, kèm text thừa, hoặc bọc trong ```json ... ```.
- Bắt buộc:
  - Nếu dùng OpenAI: set `response_format: { type: 'json_object' }`.
  - Bọc `JSON.parse` trong try/catch. Khi parse fail → KHÔNG crash, trả về trạng thái "Chấm tự động thất bại, vui lòng thử lại / chấm thủ công" và log payload gốc để debug.
  - Strip ```json fences trước khi parse (phòng model vẫn bọc code block).
- Validate sau khi parse: `total` là số 0–100, `scores` là mảng, mỗi `points <= maxPoints` của tiêu chí tương ứng. Lệch thì clamp lại, không tin tuyệt đối output của model.

### 6.2. Demo mode phải test được cả 2 nhánh ĐẠT / CHƯA ĐẠT
- Random 65–95 luôn ≥ 60 → vĩnh viễn ĐẠT, không demo được màn "CHƯA ĐẠT".
- Đổi range demo thành **40–95** để cả hai luồng UI đều hiển thị được.

### 6.3. Module KHÔNG có rubric phải có fallback
- Rubric sẽ được thêm dần, không phải module nào cũng có ngay.
- Logic chấm: `if (module.rubric)` → chấm theo rubric; `else` → quay về chấm tự do như Phase 1. Tuyệt đối không để thiếu rubric gây lỗi runtime.

### 6.4. Một nguồn sự thật duy nhất cho `ai_tool`
- `getToolForModule` đọc `orgAiTool` từ DB *hoặc* localStorage → dễ lệch giữa 2 nơi.
- Tạo 1 helper duy nhất, ví dụ `getOrgAiTool()`: đã đăng nhập → đọc `organizations.ai_tool` từ DB; demo/chưa đăng nhập → đọc `localStorage('org_ai_tool')`; cả hai fail → mặc định `'claude'`. Mọi nơi (mục 1, 2, 3) chỉ gọi qua helper này.

### 6.5. Câu chữ tool chuyên dụng không được khẳng định sai
- KHÔNG ghi "tool chính không hỗ trợ tạo ảnh" — vì nếu công ty chọn Gemini/Copilot thì 2 tool này tạo được ảnh, note sẽ mâu thuẫn.
- Dùng câu trung tính: "Công cụ tối ưu cho bài này" / "Bài này dùng [tool] để có kết quả tốt nhất". (Đã sửa sẵn field `note` của `chatgpt-image` ở mục 3.)

### 6.6. Chi phí & bảo mật khi chấm
- Mỗi lần chấm gửi cả rubric + toàn bộ text đáp án lên API → cân nhắc giới hạn độ dài text (cắt/đếm token) để tránh chi phí phình to với bài dài.
- Không log nội dung đáp án nhạy cảm của học viên ra console ở production.
