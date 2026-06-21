import {
  isClarifyUserAnswer,
  parseClarifyUserAnswer,
} from "@/lib/chat-clarify-parse";
import { buildCoachAddresses } from "@/lib/display-name";
import type { PreferredAddress } from "@/lib/learning-profile";
import {
  MAX_CLARIFY_QUESTIONS,
  type ClarifyingQuestion,
} from "@/lib/chat-clarify-types";

export type ClarifyContext = {
  /** Gọi tên — chỉ lúc chào / mở đầu. VD: "a Hải" */
  namedAddress: string;
  /** Xưng hô ngắn trong thân bài. VD: "anh", "chị" */
  casualAddress: string;
  topicHint: string;
  roleId?: string | null;
};

export function defaultClarifyContext(): ClarifyContext {
  return {
    namedAddress: "bạn",
    casualAddress: "bạn",
    topicHint: "",
    roleId: null,
  };
}

export function buildClarifyContextFromHistory(
  history: Array<{ role: string; content: string }>,
  currentMessage: string,
  fullName: string | null,
  roleId?: string | null,
  preferredAddress?: PreferredAddress,
): ClarifyContext {
  const addresses = fullName?.trim()
    ? buildCoachAddresses(fullName.trim(), preferredAddress ?? "neutral")
    : { named: "bạn", casual: "bạn" };

  const firstUserMsg = [...history, { role: "user", content: currentMessage }].find(
    (m) => m.role === "user" && !isClarifyUserAnswer(m.content),
  );

  return {
    namedAddress: addresses.named,
    casualAddress: addresses.casual,
    topicHint: firstUserMsg?.content.trim().slice(0, 300) ?? "",
    roleId: roleId ?? null,
  };
}

export function buildClarifyRuntimeHint(
  completedSteps: number,
  currentMessage: string,
  priorAnswersSummary?: string,
): string | null {
  if (!isClarifyUserAnswer(currentMessage)) return null;

  const answersBlock =
    priorAnswersSummary?.trim() ||
    summarizeAllClarifyAnswers(currentMessage, completedSteps);

  if (completedSteps >= MAX_CLARIFY_QUESTIONS) {
    return `TRẠNG THÁI HỎI LÀM RÕ — ĐÃ ĐỦ ${MAX_CLARIFY_QUESTIONS} CÂU (ưu tiên cao nhất):
User đã trả lời đủ ${MAX_CLARIFY_QUESTIONS} câu hỏi card.${answersBlock}

<context>
- Yêu cầu gốc của user nằm trong lịch sử hội thoại, câu user đầu tiên không phải dạng Q/A.
- Các dữ kiện đã thu thập qua card:${answersBlock}
</context>

<task>
Dựa trên context trên, trả hướng dẫn đầy đủ NGAY: tóm tắt nhu cầu, các bước user tự làm, checklist hoặc prompt mẫu nếu hữu ích.
</task>

<format>
- Tôn trọng output user đã chọn ở câu card thứ 3 (dàn ý, Word/PDF, slide, bảng, v.v.).
- Trình bày có cấu trúc, dễ làm theo; dùng heading/list/code block khi phù hợp.
- Với việc cần phân tích nhiều bước, reason through tuần tự trước rồi chỉ đưa kết quả/hướng dẫn cuối.
</format>

<do_not_ask_again>
Thông tin trên đã đủ để trả lời. CẤM tuyệt đối __CLARIFY__, CẤM hỏi thêm (kể cả plain text), CẤM câu hỏi có dấu "?".
Nếu vẫn thiếu chi tiết nhỏ, nêu giả định hợp lý từ 3 câu trả lời và tiếp tục.
</do_not_ask_again>`;
  }

  if (completedSteps <= 0) return null;

  const nextStep = completedSteps + 1;
  const layerHint =
    nextStep === 2
      ? "Lớp 2 — điểm xuất phát: user đã có số liệu/tài liệu gì sẵn chưa?"
      : "Lớp 3 — output cuối: user cần dàn ý, báo cáo file, hay slide?";

  return `TRẠNG THÁI HỎI LÀM RÕ (ưu tiên cao — bắt buộc tuân theo):
User vừa trả lời câu hỏi điểm rẽ (${completedSteps}/${MAX_CLARIFY_QUESTIONS}).${answersBlock}
BẮT BUỘC trả lời bằng intro ngắn (1 câu) + dòng __CLARIFY__ với step=${nextStep}, total=${MAX_CLARIFY_QUESTIONS}.
${layerHint}
CẤM hỏi bằng plain text không có __CLARIFY__. CẤM hỏi lại câu đã hỏi. CẤM trả hướng dẫn dài trước khi hết ${MAX_CLARIFY_QUESTIONS} câu.
options PHẢI khớp câu hỏi (vd câu "nào/gì/loại" → lựa chọn cụ thể, KHÔNG dùng Có/Không).`;
}

/** @deprecated Dùng buildClarifyRuntimeHint */
export function buildClarifyContinuationHint(
  completedSteps: number,
  currentMessage: string,
): string | null {
  return buildClarifyRuntimeHint(completedSteps, currentMessage);
}

function summarizeAllClarifyAnswers(
  currentMessage: string,
  completedSteps: number,
): string {
  const qa = parseClarifyUserAnswer(currentMessage);
  if (!qa) return "";
  if (completedSteps >= MAX_CLARIFY_QUESTIONS) {
    return `\nCâu vừa trả lời (câu cuối): "${qa.question}" → "${qa.answer}".`;
  }
  return `\nCâu vừa trả lời: "${qa.question}" → "${qa.answer}".`;
}

export function getClarifyStepTemplate(
  step: number,
  ctx: ClarifyContext,
): Pick<ClarifyingQuestion, "question" | "options"> & { defaultIntro: string } {
  const { namedAddress, casualAddress, topicHint, roleId } = ctx;
  const normalizedHint = normalizeVi(topicHint);
  const isReportLike = /bao cao|tong hop|tong ket|report/.test(normalizedHint);

  if (step === 1) {
    const roleSpecific = getRoleSpecificStepOneTemplate(roleId, isReportLike);
    if (roleSpecific) {
      return {
        defaultIntro: `Chào ${namedAddress}! Em muốn hỏi thêm một chút để hướng dẫn đúng hướng.`,
        ...roleSpecific,
      };
    }

    if (/marketing|campaign|ads|social/.test(normalizedHint)) {
      return {
        defaultIntro: `Chào ${namedAddress}! Em muốn hỏi thêm một chút để hướng dẫn đúng hướng.`,
        question: "Báo cáo này tập trung vào hoạt động marketing nào?",
        options: [
          "Social media",
          "Quảng cáo (Google/Facebook Ads)",
          "Email / Content marketing",
          "Tổng kết gửi sếp",
        ],
      };
    }

    return {
      defaultIntro: `Em muốn hỏi thêm một chút để hướng dẫn sát hơn.`,
      question: "Công việc này thuộc phạm vi cụ thể nào nhất?",
      options: [
        "Một mảng / nhiệm vụ cụ thể",
        "Tổng quan nhiều mảng",
        "Chưa rõ — cần em gợi ý hướng",
      ],
    };
  }

  if (step === 2) {
    return {
      defaultIntro: `Cảm ơn ${casualAddress}! Em hỏi thêm một chút nữa nhé.`,
      question: `${capitalizeVi(casualAddress)} đã có số liệu hoặc tài liệu nào sẵn chưa?`,
      options: [
        "Đã có số liệu sẵn",
        "Chưa có — cần hướng dẫn từ đầu",
        "Chỉ có một phần dữ liệu",
      ],
    };
  }

  return {
    defaultIntro: `Gần xong rồi ${casualAddress}!`,
    question: `Deliverable cuối cùng ${casualAddress} cần dạng nào?`,
    options: [
      "Chỉ dàn ý / khung outline",
      "Báo cáo Word hoặc PDF",
      "Slide thuyết trình",
    ],
  };
}

function capitalizeVi(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function getRoleSpecificStepOneTemplate(
  roleId: string | null | undefined,
  isReportLike: boolean,
): Pick<ClarifyingQuestion, "question" | "options"> | null {
  if (!roleId || !isReportLike) return null;

  if (roleId === "marketing") {
    return {
      question: "Báo cáo này tập trung vào hoạt động marketing nào?",
      options: [
        "Social media",
        "Quảng cáo (Google/Facebook Ads)",
        "Email / Content marketing",
        "Tổng kết gửi sếp",
      ],
    };
  }

  if (roleId === "ke-toan") {
    return {
      question: "Báo cáo này đang nghiêng về mảng kế toán nào?",
      options: [
        "Doanh thu / chi phí",
        "Công nợ / phải thu phải trả",
        "Thuế / chứng từ",
        "Tổng hợp gửi sếp",
      ],
    };
  }

  if (roleId === "kinh-doanh") {
    return {
      question: "Báo cáo này tập trung vào phần kinh doanh nào?",
      options: [
        "Doanh số / KPI bán hàng",
        "Pipeline / cơ hội chốt đơn",
        "Khách hàng / phản hồi thị trường",
        "Tổng kết gửi sếp",
      ],
    };
  }

  if (roleId === "van-hanh") {
    return {
      question: "Báo cáo này đang tập trung vào mảng hành chính / HR nào?",
      options: [
        "Chấm công / nghỉ phép",
        "Tuyển dụng / CV / phỏng vấn",
        "Biến động nhân sự / hồ sơ nhân viên",
        "Tổng hợp nhân sự gửi sếp",
      ],
    };
  }

  return {
    question: "Báo cáo này đang tập trung vào phần công việc nào nhất?",
    options: [
      "Một mảng nghiệp vụ cụ thể",
      "Tổng hợp nhiều đầu việc",
      "Báo cáo định kỳ gửi quản lý",
      "Khác (sẽ mô tả thêm)",
    ],
  };
}

function normalizeVi(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
