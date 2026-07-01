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
  /** Gọi tên — chỉ lúc chào / mở đầu. Mặc định dùng "bạn". */
  namedAddress: string;
  /** Xưng hô ngắn trong thân bài. Mặc định dùng "bạn". */
  casualAddress: string;
  topicHint: string;
  roleId?: string | null;
};

type ClarifyFlowKind = "default" | "extra-skill";

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
  context?: ClarifyContext,
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
Ưu tiên câu hỏi hiện tại và 3 câu trả lời vừa thu thập; không kéo thêm trí nhớ cũ không liên quan vào câu trả lời.
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
  const template = getClarifyStepTemplate(
    nextStep,
    context ?? defaultClarifyContext(),
  );
  const layerHint =
    nextStep === 2
      ? `Lớp 2 — câu tiếp theo phải bám nhánh vừa chọn: "${template.question}"`
      : `Lớp 3 — câu cuối phải chốt kiểu hỗ trợ/đầu ra phù hợp: "${template.question}"`;

  return `TRẠNG THÁI HỎI LÀM RÕ (ưu tiên cao — bắt buộc tuân theo):
User vừa trả lời câu hỏi điểm rẽ (${completedSteps}/${MAX_CLARIFY_QUESTIONS}).${answersBlock}
BẮT BUỘC trả lời bằng intro ngắn (1 câu) + dòng __CLARIFY__ với step=${nextStep}, total=${MAX_CLARIFY_QUESTIONS}.
${layerHint}
Options nên dùng: ${template.options.join(" | ")}.
Câu trả lời phải bám sát câu hỏi hiện tại và 1–2 lượt trao đổi gần nhất; không dùng trí nhớ cũ nếu nó làm lệch hướng.
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
  const flowKind = getClarifyFlowKind(normalizedHint);

  if (step === 1) {
    if (flowKind === "extra-skill") {
      return {
        defaultIntro: `Chào ${namedAddress}! Học thêm kỹ năng ngoài lộ trình không có vấn đề gì, miễn là chọn phần áp dụng được vào việc của ${casualAddress}.`,
        question: `${capitalizeVi(casualAddress)} muốn học thêm nhóm kỹ năng nào trước?`,
        options: [
          "Quảng cáo tuyển dụng / job ads",
          "Employer branding / social content",
          "Email / truyền thông nội bộ",
          "Tự động hóa việc HR lặp lại",
        ],
      };
    }

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
    if (flowKind === "extra-skill") {
      return {
        defaultIntro: `Cảm ơn ${casualAddress}! Em hỏi thêm để gợi ý đúng bài Kỹ năng khác.`,
        question: `${capitalizeVi(casualAddress)} muốn áp dụng kỹ năng này vào việc HR nào trước?`,
        options: [
          "Tuyển dụng / thu hút ứng viên",
          "Xây thương hiệu tuyển dụng",
          "Truyền thông nội bộ",
          "Đo hiệu quả kênh tuyển dụng",
        ],
      };
    }

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

  if (flowKind === "extra-skill") {
    return {
      defaultIntro: `Gần xong rồi ${casualAddress}!`,
      question: `${capitalizeVi(casualAddress)} muốn em hỗ trợ theo kiểu nào?`,
      options: [
        "Gợi ý bài học phù hợp để lưu",
        "Checklist thực hành nhanh",
        "Prompt mẫu copy dùng ngay",
        "Giải thích từ đầu bằng ví dụ HR",
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

function getClarifyFlowKind(normalizedHint: string): ClarifyFlowKind {
  const isExtraSkill =
    /ky nang khac|skill khac|hoc skill|hoc them skill|hoc them ky nang|ngoai lo trinh|khac co van de gi/.test(
      normalizedHint,
    );
  return isExtraSkill ? "extra-skill" : "default";
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
