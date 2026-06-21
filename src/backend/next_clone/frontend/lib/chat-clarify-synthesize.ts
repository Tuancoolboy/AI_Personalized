import type { ClarifyContext } from "@/lib/chat-clarify-steps";
import {
  formatRelatedLessonLinksSection,
  pickRelatedLessonLinks,
} from "@/lib/chat-clarify-lessons";
import { MAX_CLARIFY_QUESTIONS } from "@/lib/chat-clarify-types";

export type ClarifyAnswerPair = {
  question: string;
  answer: string;
};

export function stripTrailingClarifyQuestions(text: string): string {
  let result = text.trim();

  result = result
    .replace(/\s*[—–-]\s*(?:Em\s+)?(?:muốn\s+)?hỏi\s+thêm[\s\S]*$/i, "")
    .replace(/\s*(?:Em\s+)?muốn\s+hỏi\s+thêm[\s\S]*$/i, "")
    .replace(/\s*(?:A|Anh|Chị|Bạn)\s+cần\s+làm\s+rõ[\s\S]*$/i, "")
    .trim();

  const sentences = result.match(/[^.!?]+[.!?]+/g) ?? (result ? [result] : []);
  const kept: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const isClarifyQuestion =
      trimmed.includes("?") &&
      /(?:hỏi|cho em biết|cần làm rõ|làm rõ|muốn|có thể|vậy)/i.test(trimmed);

    if (isClarifyQuestion) continue;
    if (trimmed.includes("?") && kept.length > 0) continue;
    kept.push(trimmed);
  }

  return kept.join(" ").trim();
}

export function needsSynthesisFallback(
  text: string,
  answers: ClarifyAnswerPair[],
): boolean {
  if (answers.length < MAX_CLARIFY_QUESTIONS) return false;

  const trimmed = text.trim();
  if (trimmed.length < 140) return true;
  if (/\?/.test(trimmed)) return true;
  if (/(?:hỏi thêm|cho em biết|cần làm rõ|em muốn hỏi)/i.test(trimmed)) {
    return true;
  }

  const bulletCount = (trimmed.match(/(?:^|\n)\s*[-•*]\s+/gm) ?? []).length;
  const numberedSteps = (trimmed.match(/(?:^|\n)\s*\d+[.)]\s+/gm) ?? []).length;
  return bulletCount + numberedSteps < 2;
}

export function buildSynthesizedCoachAnswer(
  ctx: ClarifyContext,
  answers: ClarifyAnswerPair[],
  modelIntro?: string,
): string {
  const casualAddress = ctx.casualAddress;
  const scope = answers[0]?.answer ?? "công việc anh cần làm";
  const startingPoint = answers[1]?.answer ?? "chưa rõ dữ liệu";
  const deliverable = answers[2]?.answer ?? "chưa rõ định dạng";

  const intro =
    extractSafeIntro(modelIntro) ||
    `Cảm ơn ${casualAddress}! Em đã gom đủ 3 câu trả lời — dưới đây là hướng dẫn để ${casualAddress} tự làm:`;

  const isMarketingReport = /marketing|campaign|ads|social|google\/facebook|cpc|cpa|conversion/i.test(
    `${ctx.topicHint} ${scope} ${deliverable}`,
  );

  const summary = `**Em hiểu nhu cầu của ${casualAddress}:**
- Phạm vi: ${scope}
- Điểm xuất phát: ${startingPoint}
- Đầu ra cần: ${deliverable}

Thông tin trên đã đủ để đi tiếp, nên em không hỏi lại nữa.`;

  const steps = isMarketingReport
    ? buildMarketingReportSteps(scope, startingPoint, deliverable, casualAddress)
    : buildGenericCoachSteps(scope, startingPoint, deliverable, casualAddress);

  const lessonLinks = formatRelatedLessonLinksSection(
    pickRelatedLessonLinks(ctx.topicHint, scope, ctx.roleId),
  );

  return `${intro}\n\n${summary}\n\n${steps}${lessonLinks}`;
}

function extractSafeIntro(
  modelIntro: string | undefined,
): string | null {
  if (!modelIntro?.trim()) return null;
  const cleaned = stripTrailingClarifyQuestions(modelIntro);
  if (!cleaned || cleaned.length < 20 || cleaned.length > 120) return null;
  if (/\?/.test(cleaned)) return null;
  if (/(?:hỏi thêm|cho em biết|cần làm rõ)/i.test(cleaned)) return null;
  if (/^#{1,6}\s|(?:^|\n)\s*[-•*]\s+|```/m.test(cleaned)) return null;
  return cleaned.replace(/đã cung cấp đầy đủ thông tin\.?\s*$/i, "").trim() || null;
}

function buildMarketingReportSteps(
  scope: string,
  startingPoint: string,
  deliverable: string,
  casualAddress: string,
): string {
  const hasData = /đã có|một phần/i.test(startingPoint);
  const isSlide = /slide/i.test(deliverable);
  const isWord = /word|pdf|báo cáo/i.test(deliverable);
  const isOutline = /dàn ý|outline|khung/i.test(deliverable);

  const formatHint = isSlide
    ? "6–8 slide: tóm tắt → KPI chính → insight → hành động tháng tới"
    : isWord
      ? "Word/PDF 2–4 trang: executive summary → số liệu → phân tích → đề xuất"
      : isOutline
        ? "outline 1 trang: mục tiêu → số liệu cần → 3 insight → 3 việc làm tiếp"
        : "cấu trúc rõ: mục tiêu → số liệu → insight → next steps";

  return `## Các bước ${casualAddress} tự làm

1. **Chốt khung ${formatHint}** cho mảng *${scope}* — ghi bullet trước, chưa cần văn phong đẹp.
2. **${hasData ? "Gom số liệu sẵn có" : "Liệt kê số liệu cần thu"}** (impression, click, CPC/CPA, conversion, chi phí…) theo đúng kênh ${casualAddress} chọn; thiếu số thì ghi "cần lấy từ Ads Manager / GA4".
3. **Dùng AI như trợ lý phân tích:** copy prompt bên dưới, dán bảng số liệu (đã ẩn thông tin nhạy cảm), rồi chỉnh insight theo bối cảnh nội bộ.
4. **Soát lại bằng mắt ${casualAddress}** — chỉnh con số, thêm bối cảnh, chốt câu chữ cuối trước khi gửi.

## Chỗ nhập prompt

- Dán prompt vào ChatGPT/Claude hoặc công cụ AI nội bộ công ty đang cho phép dùng.
- Phần cần thay bằng dữ liệu thật: bảng số liệu lấy từ Ads Manager / GA4, phạm vi chiến dịch, kỳ báo cáo, và định dạng đầu ra cuối cùng.
- Nếu dữ liệu đang nằm ở nhiều nguồn, nên gom về một bảng trước rồi mới dán vào prompt để tránh AI hiểu sai bối cảnh.

## Tư duy cần giữ

- Báo cáo chỉ có giá trị khi trả lời được tháng này tốt hay xấu ở đâu và tháng sau nên tăng, giảm, thử hay dừng gì.
- Mỗi chỉ số nên được đọc cùng mục tiêu hoặc benchmark; nếu thiếu mốc so sánh thì ghi rõ là chưa đủ dữ liệu để kết luận dứt khoát.
- Mỗi insight nên đi theo nhịp: dữ liệu quan sát được → ý nghĩa hoặc giả thuyết → mức chắc chắn → hành động đề xuất.
- Nếu một số liệu không đổi được quyết định, có thể để phụ lục thay vì đưa lên slide chính.

## Prompt mẫu (copy chỉnh)

${formatPromptCodeBlock(buildMarketingAnalysisPrompt(scope, deliverable))}`;
}

function buildMarketingAnalysisPrompt(scope: string, deliverable: string): string {
  return `Bạn là trợ lý phân tích marketing. Tôi đang làm báo cáo tháng này cho: ${scope}.

Dữ liệu (dán bảng):
[dán bảng số liệu từ Ads Manager / GA4]

Hãy gợi ý:
1) Mục tiêu kinh doanh và benchmark cần nhìn cùng số liệu
2) 3 insight chính từ số liệu (không bịa số), mỗi insight theo format: quan sát → ý nghĩa hoặc giả thuyết → mức chắc chắn → hành động
3) Khung ${deliverable} gửi sếp, ưu tiên các phần: Executive Summary, KPI Analysis, What Worked / What Didn’t Work, Action Plan, Decision Needed
4) 3 việc ưu tiên tháng tới, chia rõ Scale / Fix / Test / Stop nếu phù hợp

Giữ tone ngắn gọn, dễ trình bày. Nếu thiếu benchmark hoặc số liệu so sánh, hãy nói rõ phần nào còn chưa đủ dữ liệu.`;
}

function formatPromptCodeBlock(prompt: string): string {
  return `\`\`\`\n${prompt.trim()}\n\`\`\``;
}

function buildGenericCoachSteps(
  scope: string,
  startingPoint: string,
  deliverable: string,
  casualAddress: string,
): string {
  return `## Các bước ${casualAddress} tự làm

1. **Chốt đầu ra trước**: vì ${casualAddress} cần *${deliverable}*, hãy phác khung mục lớn trước rồi mới điền số liệu/nội dung chi tiết.
2. **Rà soát điểm xuất phát**: hiện trạng là *${startingPoint}*. Tách rõ những gì đã có, còn thiếu, và ai/nguồn nào có thể bổ sung.
3. **Dùng AI để dựng nháp có kiểm soát**: chỉ đưa bối cảnh, dữ liệu đã ẩn thông tin nhạy cảm, và yêu cầu rất cụ thể; ${casualAddress} vẫn là người chốt nội dung cuối.
4. **Soát lại bằng mắt người làm nghiệp vụ**: kiểm tra logic, số liệu, thuật ngữ nội bộ và câu chữ trước khi gửi.

## Chỗ nhập prompt

- Dán prompt vào ChatGPT/Claude hoặc công cụ AI nội bộ công ty đang cho phép dùng.
- Phần cần thay bằng dữ liệu thật: phạm vi công việc, bảng số liệu/tài liệu nguồn, ràng buộc nội bộ, và định dạng đầu ra mong muốn.
- Nếu có file Excel hoặc bảng chấm công, nên dán theo dạng bảng gọn hoặc tóm tắt các cột chính trước khi hỏi.

## Tư duy cần giữ

- Bản nháp chỉ hữu ích khi nó giúp ${casualAddress} quyết định bước tiếp theo, không chỉ là bản tóm tắt đủ chữ.
- Mỗi ý chính nên trả lời được: phần này phục vụ mục tiêu gì, dựa vào dữ liệu nào, và nếu thiếu dữ liệu thì đang thiếu gì.
- Khi có số liệu, nên ưu tiên chỉ số gắn trực tiếp với mục tiêu; phần không ảnh hưởng đến quyết định có thể để phụ lục.
- Nếu câu trả lời còn mơ hồ, hãy yêu cầu AI nêu rõ giả định thay vì viết cho đủ câu.

## Prompt mẫu (copy chỉnh)

${formatPromptCodeBlock(`Bạn là trợ lý AI hỗ trợ công việc.

Tôi cần làm ${deliverable} cho: ${scope}.

Điểm xuất phát hiện tại: ${startingPoint}.

Hãy giúp tôi theo đúng cấu trúc sau:
1. Khung mục lớn cần có
2. Với mỗi mục, giải thích cần viết gì, vì sao mục đó quan trọng, và nó giúp quyết định điều gì
3. Nếu có số liệu, gợi ý công thức tính hoặc nguồn dữ liệu nên lấy
4. Nếu thiếu dữ liệu, chỉ ra phần nào chưa đủ để kết luận
5. Checklist rà soát cuối trước khi gửi

Không bịa dữ liệu. Tôi sẽ tự điền chi tiết nghiệp vụ cuối cùng.`)}`;
}
