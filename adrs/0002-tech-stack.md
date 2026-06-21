# Tech Stack — Team 9 / AI20K-083

> Quyết định cuối: 08/06/2026. Owner: Lucas (đã scaffold). Phù hợp deadline track 07/06 trong README.

## Stack đã chốt

| Lớp | Công nghệ | Lý do chọn |
|---|---|---|
| **Framework** | Next.js 16.2.7 (App Router) | SSR + Route Handler sẵn cho /api/chat tutor, deploy 1-click Vercel. ⚠ Có breaking changes so với Next 14 — đã đọc `node_modules/next/dist/docs/`. |
| **Ngôn ngữ** | TypeScript 5 | Strict mode cho data model phức tạp (roles, modules, assessment) |
| **UI runtime** | React 19 | Suspense + Server Components — login form đã wrap Suspense cho `useSearchParams()` |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/postcss`) | Không còn `tailwind.config.js` như v3. Tokens trong `app/globals.css`. |
| **Component** | shadcn/ui (preset `base-nova`) | Click cài lẻ component. Đã add: button, input, card, label. |
| **Typography** | Bricolage Grotesque (display) · Be Vietnam Pro (body) | Đẹp + đầy đủ Vietnamese diacritics |
| **Charts** | recharts | React-friendly, gọn (~92KB gzip). Dùng cho `/quan-ly` dashboard: BarChart / PieChart / LineChart. |
| **Auth + DB** | Supabase (Postgres + Auth + RLS) qua `@supabase/ssr` | Free tier đủ cho MVP. Schema 6 bảng trong `supabase/migrations/0001_init.sql`. RLS strict: user chỉ đọc dữ liệu của mình. |
| **LLM tutor** | OpenAI `gpt-4o-mini` | Giá ~22.000đ/người/tháng đạt mức biên gộp ghế nền 100k/user. Demo mode đang dùng canned responses (`lib/tro-ly-canned-responses.ts`); switch sang real OpenAI khi có key. |
| **Storage demo** | localStorage (`lib/demo-storage.ts`) | Khi chưa cấu hình Supabase → full app chạy local. Khi env có Supabase → fall back tự động sang DB thật. |
| **Deploy** | Vercel | Free hobby tier đủ cho team, auto-preview mỗi PR |

## Quyết định kèm theo

- **Path dấu tiếng Việt:** `D:\Dự án Vin Thực Chiến` khiến `npx create-next-app .` reject (npm name không chấp nhận dấu). Đã workaround: init vào subfolder `ai-tro-ly-init` → move contents lên root → rename `package.json > name = "ai-tro-ly"`.
- **`middleware.ts` deprecated trong Next 16** → đổi sang `proxy.ts` + export `proxy(request)` thay vì `middleware(request)`. Có cảnh báo trong dev log nhắc.
- **Demo mode:** detect Supabase env qua `lib/supabase/is-configured.ts`. Khi thiếu env → bypass auth + dùng localStorage + canned responses. Banner cam trong `(app)/layout` báo cho user biết.
- **Role detection:** demo mode detect manager qua email pattern (`quanly@`, `manager@`, `hr@`, `admin@`). Khi có Supabase thật → load từ `profiles.user_type`.

## Files quan trọng

| File | Vai trò |
|---|---|
| `app/(app)/layout.tsx` | Server-check auth, branch nav theo userType, render demo banner |
| `proxy.ts` | Bảo vệ `(app)` routes, refresh Supabase session, redirect login khi chưa auth |
| `lib/roles.ts` | Template 4 vai trò × 6 module × 3 prompt × 4 tool × 3 quiz (heart of product) |
| `lib/assessment.ts` | Logic 6-câu test + scoring 0-30 → AI level 0-5 |
| `lib/team-data.ts` | Mock 12 nhân viên + aggregation stats cho dashboard manager |
| `supabase/migrations/0001_init.sql` | Schema 6 bảng + RLS policies (idempotent) |

## Tuần tới (Sprint 3)

- Wire-up real Supabase: chạy migration trên project Vercel hoặc local
- Wire-up `/api/chat` thật với OpenAI `gpt-4o-mini` + rate-limit 30/ngày
- Deploy Vercel + smoke test full flow production
- Replace localStorage paths bằng Supabase query khi env có sẵn

## Open questions

- Khi nào setup Supabase project chính thức (team account vs cá nhân Lucas)?
- OpenAI key dùng chung team hay mỗi người tự cấp?
