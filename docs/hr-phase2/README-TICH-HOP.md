# HR (Giai đoạn 2) — Hướng dẫn tích hợp

> Hai sản phẩm cho vai trò HR, viết đúng contract của repo để **đẩy trực tiếp**:
> 1. **Bài khảo sát chẩn đoán** hiện sau khi học viên chọn vai trò HR → Agent dựng lộ trình.
> 2. **Thư viện 56 bài học HR** (giải bài toán HR bằng **Claude Pro**) → Agent lọc ra lộ trình phù hợp.
>
> File code đã tạo, đã `tsc --noEmit` pass:
> - `src/frontend/lib/roles-hr.ts` — `HR_ROLE`, `HR_TASK_CATEGORIES`, `HR_SKILL_LABELS`
> - `src/frontend/lib/assessment-hr.ts` — `HR_ASSESSMENT_QUESTIONS`, `getAssessmentQuestionsForRole`, `extractHrSignals`

---

## 0. Khái niệm khớp nối: VOCAB CHUNG (điểm mấu chốt)

Khảo sát ↔ bài học ↔ Agent dùng chung **8 slug nhóm việc HR**. Học viên chọn slug ở câu "muốn AI hóa việc gì" → Agent match với `module.skills` để lọc bài.

| Slug | Nhóm việc |
|---|---|
| `hr-tuyen-dung` | Tuyển dụng & sàng lọc ứng viên |
| `hr-onboarding-ld` | Onboarding & Đào tạo (L&D) |
| `hr-cb-luong` | C&B, tính lương & phúc lợi |
| `hr-hieu-suat` | Đánh giá hiệu suất & KPI/OKR |
| `hr-quan-he-chinh-sach` | Quan hệ lao động & chính sách |
| `hr-hanh-chinh-ops` | HR Ops, hành chính & soạn thảo |
| `hr-phan-tich-du-lieu` | Phân tích dữ liệu HR & báo cáo |
| `hr-tu-dong-hoa` | Tự động hóa & năng suất |

(`hr-nen-tang` = track nền, `isFoundation: true`, tự vào mọi lộ trình.)

**Luồng:** `q3hr-tasks` (slug học viên chọn) → `dailyTasks`/`goalTags` → Agent so với `module.skills` → chọn 8–10 bài + bài foundation. 56 bài là "kho", Agent chỉ lấy phần hợp.

---

## 1. Bật THƯ VIỆN BÀI HỌC (vai trò `nhan-su`)

**B1 — `src/frontend/lib/roles.ts`:** thêm import + 1 entry vào `ROLES`.

```ts
import { HR_ROLE, HR_SKILL_LABELS } from "./roles-hr";

export const SKILL_LABELS: Record<string, string> = {
  // ...giữ nguyên...
  ...HR_SKILL_LABELS, // (tùy chọn) để builder hiển thị nhãn skill HR
};

export const ROLES: Record<string, Role> = {
  "kinh-doanh": { /* ... */ },
  // ...
  "nhan-su": HR_ROLE, // 👈 thêm dòng này
};
```
→ `LEARNING_MODULES` (learning-modules-data.ts) **tự sinh** 56 bài HR. Thẻ vai trò HR cũng **tự xuất hiện** ở màn chọn vai trò (ROLE_LIST).

**B2 — `src/frontend/lib/openai.ts`:** `RoleId` là union đóng + `ROLE_LABEL` exhaustive → phải thêm HR.

```ts
export type RoleId =
  | "kinh-doanh" | "ke-toan" | "marketing" | "van-hanh" | "khac"
  | "nhan-su"; // 👈

export const ROLE_LABEL: Record<RoleId, string> = {
  // ...
  "nhan-su": "Nhân viên nhân sự (HR)", // 👈
};
```
`buildSystemPrompt` dùng `ROLE_LABEL[roleId]` nên trợ lý AI tự nói đúng vai trò. (Tùy chọn: thêm 1 entry HR vào `QUESTION_CACHE` để cache câu hỏi phổ biến.)

**B3 — DB (Supabase):** ràng buộc `role_id` đang chặn `nhan-su`. Tạo migration mới:

```sql
-- supabase/migrations/2026XXXX_hr_role.sql
alter table public.profiles drop constraint if exists profiles_role_id_check;
alter table public.profiles add constraint profiles_role_id_check
  check (role_id in ('kinh-doanh','ke-toan','marketing','van-hanh','khac','nhan-su'));
```

**B4 — Seed bảng `learning_modules` (chỉ khi chạy chế độ Supabase thật):**
`learning-modules.ts` đọc bài từ bảng `learning_modules`; demo mode dùng `LEARNING_MODULES` tĩnh. Để bài HR lên prod, seed lại bảng từ `LEARNING_MODULES` (chạy script seed module hiện có trong `scripts/`, hoặc insert 56 record `role_id = 'nhan-su'`).

> ✅ Sau B1–B2 là **chạy được ngay ở demo mode** (chọn HR → 56 bài hiện trong `/lo-trinh`). B3–B4 cần cho production có Supabase.

---

## 2. Bật BÀI KHẢO SÁT HR (sau khi chọn vai trò HR)

File `assessment-hr.ts` đã có sẵn câu hỏi + helper. Chỉ cần để onboarding render theo vai trò và lưu tín hiệu.

**B1 — `src/frontend/components/onboarding-flow.tsx`:** thay `ASSESSMENT_QUESTIONS` cố định bằng bộ theo vai trò.

```ts
import { getAssessmentQuestionsForRole, extractHrSignals } from "@/lib/assessment-hr";

// trong component, sau khi có roleId:
const includeFreeText = false; // đặt true nếu đã thêm nhánh textarea ở B3
const questions = useMemo(
  () => getAssessmentQuestionsForRole(roleId, includeFreeText),
  [roleId],
);
```
Rồi đổi mọi `ASSESSMENT_QUESTIONS` trong bước assessment & result thành `questions`
(`questions[questionIdx]`, `questions.length`, và mảng `assessmentAnswers`).

**B2 — Lưu tín hiệu HR cho Agent (trong `finishAssessment`):**

```ts
const result = calculateResult(assessmentAnswers);
const hrSignals = roleId === "nhan-su" ? extractHrSignals(assessmentAnswers) : null;

const profile = {
  roleId,
  assessment: result,
  // dùng task HR làm dailyTasks/goalTags cho Agent:
  dailyTasks: hrSignals ? hrSignals.tasks : result.dailyTasks,
  learningProfile: { preferredAddress, ...(hrSignals ? { hrSignals } : {}) },
  createdAt: new Date().toISOString(),
};
```
`profile.learningProfile` lưu vào cột `profiles.learning_profile` (jsonb, đã có) và `dailyTasks` vào `profiles.daily_tasks` (đã có) → **không cần migration cho khảo sát.**

**B3 (TÙY CHỌN) — hiện câu mô tả tự do `q-hr-recurring` (free-text):**
UI `StepAssessment` hiện chỉ render likert + multi-chip. Thêm 1 nhánh:

```tsx
{question.type === "free-text" && (
  <textarea
    className="mt-6 w-full rounded-2xl border-2 border-line bg-card p-4 text-sm"
    rows={4}
    placeholder="Nhập mô tả… (không bắt buộc)"
    value={typeof value === "string" ? value : ""}
    onChange={(e) => onAnswer(e.target.value)}
  />
)}
```
Và cho phép bỏ qua (free-text không bắt buộc):
```ts
const canProceed =
  question.type === "free-text" ||
  (value !== undefined && (Array.isArray(value) ? value.length > 0 : value.length > 0));
```
Nếu **không** làm B3 → giữ `includeFreeText = false` (câu mô tả tự do bị loại khỏi luồng UI, vẫn dùng được khi thu offline — xem `HR-KHAO-SAT.md`).

**B4 (TÙY CHỌN) — `src/frontend/lib/assessment.ts`:** nếu muốn `calculateResult` tự gom task HR vào `dailyTasks` (thay vì B2), thêm trong vòng lặp multi-chip:
```ts
if (question.id === "q3hr-tasks") dailyTasks = answer.value;
```
`aiLevel` không bị lệch: chỉ q1/q4/q5/q6 + `q-hr-subfunction` (1đ) + `q3hr-tasks` (≤5đ) đóng góp điểm; các câu bối cảnh HR khác `score: 0`.

---

## 3. Agent dùng tín hiệu khảo sát thế nào

`extractHrSignals(answers)` trả về:

```ts
{
  subFunction,        // mảng HR chính (vd 'tuyen-dung') → nhấn track tương ứng
  companySize,        // lt50 | 50-100 | 100-200 | gt200
  tasks,              // slug việc muốn AI hóa → goalTags (join module.skills)
  priorityTask,       // slug ưu tiên #1 → đặt bài liên quan lên đầu
  dataSensitivity,    // thuong-xuyen|... → thêm bài an toàn dữ liệu nếu cao
  recurringTaskText,  // mô tả tự do → ngữ cảnh phong phú cho prompt Agent
}
```
Gợi ý ghép lộ trình: **foundation (m1–m6)** → bài thuộc `priorityTask` → bài thuộc các `tasks` còn lại, lọc theo `aiLevel` (level ≤ aiLevel+1). Recommender deterministic (`lib/agents/recommender.ts`) match `goalTags` ↔ `module.goalTags`; nếu dùng nó, map `module.skills` → `goalTags` ở adapter.

---

## 4. An toàn dữ liệu nhân sự (bắt buộc nhắc học viên)

HR giữ dữ liệu nhạy cảm nhất công ty. Bài `nhan-su-m4` dạy chuẩn ẩn danh; trợ lý cần cảnh báo khi phát hiện PII (đã có cơ chế `chat-prompt-safety.ts` trong repo). Không log nội dung chat nhạy cảm. Văn bản pháp lý/kỷ luật/HĐLĐ: Claude làm nháp, người có thẩm quyền duyệt.

---

## 5. Checklist đẩy

- [ ] B1.1 thêm `HR_ROLE` vào `ROLES` (+ `HR_SKILL_LABELS` tùy chọn)
- [ ] B1.2 thêm `nhan-su` vào `RoleId` + `ROLE_LABEL`
- [ ] B1.3 migration mở `role_id` cho `nhan-su`
- [ ] B1.4 seed `learning_modules` (prod)
- [ ] B2.1 onboarding render `getAssessmentQuestionsForRole(roleId)`
- [ ] B2.2 lưu `hrSignals` + `dailyTasks`
- [ ] (tùy chọn) B2.3 nhánh textarea free-text
- [ ] `npm run lint && npm run build` xanh trước khi merge (theo `.agents/rules/agent-workflow.md`)
