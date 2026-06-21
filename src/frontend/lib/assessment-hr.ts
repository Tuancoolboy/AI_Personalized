// ============================================================================
// BÀI KHẢO SÁT CHẨN ĐOÁN HR (Giai đoạn 2) — hiển thị SAU khi chọn vai trò "nhan-su"
// ----------------------------------------------------------------------------
// Mục đích: hiểu rõ từng học viên đang làm gì + muốn AI hóa việc nào, để AGENT
// dựng lộ trình học sát nhất. Câu hỏi cốt lõi (q3hr-tasks) cho học viên chọn các
// SLUG NHÓM VIỆC trùng với `skills` của bài học (roles-hr.ts) → Agent join để lọc.
//
// Tương thích hệ thống Phase 1:
//  - Chỉ dùng type "likert" | "multi-chip" (UI onboarding hỗ trợ sẵn).
//    Câu "free-text" (q-hr-recurring) là TÙY CHỌN, cần thêm 1 nhánh textarea
//    vào StepAssessment — xem docs/hr-phase2/README-TICH-HOP.md.
//  - Điểm (score) được canh để aiLevel vẫn tính đúng như 6 câu gốc: chỉ
//    q1/q4/q5/q6 + subfunction (1đ) + tasks (≤5đ) đóng góp điểm; các câu bối
//    cảnh HR khác score 0 nên KHÔNG làm lệch aiLevel.
//
// CÁCH DÙNG: thay vì render thẳng ASSESSMENT_QUESTIONS, gọi
//   getAssessmentQuestionsForRole(roleId)
// và sau khi xong gọi extractHrSignals(answers) để lấy tín hiệu cho Agent.
// ============================================================================

import {
  ASSESSMENT_QUESTIONS,
  type AssessmentAnswer,
  type AssessmentQuestion,
} from "./assessment";
import { HR_TASK_CATEGORIES } from "./roles-hr";

export const HR_ROLE_ID = "nhan-su";

// --- Câu hỏi đặc thù HR (roleFilter: nhan-su) --------------------------------
export const HR_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q-hr-subfunction",
    title: "Mảng HR chính của bạn hiện tại là gì?",
    helper: "Chọn 1 mô tả gần nhất — để lộ trình ưu tiên đúng nghiệp vụ của bạn.",
    type: "likert",
    roleFilter: [HR_ROLE_ID],
    options: [
      { value: "tuyen-dung", label: "Tuyển dụng (Recruiter / TA)", score: 1 },
      { value: "tong-hop", label: "HR Generalist (làm nhiều mảng)", score: 1 },
      { value: "cb-luong", label: "C&B / Tính lương", score: 1 },
      { value: "ld-dao-tao", label: "Đào tạo / L&D / Trainer", score: 1 },
      { value: "hrbp-quan-ly", label: "HRBP / Quản lý / Giám đốc nhân sự", score: 1 },
      { value: "hanh-chinh", label: "Hành chính nhân sự / HR Ops", score: 1 },
    ],
  },
  {
    id: "q-hr-company-size",
    title: "Công ty bạn đang làm có quy mô bao nhiêu người?",
    helper: "Quy mô ảnh hưởng tới mức độ cần tự động hóa.",
    type: "likert",
    roleFilter: [HR_ROLE_ID],
    options: [
      { value: "lt50", label: "Dưới 50 nhân viên", score: 0 },
      { value: "50-100", label: "50 – 100 nhân viên", score: 0 },
      { value: "100-200", label: "100 – 200 nhân viên", score: 0 },
      { value: "gt200", label: "Trên 200 nhân viên", score: 0 },
    ],
  },
  {
    // CÂU CỐT LÕI — feed dailyTasks/goalTags. value = slug trùng skills bài học.
    id: "q3hr-tasks",
    title: "Bạn muốn Claude/AI giúp những việc HR nào? (chọn nhiều)",
    helper: "Đây là tín hiệu chính để dựng lộ trình. Chọn tất cả việc bạn muốn AI hóa.",
    type: "multi-chip",
    roleFilter: [HR_ROLE_ID],
    options: HR_TASK_CATEGORIES.map((c) => ({ value: c.slug, label: c.label })),
  },
  {
    id: "q-hr-priority",
    title: "Trong các việc đó, việc nào NGỐN THỜI GIAN NHẤT — ưu tiên giải quyết trước?",
    helper: "Chọn 1 — Agent sẽ đặt bài liên quan lên đầu lộ trình.",
    type: "likert",
    roleFilter: [HR_ROLE_ID],
    options: HR_TASK_CATEGORIES.map((c) => ({ value: c.slug, label: c.label, score: 0 })),
  },
  {
    id: "q-hr-data",
    title: "Bạn có thường xuyên xử lý dữ liệu nhạy cảm (lương, hợp đồng, hồ sơ, CCCD)?",
    helper: "Để chương trình nhấn mạnh đúng mức phần an toàn dữ liệu nhân sự.",
    type: "likert",
    roleFilter: [HR_ROLE_ID],
    options: [
      { value: "thuong-xuyen", label: "Thường xuyên — gần như mỗi ngày", score: 0 },
      { value: "thinh-thoang", label: "Thỉnh thoảng", score: 0 },
      { value: "hiem", label: "Hiếm khi", score: 0 },
    ],
  },
  {
    // TÙY CHỌN — cần thêm nhánh textarea vào StepAssessment để hiển thị.
    // Tín hiệu quý nhất cho Agent: mô tả việc thật bằng lời của học viên.
    id: "q-hr-recurring",
    title: "Mô tả 1 việc lặp đi lặp lại bạn muốn dùng AI giải quyết trước (càng cụ thể càng tốt)",
    helper: "Không bắt buộc. Ví dụ: 'Mỗi tuần sàng lọc ~40 CV vị trí sale', 'Cuối tháng làm báo cáo nhân sự cho sếp'.",
    type: "free-text",
    roleFilter: [HR_ROLE_ID],
  },
];

// --- Thứ tự câu hỏi cho học viên HR (tái dùng câu chung tính level) ----------
// Lấy q1 (thâm niên), q4 (tần suất AI), q5 (kỹ năng prompt), q6 (công cụ) từ bộ
// chung; chèn các câu HR. Bỏ q2-industry & q3-daily-tasks chung (đã có bản HR).
const GENERIC_KEEP_IDS = ["q1-position", "q4-ai-frequency", "q5-ai-skill", "q6-ai-tools"];

function genericById(id: string): AssessmentQuestion | undefined {
  return ASSESSMENT_QUESTIONS.find((q) => q.id === id);
}

/**
 * Trả về danh sách câu hỏi theo vai trò.
 * - "nhan-su": bộ câu HR đầy đủ (thâm niên → mảng HR → quy mô → việc muốn AI hóa
 *   → ưu tiên → dữ liệu nhạy cảm → tần suất AI → kỹ năng prompt → công cụ → mô tả).
 * - vai trò khác: giữ nguyên 6 câu gốc.
 *
 * Lưu ý: nếu CHƯA thêm nhánh textarea cho "free-text" vào StepAssessment, hãy
 * truyền includeFreeText=false để loại câu q-hr-recurring khỏi luồng UI.
 */
export function getAssessmentQuestionsForRole(
  roleId: string | null | undefined,
  includeFreeText = true,
): AssessmentQuestion[] {
  if (roleId !== HR_ROLE_ID) return ASSESSMENT_QUESTIONS;

  const q1 = genericById("q1-position");
  const q4 = genericById("q4-ai-frequency");
  const q5 = genericById("q5-ai-skill");
  const q6 = genericById("q6-ai-tools");

  const hr = (id: string) => HR_ASSESSMENT_QUESTIONS.find((q) => q.id === id)!;

  const ordered: (AssessmentQuestion | undefined)[] = [
    q1,
    hr("q-hr-subfunction"),
    hr("q-hr-company-size"),
    hr("q3hr-tasks"),
    hr("q-hr-priority"),
    hr("q-hr-data"),
    q4,
    q5,
    q6,
    includeFreeText ? hr("q-hr-recurring") : undefined,
  ];

  return ordered.filter((q): q is AssessmentQuestion => Boolean(q));
}

// --- Tín hiệu HR rút ra từ câu trả lời (cho Agent dựng lộ trình) --------------
export type HrSurveySignals = {
  subFunction: string | null; // slug mảng HR (q-hr-subfunction)
  companySize: string | null; // lt50 | 50-100 | 100-200 | gt200
  tasks: string[]; // slug nhóm việc muốn AI hóa (q3hr-tasks) → goalTags
  priorityTask: string | null; // slug ưu tiên #1 (q-hr-priority)
  dataSensitivity: string | null; // thuong-xuyen | thinh-thoang | hiem
  recurringTaskText: string | null; // mô tả tự do (q-hr-recurring)
};

function asString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/**
 * Rút tín hiệu HR từ answers (độc lập với calculateResult).
 * Agent dùng `tasks` làm goalTags để join với module.skills trong roles-hr.ts,
 * đặt `priorityTask` lên đầu, và dùng `recurringTaskText` làm ngữ cảnh phong phú.
 */
export function extractHrSignals(answers: AssessmentAnswer[]): HrSurveySignals {
  const byId = new Map(answers.map((a) => [a.questionId, a.value] as const));
  const tasksRaw = byId.get("q3hr-tasks");
  return {
    subFunction: asString(byId.get("q-hr-subfunction")),
    companySize: asString(byId.get("q-hr-company-size")),
    tasks: Array.isArray(tasksRaw) ? tasksRaw : tasksRaw ? [tasksRaw] : [],
    priorityTask: asString(byId.get("q-hr-priority")),
    dataSensitivity: asString(byId.get("q-hr-data")),
    recurringTaskText: asString(byId.get("q-hr-recurring")),
  };
}

// Nhãn hiển thị cho slug nhóm việc (dùng ở StepResult nếu muốn).
export const HR_TASK_LABELS: Record<string, string> = Object.fromEntries(
  HR_TASK_CATEGORIES.map((c) => [c.slug, c.label]),
);
