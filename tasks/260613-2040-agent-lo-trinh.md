# Plan — Agent sinh lộ trình khóa học cá nhân hóa (2 luồng, OpenAI thật)

> Branch tách từ nhánh hiện tại `feature/ux-3-changes` (đã có builder + kho module + nền §0.2).
> Nhánh mới: `feat/agent-lo-trinh`. KHÔNG merge giúp. KHÔNG commit `.env`.

## Quyết định đã chốt (user duyệt)
1. **Phân luồng:** suy từ `organization_members` (server-side). Có membership → `company`; không → `individual`. KHÔNG thêm cột `account_type`.
2. **Cache:** lưu lộ trình theo `user_id` + `input_fingerprint` (hash của: skills + level + danh sách module hoàn thành). Gọi lại OpenAI chỉ khi fingerprint đổi đáng kể hoặc bấm "Cập nhật lộ trình". Real → DB; demo → localStorage.
3. **Đầu vào level:** tái dùng `assessment` (aiLevel 0-5 + position + dailyTasks). Không xây bài test mới.

## Kiến trúc & luồng dữ liệu

```
Client (trang lộ trình / sau khi làm test)
  └─ POST /api/agent/lo-trinh  { progressModuleIds[], forceRefresh? }
        │  (KHÔNG gửi skills/level từ client — server tự resolve, chống giả mạo)
        ▼
  Server route (Next App Router, runtime nodejs)
    1. Auth user (supabase server client). Chưa auth → 401.
    2. resolveFlowInput(user):
         - company: org membership → member_positions → position_skills → skill slugs
                    + organizations.ai_tool (tool chính)
         - individual: profiles.role_id (vị trí) + assessment (level, dailyTasks)
                    + individualToolSuggest(roleId)  (lib mới)
    3. computeFingerprint(input + progress). Nếu cache khớp & !forceRefresh → trả cache (KHÔNG gọi OpenAI).
    4. Build candidate pool = module hợp lệ từ kho (LEARNING_MODULES) lọc theo skills/role + level.
       Gửi lên OpenAI CHỈ metadata: { id, title, level, skill, isFoundation } + input (skills/level/vị trí/progress ids).
    5. OpenAI chat.completions, temperature 0.2, response_format json_object.
    6. JSON.parse trong try/catch → validate: mọi id phải ∈ pool; loại id bịa; ưu tiên Nền tảng; cap 8–10 bài;
       bỏ bài đã hoàn thành; skip level-1 nếu aiLevel cao. Kỹ năng không có bài → ghi "chưa có bài cho [kỹ năng]".
    7. Lỗi/parse fail/thiếu key → FALLBACK builder rule-based hiện có
         (company: composePathFromSkills; individual: getLearningModulesByRole).
    8. Lưu cache (DB/localStorage) + ghi audit log (input + output, KHÔNG có tên/email).
    9. Trả structured JSON cho client render.
```

## Output JSON (Agent → client)
```ts
type AgentPathResult = {
  source: "agent" | "fallback";        // để UI/eval biết nguồn
  flow: "company" | "individual";
  summary: string;                      // tóm tắt lộ trình (tiếng Việt)
  groups: {                             // nhóm bài + lý do
    title: string;                      // vd "Nền tảng", "Kỹ năng: Lọc CV"
    reason: string;
    moduleIds: string[];                // đã validate ∈ kho
  }[];
  orderedModuleIds: string[];           // thứ tự học cuối cùng (cap 8–10)
  missingSkills: string[];              // kỹ năng chưa có bài
  fingerprint: string;
};
```

## Files

### Tạo mới
- `app/api/agent/lo-trinh/route.ts` — route handler (mỏng, gọi lib bên dưới). `runtime = "nodejs"`.
- `lib/agent/path-agent.ts` — gọi OpenAI + build prompt + parse. < 200 dòng.
- `lib/agent/path-agent-validate.ts` — validate id ∈ kho, cap, ưu tiên Nền tảng, lọc level/progress, missingSkills.
- `lib/agent/path-agent-input.ts` — `resolveFlowInput()` (company/individual) + `computeFingerprint()`.
- `lib/agent/path-agent-fallback.ts` — gọi builder rule-based hiện có, map ra `AgentPathResult`.
- `lib/agent/path-agent-cache.ts` — đọc/ghi cache (DB qua service client; demo localStorage helper client-side).
- `lib/individual-tool-suggest.ts` — gợi ý công cụ AI theo vị trí (rule-based, dùng AI_TOOLS sẵn có).
- `lib/agent/path-agent-types.ts` — types dùng chung (`AgentPathResult`, `AgentFlowInput`).
- `supabase/migrations/0018_generated_learning_paths.sql` — bảng `generated_learning_paths`
  (`id, user_id, fingerprint, flow, result jsonb, source, created_at`) + RLS (user đọc của mình; service ghi)
  + `agent_path_logs` (audit: input jsonb metadata-only, output jsonb, created_at — không PII).
- Tests:
  - `lib/agent/path-agent-validate.test.ts` — loại id bịa, cap 8–10, ưu tiên Nền tảng, bỏ bài hoàn thành, skip level-1.
  - `lib/agent/path-agent-input.test.ts` — map input company vs individual + fingerprint ổn định.
  - `lib/individual-tool-suggest.test.ts` — gợi ý đúng theo vị trí + fallback.

### Sửa
- `app/(app)/lo-trinh/` (hoặc component render): thêm nút "Cập nhật lộ trình" + hiển thị lộ trình Agent (badge "AI" vs "Rule-based"), nhóm + lý do, `missingSkills`. Gọi API 1 lần (cache), không mỗi lần mở trang.
- `.env.example`: bảo đảm có `OPENAI_API_KEY`, `OPENAI_MODEL` (đã có per CLAUDE.md §16 — chỉ kiểm tra).

## An toàn (goal §7)
- Key chỉ ở server route. Client KHÔNG gửi skills/level (server resolve) → chống giả mạo + không lộ.
- Gửi OpenAI CHỈ metadata bài + slug kỹ năng + level + vị trí + progress ids. KHÔNG tên/email/dữ liệu công ty mật.
- `JSON.parse` trong try/catch; validate id; fallback builder khi lỗi/thiếu key → demo không crash.
- Audit log metadata-only (eval/bằng chứng).

## Chi phí & hiệu năng (goal §6)
- Cache theo fingerprint → 1 lần sinh/đầu vào. `temperature: 0.2` cho ổn định.
- Candidate pool nhỏ (đã lọc) → prompt ngắn, rẻ. Model `gpt-4o-mini` (env).

## Todo
- [ ] `git checkout -b feat/agent-lo-trinh` từ `feature/ux-3-changes`
- [ ] Types + `individual-tool-suggest.ts` + tests
- [ ] `path-agent-input.ts` (resolve 2 luồng + fingerprint) + test
- [ ] `path-agent-validate.ts` + test
- [ ] `path-agent.ts` (OpenAI call + prompt) + `path-agent-fallback.ts`
- [ ] `path-agent-cache.ts` + migration 0018
- [ ] route `/api/agent/lo-trinh`
- [ ] UI: nút "Cập nhật lộ trình" + render nhóm/lý do/missing
- [ ] `npm run lint && npm run test && npm run build` (Node 20) pass
- [ ] Cập nhật `WORKLOG.md` + `specs/PROJECT-CONTINUATION.md`; báo tóm tắt + cách chạy thử

## Success criteria
- Company & individual đều ra lộ trình hợp lệ (id ∈ kho), ≤10 bài, Nền tảng trước, tôn trọng level + progress.
- Thiếu key/Agent lỗi → fallback builder, không crash.
- Không gọi OpenAI khi mở lại trang (cache hit). Bấm "Cập nhật lộ trình" → sinh lại.
- lint/test/build pass; không commit secret; không mở rộng GĐ2–3 ngoài phạm vi.

## Unresolved
- Bảng `skills` (0014) khóa bằng uuid+slug; cần xác nhận seed slug khớp `roles.ts` khi map `position_skills → modules` ở real mode (demo dùng slug trực tiếp). Sẽ verify khi code; nếu lệch → map qua bảng `skills.slug`.
