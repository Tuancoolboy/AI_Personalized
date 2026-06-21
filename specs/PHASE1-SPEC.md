# Phase 1 — Spec & Task Breakdown
> AI Trợ Lý · Team 09 · AI20K Build Cohort 2  
> Mục tiêu: MVP ~70% hoàn thiện, các function chính phải chạy được  
> Timeline: 5 tuần  
> **Cập nhật lần cuối: 09/06/2026 (v1.4 — proxy onboarding + ai_level + sync thực tế)**

> [!NOTE]
> **v1.2 — Changelog:** Tech stack, database schema và cấu trúc thư mục đã được cập nhật theo quyết định thực tế (xem `WORKLOG.md` 08/06 + 09/06). Xem mục "Thay đổi so với v1.1" ở cuối file để biết chi tiết.

---

> [!IMPORTANT]
> **Bắt buộc khi implement bất kỳ task nào trong spec này:**
> Tạo hoặc cập nhật file `specs/notes/[SPEC-ID]-implementation-notes.html` (ưu tiên HTML, hoặc `.md` nếu cần) trước khi kết thúc task.
> Ghi lại: (1) quyết định AI tự ra, (2) chỗ thay đổi so với spec, (3) tradeoff, (4) mọi thứ khác cần biết.
> Xem rule: `.agents/rules/spec-implementation-notes.md` · Template: `specs/notes/_TEMPLATE-implementation-notes.html`

---

## User Story → Task Traceability

| User Story | Mô tả | Tasks |
|-----------|-------|-------|
| US-01 | Lộ trình học AI theo vai trò | BE-03, BE-05, FE-04, FE-05 |
| US-02 | Hỏi trợ lý AI theo ngữ cảnh | BE-06, FE-06 |
| US-03 | Kiểm tra tình huống thực tế | BE-07, FE-07 |
| US-04 | Nhật ký "tiết kiệm giờ" | BE-08, FE-05 (1-tap), FE-08 |
| US-05 | Đăng ký/đăng nhập | BE-01, FE-02 |
| US-06 (P1 scope) | Gợi ý công cụ AI → **Starter Kit trong lộ trình** | BE-03 (starter_kit_json), FE-05 |
| US-07 | Dashboard quản lý | ⚠️ **Bản sơ khai** — xem leads landing (`/quan-ly/leads`); dashboard đội vẫn mock → Phase 2 |
| US-08 | Quản lý tài khoản nhân viên | ❌ Phase 2 |

> **Ghi chú US-06:** Phạm vi Phase 1 của US-06 = Starter Kit (bộ prompt mẫu + danh sách công cụ AI) được hiển thị trong mỗi module của lộ trình. Không có màn gợi ý riêng. Nâng cao (AI-driven recommendation) → Phase 2.

---

## Tech Stack — ĐÃ CHỐT

> [!IMPORTANT]
> Tech stack đã chốt. Không dùng "hoặc" — team thống nhất 1 stack duy nhất.  
> **v1.2:** Cập nhật theo quyết định thực tế ngày 08/06 (xem `WORKLOG.md`).

| Layer | Stack | Lý do |
|-------|-------|-------|
| Framework | **Next.js 16.2.7 (App Router)** + TypeScript 5 | Latest Vercel template; hỗ trợ Tailwind v4 sẵn. ⚠ Breaking changes so với Next 14/15 — đọc `AGENTS.md` + `node_modules/next/dist/docs/` trước khi code API mới |
| UI | **Tailwind CSS v4 + shadcn/ui** | Tailwind v4 dùng `@tailwindcss/postcss`, KHÔNG có `tailwind.config.js` như v3 |
| Backend | **Next.js API Routes** (monorepo) | Không cần tách service, đơn giản cho team nhỏ |
| Database | **Supabase** (Postgres + Auth + RLS) | Hosted, free tier đủ MVP; Auth + RLS built-in thay cho custom JWT |
| Auth | **Supabase Auth** (email/password) | ~~Custom JWT~~ → Supabase Auth vì tích hợp sẵn với Postgres + RLS, không cần `jose`/`bcrypt` |
| AI | **OpenAI GPT-4o-mini** | Giá ~22.000đ/người/tháng — đáp ứng biên gộp. Rate-limit 30 lượt/ngày/user |
| Charts | **recharts v3** | React-friendly, ~92KB gzip, declarative JSX |
| Deploy | **Vercel** (full-stack) | Zero config cho Next.js |
| Rate-limit AI | **Bảng `chat_usage`** (Supabase) | Query 24h gần nhất — không cần Redis cho Phase 1 |
| Middleware | **`proxy.ts`** (Next 16 convention) | `middleware.ts` deprecated trong Next 16 → đổi sang `proxy.ts` |

---

## Demo Mode

> [!NOTE]
> **v1.2:** Thêm mục này để phản ánh quyết định ngày 09/06 (xem `WORKLOG.md`).

Khi **thiếu env vars** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), app tự động chuyển sang **demo mode**:

| Thành phần | Demo mode | Production mode |
|---|---|---|
| User data (progress, time_logs, quiz) | `lib/demo-storage.ts` (localStorage) | Supabase + RLS |
| Trợ lý AI (`/tro-ly`) | `lib/tro-ly-canned-responses.ts` (regex match) | `/api/chat` → OpenAI streaming |
| Auth | Cookie `ai_troly_demo_session` | Supabase Auth (email/password) |
| Role detection | Email pattern (`quanly@`, `manager@`…) | `profiles.user_type` query |

Demo mode cho phép demo đầy đủ flow mà không cần setup infra. Khi env có sẵn → tự nhận biết và dùng real backend.

**⚠ Risk:** Phải assert env trong CI/CD trước deploy production để tránh demo paths vào tay users thật.

---

## Standard Error Format

> Tất cả API endpoints phải trả error theo format này:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi cho user (tiếng Việt)",
    "details": {}
  }
}
```

**Error codes chuẩn:**
| Code | HTTP Status | Khi nào |
|------|:-----------:|--------|
| `VALIDATION_ERROR` | 400 | Field thiếu hoặc sai format |
| `UNAUTHORIZED` | 401 | Chưa login hoặc token hết hạn |
| `FORBIDDEN` | 403 | Không có quyền |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `CONFLICT` | 409 | Duplicate (email đã tồn tại...) |
| `RATE_LIMIT_EXCEEDED` | 429 | Vượt giới hạn |
| `INTERNAL_ERROR` | 500 | Lỗi server không xác định |

---

## Database ER Diagram

> [!IMPORTANT]
> **v1.2:** Schema đã thay đổi so với v1.1. Auth dùng **Supabase Auth** (`auth.users` built-in) thay vì bảng `users` tự quản. Nội dung module/quiz là **static data** trong `lib/roles.ts` — KHÔNG lưu DB (rule-based, không gọi AI). Migration thực tế: `supabase/migrations/0001_init.sql` + `0002_profiles_trigger.sql`.

```mermaid
erDiagram
    auth_users {
        uuid id PK
        varchar email UK
        varchar encrypted_password
        timestamp created_at
        timestamp last_sign_in_at
    }

    profiles {
        uuid id PK_FK "references auth.users"
        text full_name
        text role_id "kinh-doanh|ke-toan|marketing|van-hanh|khac"
        timestamptz created_at
    }

    module_progress {
        uuid id PK
        uuid user_id FK
        text module_id "VD: kinh-doanh-m1"
        text status "chua-hoc|dang-hoc|hoan-thanh"
        timestamptz completed_at
    }

    quiz_results {
        uuid id PK
        uuid user_id FK
        text role_id
        text module_id
        int score "0-100"
        boolean passed "generated: score >= 70"
        timestamptz created_at
    }

    time_logs {
        uuid id PK
        uuid user_id FK
        numeric hours_saved "> 0"
        int usefulness "1-10"
        text note
        timestamptz logged_at
    }

    chat_usage {
        uuid id PK
        uuid user_id FK
        timestamptz used_at
    }

    leads {
        uuid id PK
        text email
        text name
        text source
        timestamptz created_at
    }

    auth_users ||--|| profiles : "trigger auto-create (0002)"
    auth_users ||--o{ module_progress : tracks
    auth_users ||--o{ quiz_results : takes
    auth_users ||--o{ time_logs : logs
    auth_users ||--o{ chat_usage : uses
```

> **Ghi chú schema (v1.2):**
> - **Auth:** `auth.users` do Supabase quản lý. `profiles` là bảng mở rộng — trigger `0002` tự tạo row khi user đăng ký.
> - **Nội dung học:** module, quiz, starter kit là **static data** trong `lib/roles.ts` (rule-based). Không có bảng `learning_paths`, `modules`, `quiz_questions` trong DB.
> - **Module ID:** dùng text key (`kinh-doanh-m1`), không phải UUID FK — vì content là static.
> - **quiz_results:** mỗi lần submit tạo 1 record mới (append). FE lấy **điểm cao nhất** (max score) để hiển thị tiến bộ.
> - **RLS:** tất cả bảng user-scoped có `auth.uid() = user_id`. `leads` cho phép INSERT ẩn danh.
> - **Phase 2:** nếu cần manager dashboard thật, thêm cột `user_type` vào `profiles` + policy đọc chéo.

---

## Tổng quan kiến trúc Phase 1

> [!NOTE]
> **v1.2:** Cập nhật theo cấu trúc thực tế đã build (Sprint 2). Route paths dùng tiếng Việt không dấu theo quy ước `CLAUDE.md §15`.

```
app/                          (Next.js 16 App Router)
├── page.tsx                  ← Landing page (public)
├── layout.tsx
├── globals.css
├── favicon.ico
│
├── (auth)/                   ← Layout không cần auth
│   ├── layout.tsx
│   ├── login/page.tsx        ✅ Done
│   └── register/page.tsx     ✅ Done
│
├── (app)/                    ← Layout yêu cầu đăng nhập (proxy.ts guard)
│   ├── layout.tsx            ← Nav + demo banner
│   ├── onboarding/page.tsx   ✅ Done — 4 bước (vai trò → lý do → assessment 6 câu → kết quả)
│   ├── lo-trinh/page.tsx     ✅ Done — hero ring + starter kit + timeline 6 module
│   ├── tro-ly/page.tsx       ✅ Done — chat UI (canned responses; TODO: wire OpenAI)
│   ├── kiem-tra/
│   │   └── [roleId]/page.tsx ✅ Done — quiz tình huống + ring score
│   ├── tien-bo/page.tsx      ✅ Done — 1-tap journal + stat cards
│   └── quan-ly/              ⚠ Phase 2 scope (built for demo)
│       ├── page.tsx          ⚠ Manager dashboard (recharts: bar/donut/line)
│       ├── leads/page.tsx    ✅ Done — danh sách đăng ký landing (bản sơ khai US-07)
│       └── nhan-vien/page.tsx⚠ Team list + filter chip
│
└── api/
    ├── leads/route.ts        ✅ Done — POST + GET (manager), rate-limit POST 10/giờ/IP
    ├── chat/route.ts         ❌ TODO Sprint 3 — OpenAI streaming + rate-limit
    └── nhat-ky/route.ts      ❌ TODO Sprint 3 — ghi time_logs Supabase

lib/
├── roles.ts                  ✅ Done — static content: 4 roles × 6 module + starter kit + 3 quiz
├── assessment.ts             ✅ Done — logic onboarding assessment (likert + multi-chip)
├── demo-storage.ts           ✅ Done — localStorage fallback khi chưa có Supabase
├── tro-ly-canned-responses.ts✅ Done — canned AI responses theo regex + role
├── rate-limit-memory.ts      ✅ Done — in-memory rate-limit cho /api/leads
├── team-data.ts              ✅ Done — mock data 12 NV cho manager dashboard
├── manager-auth.ts           ✅ Done — detect quản lý (email pattern GĐ1)
├── utils.ts
└── supabase/
    ├── client.ts             ✅ Done — browser Supabase client
    ├── server.ts             ✅ Done — server Supabase client (RSC + API routes)
    └── is-configured.ts      ✅ Done — detect env → switch demo/real mode

components/
├── ui/                       ← shadcn primitives
├── landing-lead-form.tsx     ✅ Done
├── auth-login-form.tsx       ✅ Done
├── auth-register-form.tsx    ✅ Done
├── onboarding-flow.tsx       ✅ Done
├── lo-trinh-content.tsx      ✅ Done
├── tro-ly-chat.tsx           ✅ Done
├── kiem-tra-quiz.tsx         ✅ Done
├── tien-bo-content.tsx       ✅ Done
├── manager-dashboard.tsx     ⚠ Phase 2 scope (+ card đếm leads thật)
├── manager-leads-list.tsx    ✅ Done — bảng leads từ Supabase
├── manager-team-list.tsx     ⚠ Phase 2 scope
└── app-nav-logout-button.tsx ✅ Done

supabase/migrations/
├── 0001_init.sql             ✅ Done — 6 bảng + RLS
└── 0002_profiles_trigger.sql ✅ Done — auto-create profile khi register

proxy.ts                      ✅ Done — Next 16 middleware (đổi từ middleware.ts)
```

---

## Flow chính — User Journey (Phase 1)

```
Landing Page → Đăng ký → Onboarding (chọn vai trò + trình độ AI)
  → Home/Lộ trình → Mở Module → Học bài → [Ghi nhật ký 1-tap]
  → Hỏi AI Tutor → Làm Quiz → Xem tiến độ
```

---

## Phase 1 — Task List

> [!NOTE]
> **v1.2:** Cập nhật trạng thái từng task theo thực tế Sprint 1–2. `✅ Done` = đã build và chạy được local. `❌ TODO` = chưa làm. `⚠` = có ghi chú.

### 🔴 SPRINT 1 (Tuần 1–2): Foundation + Auth + Onboarding

---

#### [BE-01] Auth — Đăng ký / Đăng nhập ✅ Done (via Supabase Auth)

**Mô tả:** ~~API xác thực tự viết~~ → dùng **Supabase Auth** (email/password). Không có custom `/api/auth/*` route.

**Tasks:**
- [x] ~~`POST /api/auth/register`~~ → `supabase.auth.signUp()` trong `auth-register-form.tsx`
- [x] ~~`POST /api/auth/login`~~ → `supabase.auth.signInWithPassword()` trong `auth-login-form.tsx`
- [x] ~~`POST /api/auth/logout`~~ → `supabase.auth.signOut()` trong nav
- [x] Auth guard cho protected routes → `proxy.ts` (Next 16 middleware) kiểm tra session cookie
- [x] Schema DB: `profiles` (mở rộng `auth.users`) + trigger `0002` auto-create

**Acceptance Criteria:**
- [x] Đăng ký thành công → user tạo trong Supabase Auth + profile auto-created
- [x] Email trùng → Supabase trả lỗi, UI hiển thị thông báo
- [x] Login sai password → lỗi 400 từ Supabase, UI hiển thị
- [x] Protected route chưa login → redirect `/login?next=<path>`
- [x] ~~Password hash (bcrypt)~~ → Supabase tự hash, không cần xử lý thủ công

---

#### [BE-02] User Profile & Role ✅ Done

**Mô tả:** Lưu vai trò + `ai_level` (0–5) sau onboarding.

**Tasks:**
- [x] `GET /api/profile` — đọc `role_id`, `full_name`, `ai_level`
- [x] `PUT /api/profile` — cập nhật sau onboarding
- [x] Schema: `profiles.role_id` + migration `0005_profiles_ai_level.sql`
- [x] Demo mode: `demo-storage.ts` + cookie `ai_troly_demo_onboarded`

**Acceptance Criteria:**
- [x] Demo + Supabase: sau onboarding → lộ trình đúng vai trò
- [x] `ai_level >= 5` → skip module nhập môn (production)

---

#### [BE-03] Learning Path — Rule-based Static Data ✅ Done

**Mô tả:** Lộ trình học là **static data** trong `lib/roles.ts` — KHÔNG có DB table, KHÔNG gọi AI. Không cần API route riêng.

**Tasks:**
- [x] ~~`GET /api/learning-path`~~ → `getRole(roleId)` từ `lib/roles.ts` (pure function, import trực tiếp trong RSC)
- [x] Static content: 4 role × 6 module + starter kit (3 prompts + 4 tools) + 3 quiz mỗi role
- [x] ~~Schema DB: `learning_paths`, `modules`~~ → KHÔNG có DB table; content là TypeScript object
- [x] ~~Seed data script~~ → không cần; content luôn available

**Thay đổi so với v1.1:**
- Toàn bộ content lưu trong file `lib/roles.ts` (759 dòng), không phải DB. Lý do: rule-based, không thay đổi theo user, không cần query.
- Thiếu role `khac` — **cần bổ sung** (acceptance criteria CLAUDE.md §9.1 yêu cầu 5 roles).

**Acceptance Criteria:**
- [x] `kinh-doanh` → lộ trình khác `ke-toan`
- [x] Mỗi role có ≥3 module với tiêu đề và thời lượng
- [x] Response bao gồm `starter_kit` (prompts + tools)
- [x] Load < 1s (static import)
- [x] Role `khac` đủ module + quiz + starter kit

---

#### [BE-04] Module Progress ✅ Done

**Mô tả:** Đánh dấu module hoàn thành, tính % tổng.

**Tasks:**
- [x] `POST/GET /api/progress` — `module_progress` Supabase + demo fallback
- [x] Schema DB: `module_progress` — migration `0001`

**Acceptance Criteria:**
- [x] Đánh dấu xong → % cập nhật ngay (demo + Supabase)

---

#### [FE-01] Landing Page ✅ Done

**Mô tả:** Trang giới thiệu sản phẩm + thu email pre-launch.

**Tasks:**
- [x] Hero section + sub + CTA "Dùng thử miễn phí" → `/register`
- [x] Value proposition: 3 trụ cột (Lộ trình cá nhân hóa, Trợ lý AI gia sư, Bằng chứng tiến bộ)
- [x] Social proof section (placeholder)
- [x] Form thu email → `POST /api/leads` → toast
- [x] CTA cuối trang → `/register`
- [x] Responsive mobile/desktop
- [ ] SEO: OG image + structured data (TODO polish)
- [ ] Event tracking (TODO Sprint 4)

**Acceptance Criteria:**
- [x] Form submit → email ghi bảng `leads` Supabase (khi env có) + toast "Đã đăng ký!"
- [x] Responsive 375px và 1280px
- [ ] Load < 3s (chưa đo Lighthouse)
- [x] CTA → `/register`
- [x] Rate-limit 10 req/giờ/IP chống spam

---

#### [FE-02] Auth UI — Đăng ký / Đăng nhập ✅ Done

**Mô tả:** Form đăng ký và đăng nhập qua Supabase Auth.

**Tasks:**
- [x] `/register`: form (name, email, password, confirm password) + Supabase `signUp()`
- [x] `/login`: form (email, password) + Supabase `signInWithPassword()`
- [x] Error states hiển thị dưới field
- [x] Redirect sau login → `/onboarding` nếu chưa có `profiles.role_id`, `/lo-trinh` nếu đã onboard
- [x] Demo mode: login bất kỳ email → bypass Supabase, tạo demo session cookie
- [ ] "Quên mật khẩu" — Phase 2

**Acceptance Criteria:**
- [x] Đăng ký → redirect `/onboarding`
- [x] Đăng nhập → redirect `/lo-trinh`
- [x] Loading state khi gọi API

---

#### [FE-03] Onboarding — Chọn vai trò ✅ Done (4 bước, nâng cấp từ spec)

**Mô tả:** Onboarding 4 bước — phong phú hơn spec ban đầu dựa trên demo feedback.

**Tasks:**
- [x] Bước 1: Chọn vai trò (5 card: Kinh doanh, Kế toán, Marketing, Vận hành, Khác)
- [x] Bước 2: Giải thích tại sao cần làm assessment (xây dựng trust)
- [x] Bước 3: Assessment 6 câu (likert + multi-chip) → `lib/assessment.ts` tính score 0–5
- [x] Bước 4: Kết quả ring score + breakdown lộ trình; user > 5 điểm auto skip 2 module nhập môn
- [x] Submit → lưu role vào demo-storage / Supabase → redirect `/lo-trinh`
- [x] `proxy.ts` guard: đã onboard → skip onboarding

**Acceptance Criteria:**
- [x] Chọn vai trò → lộ trình đúng vai trò
- [x] Sau onboarding không quay lại nữa
- [x] Responsive

---

### 🟡 SPRINT 2 (Tuần 2–3): Learning Path + Lesson View

---

#### [BE-05] Lesson Content API ✅ Done (static, không cần API route)

**Mô tả:** ~~API route~~ → content là static data trong `lib/roles.ts`, import trực tiếp trong component.

**Tasks:**
- [x] ~~`GET /api/modules/:moduleId`~~ → `getRole(roleId).modules.find(m => m.id === moduleId)`
- [x] Nội dung: tiêu đề, body (text + ví dụ đúng nghề), starter kit, thời lượng
- [x] 4 role × 6 module = 24 bài học có content thật (tiếng Việt, ví dụ đúng nghề)

**Acceptance Criteria:**
- [x] Module content đúng theo role
- [x] Content ví dụ sát vai trò (không chung chung)

---

#### [FE-04] Home — Lộ trình học ✅ Done (`/lo-trinh`)

**Mô tả:** Màn hình chính hiển thị lộ trình cá nhân hóa. Route thực tế là `/lo-trinh` (không phải `/home`).

**Tasks:**
- [x] Hero ring % hoàn thành + tag trình độ AI
- [x] 3 starter prompt cards với button Copy
- [x] 4 công cụ AI cards
- [x] Timeline 6 module với modal chi tiết + nút "Đánh dấu hoàn thành"
- [x] Nút "Làm bài kiểm tra" → `/kiem-tra/[roleId]`
- [x] Loading state

**Acceptance Criteria:**
- [x] Lộ trình đúng theo role
- [x] % hoàn thành cập nhật ngay sau click (optimistic, demo mode)
- [x] Module đã complete → icon ✓ màu xanh

---

#### [FE-05] Lesson View ✅ Done (modal trong `/lo-trinh`, không route riêng)

**Mô tả:** ~~Trang `/lessons/[id]`~~ → nội dung mở trong **modal** ngay trong `/lo-trinh`. Không tạo route riêng để giảm navigation overhead.

**Tasks:**
- [x] Modal content: tiêu đề, mô tả, bullet điểm chính, starter kit
- [x] Nút "Đánh dấu hoàn thành" trong modal
- [x] Prompt cards có button Copy trong starter kit section

**Acceptance Criteria:**
- [x] Nội dung render đúng
- [x] Click "Hoàn thành" → modal đóng + ring % cập nhật
- [x] Copy prompt hoạt động

---

### 🟢 SPRINT 3 (Tuần 3–4): AI Tutor + Quiz

---

#### [BE-06] AI Tutor API ✅ Done

**Mô tả:** Route `/api/chat` proxy gọi OpenAI, inject system prompt theo role, rate-limit qua `chat_usage`.

**Tasks:**
- [x] `POST /api/chat` — SSE stream + cache canned
- [x] System prompt `lib/openai.ts`
- [x] Rate-limit `chat_usage` 30/ngày → 429
- [x] Safety check + guardrails

**System Prompt** (đã định nghĩa trong `CLAUDE.md §9.2`):
```typescript
// lib/openai.ts
export function buildSystemPrompt(roleId: RoleId): string { ... }
```

**Acceptance Criteria:**
- [x] Ví dụ đúng vai trò (test API + manual)
- [x] Safety warning paste nhạy cảm
- [x] `OPENAI_API_KEY` server-only
- [ ] Rate-limit 31 lượt — chưa có test tự động

---

#### [BE-07] Quiz API ✅ Done (static data, không cần API route)

**Mô tả:** ~~API route~~ → quiz là static data trong `lib/roles.ts`, chấm điểm ở client.

**Tasks:**
- [x] ~~`GET /api/quiz/:moduleId`~~ → `getRole(roleId).quiz` trực tiếp trong component
- [x] ~~`POST /api/quiz/:moduleId/submit`~~ → tính điểm client-side; lưu vào demo-storage hoặc Supabase
- [x] Static data: 4 role × 3 câu hỏi tình huống + explanation
- [x] Ghi `quiz_results` Supabase qua `/api/quiz-results`

**Quiz Retry Policy (thực tế):** FE tính điểm ngay sau submit, lưu append. Best score hiển thị trên `/tien-bo`.

**Acceptance Criteria:**
- [x] Câu hỏi đúng theo role
- [x] Submit → ring score kết quả + feedback xanh/đỏ từng câu + giải thích
- [x] Score ≥70% → passed state khác biệt
- [x] Điểm lưu `quiz_results` Supabase

---

#### [FE-06] AI Tutor Chat UI ✅ Done

**Mô tả:** Giao diện chat tại `/tro-ly`.

**Tasks:**
- [x] Chat bubble UI (user + assistant)
- [x] Input field + nút Send (Enter để gửi)
- [x] Suggestion chips theo role (4–6 câu gợi ý)
- [x] Typing animation khi chờ reply
- [x] Safety check: detect paste data nhạy cảm → cảnh báo inline
- [x] Scroll to bottom tự động
- [x] Kết nối `/api/chat` streaming
- [x] Rate-limit → UI "Hết lượt hôm nay"

**Acceptance Criteria:**
- [x] Gửi tin → nhận reply (canned responses theo regex + role)
- [x] Suggestion chips click → gửi luôn
- [x] Loading (typing) indicator rõ ràng
- [x] Real OpenAI streaming (khi có `OPENAI_API_KEY`)

---

#### [FE-07] Quiz UI ✅ Done (`/kiem-tra/[roleId]`)

**Mô tả:** Màn làm bài kiểm tra tình huống theo vai trò.

**Tasks:**
- [x] 3 câu hỏi MCQ + progress bar (câu x/3)
- [x] Chọn đáp án → highlight
- [x] Submit → ring score kết quả + feedback xanh/đỏ từng câu + giải thích
- [x] "Làm lại" và "Về lộ trình" button

**Acceptance Criteria:**
- [x] Câu hỏi đúng theo roleId
- [x] Kết quả đúng điểm + giải thích
- [x] Passed (≥70%) và Failed state khác nhau rõ

---

### 🔵 SPRINT 4 (Tuần 4–5): Progress + Polish + Event Tracking

---

#### [BE-08] Progress & Journal API ✅ Done

**Mô tả:** API tổng hợp tiến độ cá nhân + nhật ký "tiết kiệm giờ".

> [!IMPORTANT]
> Journal (US-04) là tính năng P1 theo PRD. FE đã có (1-tap), BE wire-up Supabase là Sprint 3.

**Tasks:**
- [x] `POST/GET /api/nhat-ky` — `time_logs` Supabase
- [x] Schema DB: `time_logs` (user_id, hours_saved, usefulness, note, logged_at) — migration `0001` đã có
- [x] Demo mode: ghi vào demo-storage localStorage

**Acceptance Criteria:**
- [x] Demo mode: ghi nhật ký → tổng giờ cập nhật ngay
- [x] Production: ghi `time_logs` Supabase

---

#### [FE-08] Progress Dashboard (Personal) ✅ Done (`/tien-bo`)

**Mô tả:** Màn tiến độ cá nhân tại `/tien-bo`.

**Tasks:**
- [x] Hero: tổng giờ tiết kiệm (số LỚN nổi bật)
- [x] 3 stat cards: % hoàn thành, điểm quiz TB, số module xong
- [x] Journal 1-tap: chips 0.5h / 1h / 2h / 4h + slider hữu ích 1–10 → toast + log
- [x] Lịch sử nhật ký dạng list
- [x] Empty state khi chưa có data

**Acceptance Criteria:**
- [x] Ghi nhật ký < 5 giây thao tác (1-chạm)
- [x] Tổng giờ cập nhật ngay sau ghi (optimistic)
- [x] Responsive

---

#### [FE-09] Navigation & Layout ✅ Done

**Mô tả:** Shell chung cho `(app)`.

**Tasks:**
- [x] Nav bottom (mobile) / side (desktop): Lộ trình, Trợ lý AI, Kiểm tra, Tiến bộ
- [x] Header: logo + tên user + badge role + logout button
- [x] Demo banner cam ở đầu khi demo mode
- [x] `proxy.ts` guard: chưa login → `/login`, chưa onboard → `/onboarding`
- [x] 404 page (`app/not-found.tsx`)
- [ ] Global loading state — TODO

---

#### [BE-09] Leads API ✅ Done

**Mô tả:** Lưu email pre-launch từ landing page; quản lý xem danh sách (triển khai sớm US-07).

**Tasks:**
- [x] `POST /api/leads` — validate email, rate-limit 10/giờ/IP, ghi `leads` Supabase
- [x] `GET /api/leads` — chỉ tài khoản quản lý; đọc `leads` qua service role (RLS không SELECT cho user)
- [x] Schema: `leads` (id, email, name, source, created_at)
- [x] UI `/quan-ly/leads` — bảng + lọc theo `source`

**Acceptance (bản sơ khai):**
- [x] Khách submit form landing → row mới trong `leads`
- [x] Login `quanly@…` → nav "Đăng ký" → thấy email đã thu
- [x] Nhân viên gọi `GET /api/leads` → 403

---

#### [BE-10] Seed Data & Demo Accounts ✅ Done (demo mode tự động)

**Mô tả:** Demo mode thay thế seed script — login bất kỳ email là có data demo.

**Tasks:**
- [x] Demo accounts: `nhanvien@congty.vn` (employee), `quanly@congty.vn` (manager)
- [x] Static content: 4 role × 6 module trong `lib/roles.ts`; team mock 12 NV trong `lib/team-data.ts`
- [ ] ~~`npm run seed`~~ → không cần, demo mode dùng localStorage

**Acceptance Criteria:**
- [x] Login `nhanvien@congty.vn` → onboarding → lộ trình đầy đủ
- [x] Login `quanly@congty.vn` → manager dashboard với mock data

---

#### [BE-11] Event Tracking API ✅ Done

**Mô tả:** Ghi sự kiện để đo KPI.

**Tasks:**
- [x] `POST /api/events` + migration `0003_events.sql`

**Events cần track:**
| Event | Khi nào | KPI liên quan |
|-------|---------|---------------|
| `onboarding_complete` | Sau onboarding xong | Activation ≥80% |
| `lesson_complete` | Đánh dấu hoàn thành | Completion rate |
| `tutor_message_sent` | Gửi tin cho AI Tutor | Activation tuần 1 |
| `quiz_submitted` | Submit quiz | Chứng minh hiệu quả |
| `quiz_passed` | Quiz ≥70% | Chứng minh hiệu quả |
| `journal_logged` | Ghi nhật ký giờ | ≥3 giờ/người/tuần |

**Acceptance Criteria:**
- [x] Events ghi DB với timestamp (khi Supabase có)
- [ ] Dashboard query KPI — GĐ2 / SQL thủ công

---

## Checklist MVP Done — Phase 1

> Đây là definition of done cho Phase 1. Tất cả items dưới đây phải pass trước khi demo.  
> **v1.4:** Đồng bộ checklist với code thực tế (09/06/2026).

### ✅ Core Flow
- [x] Đăng ký → onboarding → lộ trình (demo + Supabase)
- [x] Chọn role → lộ trình đúng vai trò
- [x] Mở module `/lo-trinh/[moduleId]` → đánh dấu hoàn thành → % cập nhật
- [x] AI Tutor OpenAI streaming (`/api/chat`)
- [x] Quiz + lưu `quiz_results` Supabase
- [x] Nhật ký giờ + `/tien-bo`
- [x] Login lại → `/lo-trinh` nếu đã onboard (`proxy.ts` + `profiles.role_id`)
- [x] `ai_level` lưu Supabase → skip module nhập môn

### ✅ Auth & Security
- [x] Supabase Auth + route guard + RLS
- [x] OpenAI key server-only

### ✅ Content & Data
- [x] 5 roles × 6 module (Supabase `learning_modules` + seed)
- [x] Quiz + starter kit đủ vai trò
- [x] Leads landing + quản lý xem `/quan-ly/leads`

### ⏳ Còn lại (ops / polish)
- [ ] **Deploy Vercel production** + env đầy đủ
- [ ] Chạy migration **0003, 0004, 0005** trên Supabase production
- [ ] `npm run seed:modules` trên prod
- [ ] Lighthouse < 3s (chưa đo)
- [ ] SEO OG image
- [ ] `loading.tsx` global
- [ ] Playwright e2e 3 luồng vàng (khuyến nghị)
- [ ] Test tự động rate-limit 31 lượt chat

---

## Phase 2 — Backlog (Sau Phase 1)

| ID | Tính năng | User Story |
|----|-----------|------------|
| GD2-01 | Dashboard quản lý đầy đủ (tiến độ đội thật, không mock) | US-07 |
| — | ~~Xem leads landing trong app~~ | ✅ Đã ship sớm GĐ1 (`/quan-ly/leads`) |
| GD2-02 | Quản lý nhân viên (HR add/manage accounts) | US-08 |
| GD2-03 | Công cụ AI gợi ý theo vai trò (nâng cao) | US-06 |
| GD2-04 | Thanh toán / subscription | — |
| GD2-05 | AI Agent tự thiết kế lộ trình | — |

---

## Ghi chú kỹ thuật

### Naming Convention
- Branch: `feat/[name]/[task-id]` — ví dụ: `feat/lucas/be-06-chat`
- Commit: conventional commit (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- File path convention: **App Router** → `app/` directory
- Route path: kebab-case tiếng Việt không dấu (`/lo-trinh`, `/tro-ly`, `/tien-bo`)
- Components: PascalCase tiếng Anh (`TroLyChat`, `LoTrinhContent`)
- Role/module id: kebab-case không dấu (`kinh-doanh`, `kinh-doanh-m1`)

### Password Validation (BE-01)
- Supabase Auth mặc định min 6 chars (cấu hình được)
- Phase 2: có thể thêm zxcvbn strength meter

---

## Thay đổi so với v1.1

> Ghi lại để bất kỳ ai đọc spec cũ biết điều gì đã thay đổi và tại sao.

| Thành phần | v1.1 (spec gốc) | v1.2 (thực tế) | Lý do thay đổi |
|---|---|---|---|
| Framework | Next.js 14 | **Next.js 16.2.7** | Latest Vercel template; Turbopack default; breaking changes documented |
| Auth | Custom JWT (jose + bcrypt) | **Supabase Auth** | Tích hợp sẵn với Postgres + RLS; không cần tự quản token |
| Middleware | `middleware.ts` | **`proxy.ts`** | Next 16 deprecated `middleware`, rename sang `proxy` |
| Database — auth | Bảng `users` (id, email, password_hash…) | **`auth.users`** (Supabase) + `profiles` | Supabase Auth quản lý auth.users; profiles là extension |
| Database — content | `learning_paths`, `modules`, `quiz_questions` | **Không có** — static trong `lib/roles.ts` | Rule-based, không thay đổi theo user; query không cần thiết |
| Database — journal | `journals` | **`time_logs`** | Tên rõ hơn; field `usefulness` (1–10) thay vì `usefulness_score` |
| Database — rate-limit | `user_tutor_usage` (date, count) | **`chat_usage`** (timestamp per call) | Append model dễ query "24h gần nhất" hơn daily aggregate |
| Route `/home` | `/home` | **`/lo-trinh`** | Tiếng Việt theo convention CLAUDE.md §15 |
| Route `/tutor` | `/tutor` | **`/tro-ly`** | Tiếng Việt |
| Route `/quiz/[id]` | `/quiz/:moduleId` | **`/kiem-tra/[roleId]`** | Quiz theo role, không theo module; Tiếng Việt |
| Route `/progress` | `/progress` | **`/tien-bo`** | Tiếng Việt |
| Lesson view | Trang `/lessons/[id]` riêng | **Modal** trong `/lo-trinh` | Giảm navigation overhead; UX gọn hơn |
| API `/api/tutor/chat` | `/api/tutor/chat` | **`/api/chat`** (TODO Sprint 3) | Path gọn hơn |
| Manager dashboard | Phase 2 (KHÔNG build GĐ1) | **Built as demo feature** ⚠ | Team build cho demo Sprint 2; cần quyết định scope cho production |
| Roles | 4 roles (sales, accounting, marketing, operations) | **4 roles (tiếng Việt)** + thiếu `khac` | Đổi sang kebab-case tiếng Việt; `khac` còn TODO |

---

*Spec này được tạo dựa trên PRD v1.0 và UI Flow diagram của Team 09*  
*Reviewed bởi PM Agent + Senior Engineer Agent*  
*v1.0: 08/06/2026 (khởi tạo)*  
*v1.1: 08/06/2026 (post-review — cập nhật password validation, error format)*  
*v1.2: 09/06/2026 (đồng bộ thực tế Sprint 2 — tech stack, schema, route paths, task status)*  
*v1.3: 09/06/2026 — US-07 bản sơ khai: `GET /api/leads` + `/quan-ly/leads`*  
*v1.4: 09/06/2026 — `proxy` onboarding guard, `profiles.ai_level`, sync checklist MVP*
