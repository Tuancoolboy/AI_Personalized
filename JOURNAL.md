# JOURNAL — Team 9

> Weekly learning journal. Update bắt buộc trước mỗi PR.
> Format mỗi entry: features đã ship, AI tool đã dùng, vấn đề khó nhất tuần, plan tuần tới.

---

## Sprint 0 — Tuần khởi động (24/05/2026 - 31/05/2026)

### Mục tiêu tuần

Khởi động dự án: chọn nhóm đề tài, shortlist hướng sản phẩm, nghiên cứu ban đầu và setup hạ tầng GitHub.

### Đã hoàn thành

1. Rà soát ngân hàng đề và chọn nhóm **AI Literacy (081-091)**.
2. Shortlist các hướng ban đầu trong nhóm AI Literacy:
   - AI20K-084 — Competency Assessment
   - AI20K-086 — Use Case Discovery
   - AI20K-089 — AI Automation Learning
3. Setup repo official `C2-App-009`.
4. Cài AI logging hook và khởi tạo bộ tài liệu `README.md`, `JOURNAL.md`, `WORKLOG.md`.

### Ghi chú quan trọng

Tại Sprint 0, AI20K-089 từng là candidate ưu tiên ban đầu vì demo automation workflow có vẻ thuyết phục. Tuy nhiên đây chưa phải quyết định cuối. Quyết định chính thức được chốt sau đó vào ngày 04/06/2026.

### AI tools đã dùng

| Tool | Mục đích | Ghi chú |
|---|---|---|
| Claude Code | Phân tích đề, soạn tài liệu, tổ chức decision log | Hiệu quả khi có context và tiêu chí rõ |
| ChatGPT | Đối chiếu nhanh ý tưởng và market framing | Cần kiểm tra lại số liệu/claim quan trọng |

### Bài học tuần

- Không nên xem shortlist ban đầu là quyết định cuối.
- Với dự án build ngắn, scope kỹ thuật phải được cân nhắc ngang với độ hấp dẫn khi demo.
- Decision log nên giữ lại lịch sử thay đổi hướng thay vì rewrite toàn bộ.

---

## Sprint 1 — Chốt đề và lập kế hoạch (01/06/2026 - 08/06/2026)

### 04/06/2026 — Chốt đề tài

Team chốt đề tài chính thức:

> **AI20K-083 — AI Trợ Lý Phổ Cập Kiến Thức AI Nền Tảng Cho Nhân Viên**

### Cơ sở quyết định

Tài liệu "Dự án 1 - AI Trợ Lý Phổ Cập Kiến Thức AI Nền Tảng Cho Nhân Viên" xác định rõ:

| Thành phần | Nội dung |
|---|---|
| Khách hàng | Nhân viên tại doanh nghiệp 10-200 người, nhiều phòng ban, không cần nền tảng kỹ thuật |
| Vấn đề | Muốn dùng AI nhưng không biết bắt đầu, không biết dùng đúng và tránh rủi ro |
| Kết quả | Hiểu AI hỗ trợ công việc ở đâu, áp dụng được trong tuần đầu |
| Cách tiếp cận | Web app có lộ trình học cá nhân hóa theo vai trò, AI tutor, bài kiểm tra tình huống |
| Giá dự kiến | 300.000 VNĐ/user/tháng hoặc 2.000.000 VNĐ/tháng cho 10 users |

### Top 3 tính năng phải có

1. Lộ trình học cá nhân hóa theo vai trò.
2. Trợ lý AI trong web app giải thích bằng ví dụ đúng công việc.
3. Bài kiểm tra tình huống thực tế và dashboard tiến bộ toàn đội.

### 05/06/2026 — Chốt kế hoạch làm việc

Team thống nhất kế hoạch triển khai:

| Task | Owner tạm thời | Deadline | Artifact |
|---|---|---|---|
| Persona + user journey | Lucas | 07/06 | `docs/product/user-journey.md` |
| Lesson/content outline | Tuancoolboy | 07/06 | `docs/content-outline.md` |
| Wireframe notes | Tuancoolboy | 07/06 | `docs/wireframe-notes.md` |
| Data model + AI flow | minhhai203 | 07/06 | `docs/data-and-ai-flow.md` |
| Tech stack decision | minhhai203 | 07/06 | `docs/tech-stack.md` |
| Demo plan | Cả team | 08/06 | `planning/demo/demo-plan.md` |

### 06/06/2026 — Cập nhật documentation

Mục tiêu trong ngày:

- Cập nhật `README.md` theo đề tài AI20K-083.
- Cập nhật `WORKLOG.md` để ghi rõ quyết định ngày 04/06 và kế hoạch ngày 05/06.
- Cập nhật `JOURNAL.md` theo flow từng ngày.
- Thêm tài liệu tóm tắt trong `docs/` để team mới đọc nhanh.

### Đã hoàn thành trong Sprint 1

1. Chốt đề tài chính thức AI20K-083 ngày 04/06/2026.
2. Chốt feature/MVP scope và track làm việc ngày 05/06/2026.
3. Cập nhật docs ngày 06/06/2026 để phản ánh đúng flow quyết định, không rewrite lịch sử Sprint 0.

### AI tools đã dùng

| Tool | Mục đích | Ghi chú |
|---|---|---|
| Codex | Đọc tài liệu `.docx`, cập nhật README/JOURNAL/WORKLOG/docs theo timeline | Hữu ích cho việc giữ consistency giữa nhiều file |
| Subagents | Review chéo từ góc giám khảo và dev teammate | Bắt được thiếu audit trail, action plan và DoD |

### Vấn đề khó nhất

Khó nhất là cập nhật từ AI20K-089 sang AI20K-083 mà không làm docs giống như team đã chọn 083 ngay từ đầu. Cách xử lý là giữ lại mốc Sprint 0, đánh dấu quyết định cũ là `Superseded`, rồi thêm mốc 04/06 giải thích vì sao 083 thắng shortlist cũ.

### Plan tiếp theo

| Ngày | Mục tiêu |
|---|---|
| 07/06 | Hoàn thiện user journey, wireframe và data model |
| 07/06 | Chốt tech stack trước khi scaffold |
| 08/06 | Scaffold code MVP |
| Sprint 2 | Build core flow: login, onboarding, learning path, lesson, tutor, quiz, dashboard |

---

## Sprint 2b — Deploy demo production (10/06/2026)

### Đã hoàn thành

1. **Vercel production live:** `https://c2-app-009.vercel.app` — deploy CLI (`vercel --prod`), env Supabase + OpenAI trên Vercel Production.
2. **Tắt Vercel Deployment Protection (SSO)** — visitor không còn bị chặn bởi màn "Log in to Vercel".
3. **Supabase demo users:** script SQL thủ công cho admin (`admin@`/`quanly@`) và guest (`role_id` NULL → onboarding).
4. **Landing polish:** headline ngắt dòng `Tại sao khóa đào tạo AI cũ` / `không hiệu quả?` — commit `ae1845c`, push `develop`.

### Vấn đề khó nhất

- **Hai production URL** (`ai-tro-ly.vercel.app` vs `c2-app-009.vercel.app`) trỏ khác deployment sau rename project → UI không cập nhật dù deploy thành công. Fix: `vercel alias set <latest-deployment> c2-app-009.vercel.app` sau mỗi prod deploy.
- Nhầm **Vercel auth** với **Supabase session** khi debug guest auto-login.

### Bài học

- Chỉ share **một URL production** (`c2-app-009.vercel.app`).
- Sau `vercel --prod`, luôn kiểm tra `vercel alias list`.
- Demo công khai = tắt SSO protection; auth app vẫn qua `/login`.

---

## Sprint 2 — Scaffold MVP web app (08/06/2026 - 09/06/2026)

### Mục tiêu tuần

Chuyển từ phase plan sang phase code: scaffold Next.js app, ship full MVP feature set chạy được local (không phụ thuộc Supabase/OpenAI infra), sẵn sàng demo và wire-up backend ở sprint sau.

### Đã hoàn thành

1. **Tech stack chốt:** Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui + recharts + Supabase + OpenAI. Đã ghi `docs/tech-stack.md`.
2. **Init Next.js** trong path có dấu tiếng Việt (workaround: subfolder rồi move).
3. **Landing page `/`** thu lead — hero + 3 trụ cột + form email → `/api/leads`.
4. **Auth** với Supabase Auth + **demo mode** bypass khi chưa cấu hình env (login với email bất kỳ).
5. **Onboarding 4 bước:** chọn vai trò → trang giải thích lý do làm test → 6 câu assessment (likert + multi-chip) → kết quả với ring score 0-5 + breakdown lộ trình. User trên 5 điểm auto skip 2 module nhập môn.
6. **/lo-trinh:** hero progress ring + 3 starter prompts (button Copy) + 4 công cụ AI + 6 module timeline với modal chi tiết + đánh dấu hoàn thành.
7. **/tro-ly chat AI:** suggestion chips theo role + canned responses thông minh + safety check khi paste data nhạy cảm (số điện thoại, tài khoản).
8. **/kiem-tra:** quiz 3 câu tình huống × 4 role + feedback xanh/đỏ + ring score kết quả.
9. **/tien-bo:** hero tổng giờ tiết kiệm + 3 stat cards + ghi nhật ký 1-chạm (chip 0.5h/1h/2h/4h) + slider hữu ích + log history.
10. **Manager mode:** detect qua email pattern (quanly@, manager@, hr@, admin@) → bypass onboarding → `/quan-ly` dashboard với 4 stat cards + bar/donut/line charts (recharts) + leaderboard top 6. `/quan-ly/nhan-vien` với filter chip theo phòng ban + modal thêm nhân viên.
11. **Schema Supabase** (`supabase/migrations/0001_init.sql`): 6 bảng (profiles, module_progress, quiz_results, time_logs, chat_usage, leads) + RLS policies idempotent. Đã validate syntax bằng pg-query-emscripten.
12. **Design system:** warm cream `#FAF6EF` + deep forest green `#15463B` + terracotta `#DB6E4C`. Font Bricolage Grotesque (display) + Be Vietnam Pro (body). Tham khảo prototype HTML.

### Vấn đề khó nhất tuần

**Next.js 16 breaking changes** so với training data của Claude:
- `middleware.ts` deprecated → đổi sang `proxy.ts` + export `proxy(request)` (đọc `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` để verify).
- `useSearchParams()` cần wrap Suspense boundary cho client component.
- `@tailwindcss/postcss` thay cho `tailwind.config.js` của v3.
- Path có dấu tiếng Việt làm `npx create-next-app .` fail vì npm name validation.

Đã workaround từng cái + ghi trong `docs/tech-stack.md`.

### AI tools đã dùng

| Tool | Mục đích | Ghi chú |
|---|---|---|
| Claude Code | Scaffold app, viết toàn bộ component, debug Next 16 breaking changes | Hiệu quả khi có CLAUDE.md định hướng rõ. Mỗi phase test ≥2 lần qua Chrome MCP. |
| Chrome MCP (claude-in-chrome) | Verify UI thực tế sau mỗi phase: screenshot landing → onboarding → lo-trinh → tro-ly → kiem-tra → tien-bo → quan-ly | Catch được bug event.currentTarget null sau await (React 19 sync nullify), CSS variables không apply do Turbopack cache, login form stuck "Đang đăng nhập..." khi env thiếu. |
| pg-query-emscripten (Postgres parser) | Validate syntax SQL migration trước khi commit | Parse 45 statements clean — 6 CREATE TABLE / 6 ALTER ENABLE RLS / 13 CREATE POLICY |

### Bài học tuần

- **Tự test ≥2 lần qua browser sau mỗi phase** giúp catch bug client-only (cookie blocked, HMR stale, layout vỡ mobile) mà build pass không thấy.
- **Demo mode** (localStorage fallback khi env thiếu) cực kỳ giá trị — cho phép demo full flow cho thầy mà chưa cần setup Supabase project. Sau này wire-up backend chỉ cần điền env, không phải viết lại logic.
- **Next 16 chưa quen** — phải đọc `node_modules/next/dist/docs/` trước khi viết Next API mới thay vì tin training data.
- **Path có dấu tiếng Việt** gây nhiều bug bất ngờ (npm name, Windows resize_window) — chú ý khi onboard thành viên mới về repo này.

### Plan Sprint 3

1. Setup Supabase project chính thức (team account) + chạy migration `0001_init.sql`.
2. Wire-up `/api/chat` real với OpenAI `gpt-4o-mini` + rate-limit 30/ngày qua bảng `chat_usage`.
3. Replace localStorage paths bằng Supabase query (Server Components đọc qua RLS).
4. Deploy Vercel preview + smoke test full flow production.
5. Bổ sung 1 vai trò "Khác" (theo CLAUDE.md §7) nếu thầy thấy cần.
6. Content review: cùng Tuancoolboy rà nội dung 24 module + 12 quiz để chốt giọng văn.
