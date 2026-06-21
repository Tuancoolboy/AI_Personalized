// Bài đánh giá đầu vào — quyết định lộ trình của user.
// 6 câu hỏi, mỗi câu 0-5 điểm. Tổng 0-30 → quy về AI level 0-5.
// > level 5 (max) = đã giỏi, skip module level 1.

export type AssessmentQuestion = {
  id: string;
  // Câu hỏi hiển thị cho user.
  title: string;
  // Mô tả thêm nếu cần.
  helper?: string;
  // Loại input:
  //  - "likert": chọn 1 trong 5 mức (0-5 điểm)
  //  - "multi-chip": chọn nhiều chip (mỗi chip 1 điểm nhỏ)
  //  - "free-text": text input, tự đánh giá 0-3
  type: "likert" | "multi-chip" | "free-text";
  // Danh sách lựa chọn cho likert/multi-chip.
  options?: { value: string; label: string; score?: number }[];
  // Nếu chỉ áp dụng cho role nào đó.
  roleFilter?: string[];
};

// Các câu hỏi — dùng cho mọi vai trò trừ Q2 phụ thuộc role.
export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1-position",
    title: "Vị trí cụ thể của bạn là gì?",
    helper: "Chọn 1 mô tả gần đúng nhất.",
    type: "likert",
    options: [
      { value: "junior", label: "Nhân viên mới (< 1 năm)", score: 1 },
      { value: "mid", label: "Nhân viên kinh nghiệm (1-3 năm)", score: 2 },
      { value: "senior", label: "Nhân viên giàu kinh nghiệm (3-5 năm)", score: 3 },
      { value: "lead", label: "Trưởng nhóm / Team lead", score: 4 },
      { value: "manager", label: "Trưởng phòng / Quản lý", score: 5 },
    ],
  },
  {
    id: "q2-industry",
    title: "Công ty bạn hoạt động trong lĩnh vực nào?",
    helper: "Để AI gợi ý ví dụ sát ngành của bạn.",
    type: "likert",
    options: [
      { value: "retail", label: "Bán lẻ / Thương mại điện tử", score: 1 },
      { value: "service", label: "Dịch vụ (Spa, F&B, Giáo dục...)", score: 1 },
      { value: "manufacture", label: "Sản xuất / Phân phối", score: 1 },
      { value: "tech", label: "Công nghệ / Phần mềm", score: 1 },
      { value: "other", label: "Khác / Tổng hợp", score: 1 },
    ],
  },
  {
    id: "q3-daily-tasks",
    title: "Hằng ngày bạn thường làm những việc gì? (chọn nhiều)",
    helper: "Hiểu rõ công việc → lộ trình sát thực tế.",
    type: "multi-chip",
    options: [
      { value: "email", label: "Soạn email / tin nhắn" },
      { value: "report", label: "Làm báo cáo / số liệu" },
      { value: "meeting", label: "Họp hành / điều phối" },
      { value: "customer", label: "Tiếp xúc khách hàng" },
      { value: "content", label: "Viết content / sáng tạo" },
      { value: "process", label: "Quy trình / chứng từ" },
      { value: "analyze", label: "Phân tích / ra quyết định" },
      { value: "plan", label: "Lên kế hoạch / chiến lược" },
    ],
  },
  {
    id: "q4-ai-frequency",
    title: "Bạn đã từng dùng AI (ChatGPT, Claude, Copilot...) chưa?",
    type: "likert",
    options: [
      { value: "never", label: "Chưa bao giờ", score: 0 },
      { value: "tried", label: "Đã thử 1-2 lần cho việc cá nhân", score: 1 },
      { value: "sometimes", label: "Thỉnh thoảng cho công việc", score: 2 },
      { value: "weekly", label: "Vài lần/tuần cho công việc", score: 4 },
      { value: "daily", label: "Hằng ngày, là công cụ không thể thiếu", score: 6 },
    ],
  },
  {
    id: "q5-ai-skill",
    title: "Mức độ tự tin của bạn khi viết prompt cho AI?",
    helper: "Tự đánh giá thật — không có đáp án đúng/sai.",
    type: "likert",
    options: [
      { value: "0", label: "Không biết prompt là gì", score: 0 },
      { value: "1", label: "Biết hỏi cơ bản, kết quả tạm", score: 1 },
      { value: "2", label: "Biết mô tả bối cảnh + yêu cầu cụ thể", score: 3 },
      { value: "3", label: "Biết tối ưu prompt, dùng role/few-shot", score: 5 },
      { value: "4", label: "Tự build prompt template tái dùng", score: 7 },
    ],
  },
  {
    id: "q6-ai-tools",
    title: "Bạn đã từng dùng công cụ AI nào? (chọn nhiều)",
    type: "multi-chip",
    options: [
      { value: "chatgpt", label: "ChatGPT" },
      { value: "claude", label: "Claude" },
      { value: "copilot", label: "Microsoft Copilot" },
      { value: "gemini", label: "Gemini" },
      { value: "canva", label: "Canva AI" },
      { value: "midjourney", label: "Midjourney / DALL-E" },
      { value: "perplexity", label: "Perplexity" },
      { value: "notion-ai", label: "Notion AI" },
    ],
  },
];

export type AssessmentAnswer = {
  questionId: string;
  // likert: string value; multi-chip: array string; free-text: string
  value: string | string[];
};

export type AssessmentResult = {
  totalScore: number; // 0-30
  aiLevel: number; // 0-5
  skipBasicModules: boolean; // aiLevel > 5
  dailyTasks: string[]; // chips từ Q3
  toolsTried: string[]; // chips từ Q6
  industry: string; // value từ Q2
  position: string; // value từ Q1
  // Mô tả ngắn dành cho UI ("Mới làm quen với AI", "Đã quen tay" v.v).
  levelLabel: string;
  levelDesc: string;
};

const LEVEL_LABELS: Record<number, { label: string; desc: string }> = {
  0: {
    label: "Mới bắt đầu",
    desc: "Chưa quen với AI — lộ trình sẽ đi từ cơ bản nhất, dễ áp dụng ngay.",
  },
  1: {
    label: "Người mới làm quen",
    desc: "Đã thử AI một vài lần — sẽ tập trung vào dùng AI cho công việc thực tế.",
  },
  2: {
    label: "Đã có kinh nghiệm cơ bản",
    desc: "Dùng AI khá ổn cho việc đơn giản — lộ trình sẽ nâng lên use case nâng cao.",
  },
  3: {
    label: "Khá quen tay",
    desc: "Dùng AI thường xuyên — sẽ học cách tối ưu prompt + công cụ chuyên sâu.",
  },
  4: {
    label: "Đã quen tay",
    desc: "Dùng AI tốt — lộ trình tập trung use case chuyên sâu & quy trình.",
  },
  5: {
    label: "Người dùng nâng cao",
    desc: "Bạn đã giỏi — sản phẩm này phù hợp nhất cho người mới. Có thể skip module cơ bản.",
  },
};

// Map tổng điểm raw 0-30 → AI level 0-5.
function mapScoreToLevel(score: number): number {
  if (score <= 3) return 0;
  if (score <= 7) return 1;
  if (score <= 12) return 2;
  if (score <= 17) return 3;
  if (score <= 22) return 4;
  return 5;
}

export function calculateResult(
  answers: AssessmentAnswer[],
): AssessmentResult {
  let total = 0;
  let dailyTasks: string[] = [];
  let toolsTried: string[] = [];
  let industry = "";
  let position = "";

  for (const answer of answers) {
    const question = ASSESSMENT_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) continue;

    if (question.type === "likert") {
      const option = question.options?.find((o) => o.value === answer.value);
      if (option?.score) total += option.score;
      if (question.id === "q1-position") position = String(answer.value);
      if (question.id === "q2-industry") industry = String(answer.value);
    }

    if (question.type === "multi-chip" && Array.isArray(answer.value)) {
      // 1 chip = 1 điểm, cap tối đa 5 điểm/câu
      total += Math.min(5, answer.value.length);
      if (question.id === "q3-daily-tasks") dailyTasks = answer.value;
      if (question.id === "q6-ai-tools") toolsTried = answer.value;
    }
  }

  const aiLevel = mapScoreToLevel(total);
  const meta = LEVEL_LABELS[aiLevel];

  return {
    totalScore: total,
    aiLevel,
    skipBasicModules: aiLevel >= 5,
    dailyTasks,
    toolsTried,
    industry,
    position,
    levelLabel: meta.label,
    levelDesc: meta.desc,
  };
}
