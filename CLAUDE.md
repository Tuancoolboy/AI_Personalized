# CLAUDE.md — AI Trợ Lý (Giai đoạn 1)

> File hướng dẫn cho Claude Code khi build dự án này. Đọc kỹ trước khi viết bất kỳ dòng code nào.
> **Nguyên tắc vàng:** mặc định chỉ build phạm vi Giai đoạn 1. Chỉ triển khai
> Giai đoạn 2 khi user yêu cầu rõ; khi đó bắt buộc đọc và làm theo
> `specs/PHASE2-SPEC.md` cùng spec BE liên quan. Giai đoạn 3 vẫn không code
> nếu chưa có spec và phê duyệt riêng.

> **Quy trình agent (bắt buộc):** mọi feature mới phải tuân theo `.agents/rules/agent-workflow.md` — checkout/pull `develop`, nhánh `{type}/{noi-dung}`, chạy lint+test+build, cập nhật `WORKLOG.md` + `PROJECT-CONTINUATION.md`. **Trước khi báo xong:** đọc `.agents/rules/task-completion-checklist.md`. Áp dụng cho mọi AI tool (Cursor, Codex, Gemini, v.v.), không chỉ Claude Code.

---

## 0. Bối cảnh & trạng thái dự án

### Vấn đề đang giải
Nhân viên SME (kinh doanh, kế toán, marketing, vận hành) muốn dùng AI nhưng **không biết AI làm được gì, dùng sao cho đúng, tránh rủi ro gì**. Cách hiện tại — đào tạo tập trung — có 3 điểm đau:
1. **Đắt:** 2–5 triệu đ/người/lần.
2. **Chung chung:** không sát vị trí → học xong không áp dụng được.
3. **Không đo được & không bền:** nhân viên mới phải đào tạo lại từ đầu.

### Một câu định vị
> Giúp **mọi nhân viên tự dùng được AI vào đúng công việc của mình ngay trong tuần đầu** — bằng lộ trình cá nhân hóa theo vai trò + trợ lý AI giải thích bằng ví dụ thực tế — thay cho khóa đào tạo tập trung đắt đỏ, chung chung, không đo được.

### Trạng thái hiện tại
- ✔ Đã có **prototype 8 màn hình** (đã nối LLM thật) — tham khảo, KHÔNG dùng lại code.
- ✔ Đã **phỏng vấn khách hàng** và xác nhận hướng đi.
- ✔ Đã có **Business Model Canvas + unit economics**.
- ✔ **Next.js 14+ + Tailwind + TypeScript đã init** (App Router, không dùng src/).
- ◻ Bước tiếp: build Landing page + Setup Supabase + Auth (tuần 1).

---

## 1. Dự án là gì

**AI Trợ Lý** — web app giúp nhân viên SME Việt Nam (doanh nghiệp 10–200 người) tự học và áp dụng AI vào *đúng công việc của họ* ngay trong tuần đầu.

Ba trụ cột Giai đoạn 1:
1. **Lộ trình AI cá nhân hóa theo vai trò** — template rule-based, KHÔNG dùng AI Agent.
2. **Trợ lý AI gia sư** — chat hỏi đáp, trả lời bằng ví dụ từ đúng nghề người học.
3. **Bằng chứng tiến bộ** — bài kiểm tra tình huống + nhật ký "tiết kiệm bao nhiêu giờ".

Đối tượng dùng GĐ1: **nhân viên cá nhân** (persona P1). Quản lý/HR/chủ DN (P2/P3) là GĐ2–3 — **không build dashboard quản lý ở GĐ1**.

---

## 2. Personas (để hiểu vì sao thiết kế như vậy)

| Mã | Persona | Vai trò trong quyết định mua | Nỗi đau chính | GĐ phục vụ |
|---|---|---|---|---|
| **P1** | Nhân viên (kinh doanh, kế toán, marketing, vận hành) | Trải nghiệm → giới thiệu lên công ty | Muốn dùng AI nhưng không biết bắt đầu; sợ bị AI thay thế | **GĐ1** |
| **P2** | HR / Trưởng phòng | Tìm, đánh giá, đề xuất công cụ đào tạo | Cần công cụ đo được hiệu quả | GĐ2 |
| **P3** | Chủ doanh nghiệp | Quyết định mua & áp dụng | Cần tăng năng suất + **đo được** sự cải thiện | GĐ2 |

**Chiến lược bottom-up:** P1 dùng trước (gói cá nhân) → thấy hiệu quả → giới thiệu cho P2/P3 mua cho cả phòng.

**Định khung lại nỗi sợ AI:** làm chủ AI = có ưu thế; không dùng mới dễ bị đào thải.

---

## 3. Mô hình doanh thu (context cho design quyết định)

| Gói | Giá | Phục vụ ở GĐ |
|---|---|---|
| Cá nhân (B2C) | 300.000đ/người/tháng | GĐ1 (dùng thử + thu lead) |
| Doanh nghiệp | 1.000.000đ/tháng nền (10 ghế) + 300.000đ/ghế thêm | GĐ2 |
| VIP / Tự động hóa (đọc hóa đơn…) | Tính riêng | GĐ3 |

> **Lý do giữ chi phí AI ≤ ~22.000đ/người/tháng:** biên gộp trên ghế nền 100.000đ (sau khi chia 1.000.000đ cho 10 ghế) phải đủ trang trải.

---

## 4. Tech stack (đã chốt — không tự đổi)

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Next.js 16.2.7 (App Router)** | TypeScript, React 19, RSC nơi hợp lý. ⚠ Next 16 có breaking changes — đọc `AGENTS.md` + `node_modules/next/dist/docs/` trước khi code Next API mới |
| UI | **Tailwind CSS v4 + shadcn/ui** | Tailwind v4 dùng `@tailwindcss/postcss`, KHÔNG có `tailwind.config.js` như v3 |
| Backend / DB | **Supabase** (Postgres + Auth + RLS) | Auth dùng Supabase Auth (email/password) |
| LLM (Trợ lý AI) | **OpenAI GPT** (`gpt-4o-mini` cho rẻ) | Gọi qua API route phía server, KHÔNG để key lộ ra client |
| Deploy | **Vercel** | Env vars cấu hình trên Vercel dashboard |
| Ngôn ngữ giao diện | **Tiếng Việt** | Toàn bộ UI, nội dung, system prompt đều tiếng Việt |

**Quy tắc bảo mật bắt buộc:**
- Mọi lời gọi OpenAI đi qua Next.js API route (`/app/api/...`), client KHÔNG bao giờ thấy `OPENAI_API_KEY`.
- Bật **Row Level Security (RLS)** trên mọi bảng Supabase. User chỉ đọc/ghi được dữ liệu của chính mình.
- Không log nội dung chat nhạy cảm.
- Trợ lý AI phải **nhắc an toàn dữ liệu** khi user có dấu hiệu paste thông tin mật/khách hàng.

---

## 5. Cấu trúc thư mục đề xuất

```
/
├── AGENTS.md              # Quy tắc cho AI agent
├── README.md
├── WORKLOG.md · JOURNAL.md
├── specs/                 # Product & API specs
├── adrs/                  # Architecture decision records
├── planning/              # Backlog, decisions, demo, reviews, sprint plans
├── tasks/                 # Task summaries (mirror sprint plans)
├── docs/                  # Long-term reference docs only
│   ├── ops/               # Setup, deploy, Supabase, OAuth
│   ├── product/           # User journey, product context
│   ├── handoffs/          # Handoff / bàn giao
│   ├── archive/           # Archived imported docs
│   └── guide/             # Guidebook / references
├── src/
│   ├── frontend/          # Next.js — app, components, lib, hooks, public
│   └── backend/           # FastAPI + LangGraph — agents/, api/, ...
├── scripts/               # Tooling & test runners
├── supabase/
```

Quy tắc tạo file mới: xem `.agents/rules/project-structure.md`.

---

## 6. Mô hình dữ liệu (Supabase)

Lưu schema ở `/supabase/migrations/0001_init.sql`. Push bằng Supabase CLI hoặc paste vào SQL Editor. Tất cả bảng bật RLS.

```sql
-- Hồ sơ người dùng (mở rộng từ auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role_id text check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac')),
  created_at timestamptz default now()
);

create table module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  module_id text not null,
  status text check (status in ('chua-hoc','dang-hoc','hoan-thanh')) not null,
  completed_at timestamptz,
  unique(user_id, module_id)
);

create table quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  role_id text not null,
  module_id text,
  score int check (score between 0 and 100) not null,
  passed boolean generated always as (score >= 70) stored,
  created_at timestamptz default now()
);

create table time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  hours_saved numeric(4,2) check (hours_saved > 0) not null,
  usefulness int check (usefulness between 1 and 10),
  note text,
  logged_at timestamptz default now()
);

create table chat_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  used_at timestamptz default now()
);
create index on chat_usage (user_id, used_at);

create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text,
  created_at timestamptz default now()
);

-- BẬT RLS
alter table profiles enable row level security;
alter table module_progress enable row level security;
alter table quiz_results enable row level security;
alter table time_logs enable row level security;
alter table chat_usage enable row level security;
alter table leads enable row level security;

-- POLICY MẪU (lặp tương tự cho các bảng user-scoped khác)
create policy "users read own profile" on profiles
  for select using (auth.uid() = id);
create policy "users update own profile" on profiles
  for update using (auth.uid() = id);

create policy "users read own progress" on module_progress
  for select using (auth.uid() = user_id);
create policy "users write own progress" on module_progress
  for insert with check (auth.uid() = user_id);
create policy "users update own progress" on module_progress
  for update using (auth.uid() = user_id);

-- leads: cho phép insert ẩn danh từ landing page (không cần đăng nhập)
create policy "anyone can submit lead" on leads
  for insert with check (true);
-- (không có policy SELECT → người dùng không đọc được lead của người khác)
```

---

## 7. Template vai trò — TRÁI TIM CỦA SẢN PHẨM

Đây là phần tạo khác biệt. Đặt trong `/lib/roles.ts` dưới dạng dữ liệu tĩnh (rule-based, không gọi AI).

Mỗi vai trò gồm:
- `id`, `label` (VD "Kinh doanh / Bán hàng")
- `modules[]`: mỗi module có `id`, `title`, `duration` (VD "10 phút"), `content` (nội dung học ngắn, ví dụ thực tế đúng nghề)
- `starterKit`: `prompts[]` (3–5 prompt mẫu dùng được ngay) + `tools[]` (danh sách công cụ AI gợi ý)
- `quiz[]`: 3–5 câu tình huống thực tế, mỗi câu có `question`, `options[]`, `correctIndex`, `explanation`

**Bắt buộc làm đủ 4–5 vai trò**, mỗi vai trò ≥3 module + starter kit + ≥3 câu quiz:
`kinh-doanh`, `ke-toan`, `marketing`, `van-hanh`, `khac`.

**Quy ước id (kebab-case không dấu, dùng nhất quán cho cả `roleId` và `moduleId`):**
- Vai trò: `kinh-doanh`, `ke-toan`, `marketing`, `van-hanh`, `khac`.
- Module: `{role-id}-m{n}` — VD `kinh-doanh-m1`.

> Nội dung phải dùng ngôn ngữ đời thường + ví dụ đúng nghề. VD module cho kinh doanh nói về "dùng AI viết email chốt sale", không nói lý thuyết LLM trừu tượng.

---

## 8. User Stories (theo PRD)

| Mã | Story | Ưu tiên |
|---|---|---|
| US-01 | NV muốn được gợi ý lộ trình AI theo vai trò để học đúng thứ cần | **P1** |
| US-02 | NV muốn hỏi trợ lý AI và nhận câu trả lời bằng ví dụ đúng nghề | **P1** |
| US-03 | NV muốn làm bài kiểm tra tình huống để biết đã hiểu/áp dụng được chưa | **P1** |
| US-04 | NV muốn ghi nhật ký "AI giúp tiết kiệm bao nhiêu giờ" để thấy tiến bộ | **P1** |
| US-05 | NV muốn đăng ký/đăng nhập để lưu tiến bộ | **P1** |
| US-06 | NV muốn nhận gợi ý công cụ AI phù hợp vị trí | P1–P2 |
| US-07 | Quản lý muốn xem dashboard năng lực toàn đội | P2 (KHÔNG build GĐ1) |
| US-08 | HR muốn thêm/quản lý tài khoản NV | P2 (KHÔNG build GĐ1) |
| US-09 | DN muốn lưu prompt/quy trình nội bộ thành khóa học | P3 (KHÔNG build GĐ1) |

---

## 9. Đặc tả 3 tính năng (bám PRD)

### 9.1 Lộ trình cá nhân hóa (US-01)
- Onboarding: chọn 1 trong 5 vai trò → lưu `profiles.role_id`.
- Trang `/lo-trinh`: timeline các module (tiêu đề, thời lượng, trạng thái, **% hoàn thành** tổng).
- Mỗi vai trò có khối **starter kit** (prompt + tool) hiển thị nổi bật, dễ copy (button "Copy").
- Mở module → đọc nội dung ngắn → nút **"Đánh dấu hoàn thành"** → cập nhật `module_progress` + % tức thì (optimistic update).

**Acceptance:**
- [ ] Chọn "kinh doanh" → ra đúng lộ trình kinh doanh (khác kế toán).
- [ ] 4–5 vai trò đều có ≥3 module + starter kit.
- [ ] Đánh dấu hoàn thành → % cập nhật ngay.
- [ ] Trang tải < 3 giây.

### 9.2 Trợ lý AI gia sư (US-02)
- Trang `/tro-ly`: giao diện chat, có sẵn câu hỏi gợi ý theo vai trò (4–6 chip).
- Gọi `/api/chat` (POST, stream) → server đọc `role_id` của user → build system prompt (xem mẫu bên dưới).
- **Rate-limit:** mặc định **30 lượt/ngày/user** (đếm qua `chat_usage` 24h gần nhất). Vượt → trả 429 + UI thông báo "Hết lượt hôm nay".
- Cache câu hỏi phổ biến (ví dụ "AI là gì?") theo `role_id` để giảm chi phí.
- Stream phản hồi (SSE/ReadableStream) để hiển thị bắt đầu < 5 giây.

**System prompt mẫu** (`/lib/openai.ts`):
```ts
const ROLE_LABEL: Record<RoleId, string> = {
  'kinh-doanh': 'Nhân viên kinh doanh / bán hàng',
  'ke-toan': 'Nhân viên kế toán',
  'marketing': 'Nhân viên marketing',
  'van-hanh': 'Nhân viên vận hành',
  'khac': 'Nhân viên văn phòng',
}

export function buildSystemPrompt(roleId: RoleId): string {
  return `Bạn là "Trợ lý AI" — gia sư riêng cho ${ROLE_LABEL[roleId]} tại doanh nghiệp Việt Nam.

NGUYÊN TẮC:
1. Luôn trả lời bằng tiếng Việt, ngôn ngữ đời thường, KHÔNG dùng thuật ngữ kỹ thuật trừu tượng.
2. Mọi ví dụ phải lấy từ công việc thực tế của ${ROLE_LABEL[roleId]}. KHÔNG dùng ví dụ chung chung.
3. Chỉ trả lời câu hỏi liên quan đến: AI trong công việc, công cụ AI, cách dùng prompt, an toàn dữ liệu.
   Câu hỏi ngoài phạm vi (chính trị, y tế, pháp lý cá nhân, v.v.) → từ chối lịch sự, gợi ý hỏi đúng chỗ.
4. Nếu user có dấu hiệu paste dữ liệu nhạy cảm (CMND, số tài khoản, dữ liệu khách hàng) → cảnh báo
   không nên đưa lên công cụ AI công cộng, gợi ý dùng bản local/enterprise.
5. KHÔNG bịa. Nếu không chắc → nói rõ "tôi chưa chắc, bạn nên kiểm tra với..." và gợi ý nguồn.
6. Trả lời ngắn gọn, có cấu trúc (bullet hoặc bước). Tối đa ~250 từ trừ khi user yêu cầu chi tiết.`
}
```

**Acceptance:**
- [ ] NV kinh doanh hỏi "AI là gì?" → trả lời có ví dụ bán hàng (email chốt sale, viết kịch bản gọi…).
- [ ] Câu ngoài phạm vi → từ chối lịch sự, không bịa.
- [ ] Paste số tài khoản → cảnh báo an toàn dữ liệu.
- [ ] Phản hồi bắt đầu hiển thị < 5 giây (streaming).
- [ ] Lượt 31 trong ngày → 429 + UI "Hết lượt hôm nay".

### 9.3 Bằng chứng tiến bộ (US-03, US-04)
- **Kiểm tra tình huống** `/kiem-tra/[roleId]`: 3–5 câu, chấm điểm, hiện giải thích. ≥70% mới `passed=true`.
- **Nhật ký** trên `/tien-bo`: nút **1-chạm** "hôm nay AI giúp tiết kiệm ~__ giờ" (chips: 0.5h / 1h / 2h / 4h) + slider hữu ích (1–10) → ghi `time_logs`.
- **Tổng hợp**: hiển thị % hoàn thành + điểm trung bình + **tổng giờ tiết kiệm** (một con số LỚN). Đây là mầm dashboard GĐ2.

> ⚠ **Giữ ma sát thấp:** nhật ký phải 1-chạm, test phải ngắn. Đo lường nặng tay → tụt kích hoạt (rủi ro chính của GĐ1 — xem mục 12).

**Acceptance:**
- [ ] Mỗi vai trò ≥3 câu kiểm tra + giải thích.
- [ ] Hoàn thành test → điểm lưu vào `quiz_results`.
- [ ] Ghi nhật ký < 5 giây thao tác (1-chạm).
- [ ] Xem được tiến bộ trực quan (%, điểm, giờ).

### 9.4 Landing page (pre-launch)
- Trang `/` công khai (KHÔNG cần đăng nhập): nói rõ value, form thu email → `/api/leads` ghi vào `leads`.
- Mục tiêu: chạy song song lúc build app để thu lead sớm.

---

## 10. Yêu cầu phi chức năng
- **Hiệu năng:** trang chính < 3s; trợ lý bắt đầu phản hồi < 5s.
- **Responsive:** mobile-first. Test thử trên iPhone SE (375px) và 1440px.
- **Bảo mật:** auth bắt buộc cho khu `(app)` (middleware redirect về `/login`); RLS mọi bảng; key API ở server; không lưu nội dung chat nhạy cảm.
- **Đo lường:** ghi đủ dữ liệu kích hoạt, hoàn thành, điểm test, giờ tiết kiệm (phục vụ KPI + case study).
- **Chi phí AI:** rate-limit + cache để giữ ≤ ~22.000đ/người/tháng. Theo dõi qua `chat_usage` + dashboard OpenAI.

---

## 11. KPI Giai đoạn 1
| KPI | Ngưỡng | Đo qua |
|---|---|---|
| Kích hoạt | ≥80% hoàn thành onboarding + dùng trợ lý tuần đầu | `module_progress` + `chat_usage` |
| Giữ chân | ≥40% quay lại tuần 2 | `auth.users.last_sign_in_at` |
| Hiệu quả | TB ≥3h/người/tuần tiết kiệm sau 2 tuần | `time_logs` |
| Chất lượng trợ lý | Hài lòng ≥8/10 | Khảo sát thủ công + `time_logs.usefulness` |
| Chi phí | ≤ ~22.000đ/người/tháng | OpenAI billing / số user active |
| Bằng chứng | **≥3 case study** + **≥1 doanh nghiệp pilot** | Thủ công (phỏng vấn) |

---

## 12. Rủi ro & giả định cần lưu khi build

| Rủi ro | Cách giảm thiểu trong code |
|---|---|
| **Đo lường vs ma sát:** test + nhật ký bắt buộc làm tụt kích hoạt | Nhật ký 1-chạm, test ≤5 câu, KHÔNG bắt buộc test mới được học module sau |
| **Chi phí AI vượt ngưỡng** | Rate-limit cứng 30 lượt/ngày; cache câu hỏi phổ biến; dùng `gpt-4o-mini` |
| **User không quay lại sau tuần đầu** | Starter kit copy-paste là dùng được ngay; gamification nhẹ (con số tổng giờ) |
| **Trợ lý trả lời sai / bịa** | System prompt nguyên tắc 5 "không bịa"; nhắc "kiểm tra lại với chuyên gia" khi không chắc |
| **Mở rộng scope sang GĐ2** (dashboard quản lý…) | Trang `/tien-bo` chỉ hiển thị cá nhân. Nếu thấy yêu cầu kiểu "xem đội" → để TODO, hỏi user |

---

## 13. NGOÀI phạm vi GĐ1
Các mục sau không được tự mở rộng khi đang làm task GĐ1. Nếu user giao task
GĐ2 rõ ràng, dùng `specs/PHASE2-SPEC.md` làm source of truth:
- AI Agent tự thiết kế lộ trình từ dữ liệu công ty (GĐ2).
- Dashboard quản lý đầy đủ cho HR/quản lý — US-07, US-08 (GĐ2).
- Quản lý tổ chức / multi-tenant (GĐ2).
- Gói VIP lưu quy trình nội bộ — US-09 (GĐ3).
- Tự động hóa nghiệp vụ (đọc hóa đơn…) (GĐ3).
- Thanh toán định kỳ / cơ chế hoàn tiền tự động (GĐ2).
- Affiliate công cụ (GĐ3).

> Lý do: GĐ1 chỉ 5 tuần, nhắm P1 (bottom-up). Mọi thứ trên vừa chậm vừa sai đối tượng.

---

## 14. Roadmap 3 giai đoạn (context để Claude hiểu hướng tới)

| GĐ | Trọng tâm | Hạng mục chính |
|---|---|---|
| **GĐ1 (5 tuần)** | Mũi nhọn bottom-up | 3 tính năng cốt lõi + landing page thu lead |
| **GĐ2** | Bán cho công ty | AI Agent đầy đủ · dashboard quản lý (US-07) · quản lý NV (US-08) · cam kết hoàn tiền · thu phí theo gói |
| **GĐ3** | Hào nước & doanh thu | Gói VIP lưu quy trình nội bộ (US-09) · gói tự động hóa · affiliate công cụ |

---

## 15. Quy ước làm việc với Claude Code

### Thứ tự build (5 tuần)

> **Ưu tiên tuần 1: ship Landing page lên Vercel để thu lead NGAY**, song song setup nền tảng. App `(app)` build sau.

1. **Tuần 1 — Landing live + nền tảng:**
   - Init Next.js + Tailwind + shadcn. ✔ (đã xong)
   - Build **Landing page `/`** (copy value prop, form email → `/api/leads`) → **deploy Vercel ngay** → bắt đầu chạy thu lead.
   - Setup Supabase project + chạy migration `0001_init.sql` (bảng `leads` hoạt động trước, các bảng khác sẵn sàng).
   - Setup Supabase Auth (login/register UI có thể chưa hoàn chỉnh — chỉ cần đăng nhập được).
2. **Tuần 2:** Onboarding (chọn vai trò) + `roles.ts` đầy đủ 5 vai trò + middleware auth bảo vệ khu `(app)`.
3. **Tuần 3:** Lộ trình `/lo-trinh` + đánh dấu hoàn thành.
4. **Tuần 4:** Trợ lý AI `/tro-ly` + rate-limit (30 lượt/ngày) + cache + model `gpt-4o-mini`.
5. **Tuần 5:** Kiểm tra `/kiem-tra` + Nhật ký `/tien-bo` + polish + deploy production.

**Nguyên tắc deploy:** mỗi push lên `main` tự động deploy Vercel. Landing live xuyên suốt 5 tuần để thu lead, không chờ app hoàn chỉnh.

### Code style
- **Path:** kebab-case không dấu (`/lo-trinh`, `/tro-ly`).
- **Id:** kebab-case không dấu (`kinh-doanh`, `kinh-doanh-m1`).
- **Text hiển thị:** tiếng Việt có dấu ("Lộ trình của tôi").
- **Component name:** PascalCase tiếng Anh (`RoleCard`, `ModuleTimeline`).
- **Trước khi thêm thư viện mới:** kiểm tra shadcn/ui đã có chưa.
- **DO NOT** tự ý mở rộng scope sang GĐ2–3. Thấy nghi ngờ → hỏi user hoặc để TODO.

### Commit convention
- Conventional commit: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Mỗi feature 1 branch theo `.agents/rules/agent-workflow.md`: `{type}/{noi-dung}` — vd. `feat/update-lession-ui`, `fix/chat-stream`.
- Trước feature mới: `git checkout develop && git pull origin develop`.
- Commit nhỏ, mỗi commit đi kèm 1 acceptance ✓.
- KHÔNG commit `.env*` (đã có trong `.gitignore` mặc định của Next).

### Testing strategy (gọn nhẹ cho GĐ1)
- **Không bắt buộc unit test** mọi component (5 tuần không đủ).
- **Bắt buộc** test thủ công đầy đủ checklist Acceptance ở mục 9 trước khi merge mỗi feature.
- **Khuyến nghị:** 1 file Playwright e2e cho 3 luồng vàng:
  1. Đăng ký → onboarding → thấy lộ trình kinh doanh.
  2. Mở trợ lý → hỏi "AI là gì?" → nhận câu trả lời streaming.
  3. Làm test → ghi nhật ký → thấy tổng giờ cập nhật.

### Check sau khi tạo/sửa code
- Chạy `npm run lint` → không có error (warning chấp nhận được).
- Chạy `npm run test` → pass.
- Chạy `npm run build` → KHÔNG có lỗi TypeScript / lỗi build.
- Review toàn bộ diff trước khi báo xong (xem `.agents/rules/agent-workflow.md`).

---

## 16. Biến môi trường (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # chỉ dùng server-side, KHÔNG để lộ client
OPENAI_API_KEY=                # chỉ dùng server-side, KHÔNG để lộ client
OPENAI_MODEL=gpt-4o-mini       # default model cho trợ lý
RATE_LIMIT_PER_DAY=30          # số lượt chat tối đa/user/ngày
```
Cấu hình các biến này trên Vercel dashboard khi deploy. Tạo `.env.example` (commit được) làm template.
