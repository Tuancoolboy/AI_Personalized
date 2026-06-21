import {
  CLARIFY_PREFIX,
  MAX_CLARIFY_QUESTIONS,
  type ClarifyingQuestion,
  type ParsedAssistantMessage,
} from "@/lib/chat-clarify-types";
import { enforceSingleClarifyingQuestion } from "@/lib/chat-clarifying-enforce";
import {
  getClarifyStepTemplate,
  defaultClarifyContext,
  type ClarifyContext,
} from "@/lib/chat-clarify-steps";
import {
  buildSynthesizedCoachAnswer,
  needsSynthesisFallback,
  stripTrailingClarifyQuestions,
  type ClarifyAnswerPair,
} from "@/lib/chat-clarify-synthesize";

const OTHER_OPTION = "Khác (sẽ mô tả thêm)";

export type FinalizeClarifyOptions = {
  userJustAnsweredClarify?: boolean;
  clarifyContext?: ClarifyContext;
  /** Số câu card user đã trả lời trong hội thoại hiện tại. */
  clarifyCompleted?: number;
  /** Toàn bộ cặp Q/A card đã thu thập. */
  clarifyAnswers?: ClarifyAnswerPair[];
};

export function stripClarifyBlock(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.includes(CLARIFY_PREFIX)) return trimmed;
  const idx = trimmed.indexOf(CLARIFY_PREFIX);
  return trimmed.slice(0, idx).trim();
}

export function isClarifyPhaseComplete(clarifyCompleted: number): boolean {
  return clarifyCompleted >= MAX_CLARIFY_QUESTIONS;
}

export function parseClarifyPayload(raw: string): ClarifyingQuestion | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(CLARIFY_PREFIX)) return null;

  try {
    const json = trimmed.slice(CLARIFY_PREFIX.length);
    const data = JSON.parse(json) as Partial<ClarifyingQuestion>;
    if (
      typeof data.question !== "string" ||
      !Array.isArray(data.options) ||
      data.options.length < 2
    ) {
      return null;
    }

    const options = data.options
      .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
      .map((o) => o.trim())
      .slice(0, 5);

    if (options.length < 2) return null;

    return {
      step: clampInt(data.step, 1, 3, 1),
      total: clampInt(data.total, 2, 3, 3),
      question: data.question.trim(),
      options: sanitizeClarifyOptions(data.question.trim(), ensureOtherOption(options)),
    };
  } catch {
    return null;
  }
}

export function parseAssistantMessageContent(raw: string): ParsedAssistantMessage {
  const text = raw.trim();
  if (!text.includes(CLARIFY_PREFIX)) {
    return { content: text };
  }

  const idx = text.indexOf(CLARIFY_PREFIX);
  const intro = text.slice(0, idx).trim();
  const payloadLine = text.slice(idx).split("\n")[0] ?? "";
  const clarify = parseClarifyPayload(payloadLine);

  if (!clarify) {
    return { content: text.replace(CLARIFY_PREFIX, "").trim() };
  }

  return {
    content: intro,
    clarify,
  };
}

export function serializeAssistantMessage(
  content: string,
  clarify?: ClarifyingQuestion,
): string {
  const intro = content.trim();
  if (!clarify) return intro;
  return `${intro}\n\n${CLARIFY_PREFIX}${JSON.stringify({
    step: clarify.step,
    total: clarify.total,
    question: clarify.question,
    options: clarify.options,
  })}`;
}

export function formatClarifyUserAnswer(question: string, answer: string): string {
  return `Q: ${question.trim()}\nA: ${answer.trim()}`;
}

export function isClarifyUserAnswer(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith("Q:") && trimmed.includes("\nA:");
}

export function parseClarifyUserAnswer(
  content: string,
): { question: string; answer: string } | null {
  const trimmed = content.trim();
  if (!isClarifyUserAnswer(trimmed)) return null;
  const newline = trimmed.indexOf("\nA:");
  if (newline < 0) return null;
  return {
    question: trimmed.slice(2, newline).trim(),
    answer: trimmed.slice(newline + 4).trim(),
  };
}

export function countClarifyStepsCompleted(
  messages: Array<{ role: string; content: string }>,
): number {
  return messages.filter(
    (m) => m.role === "user" && isClarifyUserAnswer(m.content),
  ).length;
}

export function summarizeClarifyAnswersFromHistory(
  history: Array<{ role: string; content: string }>,
  currentMessage: string,
): string {
  const answers = collectClarifyAnswers(history, currentMessage);
  if (answers.length === 0) return "";

  const lines = answers.map(
    (qa, index) => `${index + 1}. "${qa.question}" → "${qa.answer}"`,
  );
  return `\nCác câu đã trả lời:\n${lines.join("\n")}`;
}

export function collectClarifyAnswers(
  history: Array<{ role: string; content: string }>,
  currentMessage: string,
): ClarifyAnswerPair[] {
  return [...history, { role: "user", content: currentMessage }]
    .filter((m) => m.role === "user" && isClarifyUserAnswer(m.content))
    .map((m) => parseClarifyUserAnswer(m.content))
    .filter((qa): qa is ClarifyAnswerPair => qa !== null);
}

/** Suy ra lựa chọn từ câu hỏi dạng "… loại nào: A, B hay C?" */
export function inferClarifyFromPlainText(
  text: string,
  stepHint = 1,
  context?: ClarifyContext,
): ParsedAssistantMessage | null {
  if (stepHint > MAX_CLARIFY_QUESTIONS) return null;

  const trimmed = text.trim();
  const analysisText = stripMarkdownLinksForClarifyDetection(trimmed);
  const questionCount = (analysisText.match(/\?/g) ?? []).length;
  if (questionCount !== 1 || trimmed.length > 600) return null;

  const sentences = analysisText.match(/[^.!?]+[.!?]+/g) ?? [analysisText];
  const questionSentence = (sentences[sentences.length - 1] ?? trimmed).trim();
  const intro = sentences.slice(0, -1).join(" ").trim();

  const colonMatch = questionSentence.match(/^(.+?):\s*(.+)\?\s*$/);
  if (colonMatch) {
    const question = `${colonMatch[1].trim()}?`;
    const options = splitInlineOptions(colonMatch[2]);
    if (options.length >= 2) {
      return {
        content: intro,
        clarify: {
          step: stepHint,
          total: MAX_CLARIFY_QUESTIONS,
          question,
          options: sanitizeClarifyOptions(question, ensureOtherOption(options)),
        },
      };
    }
  }

  const isClarifyingTone =
    /(?:em muốn hỏi|hỏi thêm|một chút|cho em biết|cụ thể|vậy)/i.test(
      trimmed,
    ) && questionSentence.includes("?");

  if (!isClarifyingTone && !isOpenClarifyingQuestion(questionSentence)) {
    return null;
  }

  const inferredOptions = inferOptionsFromQuestion(questionSentence, stepHint, context);
  if (inferredOptions.length < 2) return null;

  return {
    content: intro || extractIntroFallback(trimmed, questionSentence),
    clarify: {
      step: stepHint,
      total: MAX_CLARIFY_QUESTIONS,
      question: normalizeQuestionSentence(questionSentence),
      options: ensureOtherOption(inferredOptions),
    },
  };
}

function stripMarkdownLinksForClarifyDetection(text: string): string {
  return text.replace(/\[([^\]]+)\]\((?:[^()]+|\([^()]*\))*\)/g, "$1");
}

export function enrichWithClarifyBlock(
  text: string,
  stepHint = 1,
  context?: ClarifyContext,
): string {
  if (stepHint > MAX_CLARIFY_QUESTIONS) {
    return stripClarifyBlock(text);
  }

  if (text.includes(CLARIFY_PREFIX)) {
    return sanitizeClarifyBlockText(text, stepHint, context);
  }

  const inferred = inferClarifyFromPlainText(text, stepHint, context);
  if (!inferred?.clarify) return text;

  return serializeAssistantMessage(inferred.content, inferred.clarify);
}

export function finalizeClarifyingAssistantText(
  text: string,
  stepHint = 1,
  options: FinalizeClarifyOptions = {},
): string {
  const ctx = options.clarifyContext;
  const completedSteps =
    options.clarifyCompleted ?? Math.max(0, stepHint - 1);
  const clarifyAnswers = options.clarifyAnswers ?? [];

  if (isClarifyPhaseComplete(completedSteps) || stepHint > MAX_CLARIFY_QUESTIONS) {
    return finalizeAfterClarifyPhaseComplete(text, ctx, clarifyAnswers);
  }

  const enforced = enforceSingleClarifyingQuestion(text);

  if (
    options.userJustAnsweredClarify &&
    stepHint >= 2 &&
    stepHint <= MAX_CLARIFY_QUESTIONS &&
    completedSteps < MAX_CLARIFY_QUESTIONS
  ) {
    const result = applyDefaultClarifyStep(
      extractIntroFromText(enforced),
      stepHint,
      ctx,
    );
    return sanitizeClarifyBlockText(result, stepHint, ctx);
  }

  let result = enrichWithClarifyBlock(enforced, stepHint, ctx);
  const hasClarifyBlock = result.includes(CLARIFY_PREFIX);

  if (
    !hasClarifyBlock &&
    stepHint === 1 &&
    isOpenClarifyingQuestion(enforced)
  ) {
    result = applyDefaultClarifyStep(extractIntroFromText(enforced), 1, ctx);
  }

  return sanitizeClarifyBlockText(result, stepHint, ctx);
}

export function shouldAskClarifyCard(clarifyCompleted: number): boolean {
  return clarifyCompleted < MAX_CLARIFY_QUESTIONS;
}

function finalizeAfterClarifyPhaseComplete(
  text: string,
  ctx: ClarifyContext | undefined,
  answers: ClarifyAnswerPair[],
): string {
  const stripped = stripTrailingClarifyQuestions(stripClarifyBlock(text));
  const context: ClarifyContext = ctx ?? defaultClarifyContext();

  if (answers.length >= MAX_CLARIFY_QUESTIONS) {
    return buildSynthesizedCoachAnswer(
      context,
      answers,
      needsSynthesisFallback(stripped, answers)
        ? stripped
        : stripTrailingClarifyQuestions(stripped),
    );
  }

  return stripped;
}

function applyDefaultClarifyStep(
  intro: string,
  step: number,
  context?: ClarifyContext,
): string {
  const ctx: ClarifyContext = context ?? defaultClarifyContext();
  const template = getClarifyStepTemplate(step, ctx);
  return serializeAssistantMessage(
    intro.trim() || template.defaultIntro,
    {
      step,
      total: MAX_CLARIFY_QUESTIONS,
      question: template.question,
      options: ensureOtherOption(template.options),
    },
  );
}

function sanitizeClarifyBlockText(
  text: string,
  stepHint: number,
  context?: ClarifyContext,
): string {
  const parsed = parseAssistantMessageContent(text);
  if (!parsed.clarify) return text;

  const fixedOptions = sanitizeClarifyOptions(
    parsed.clarify.question,
    parsed.clarify.options,
    stepHint,
    context,
  );

  if (fixedOptions === parsed.clarify.options) return text;

  return serializeAssistantMessage(parsed.content, {
    ...parsed.clarify,
    options: fixedOptions,
  });
}

function sanitizeClarifyOptions(
  question: string,
  options: string[],
  stepHint = 1,
  context?: ClarifyContext,
): string[] {
  if (isYesNoMismatch(question, options)) {
    return ensureOtherOption(inferOptionsFromQuestion(question, stepHint, context));
  }
  return ensureOtherOption(options);
}

function isYesNoMismatch(question: string, options: string[]): boolean {
  const normalized = options.map((o) => o.toLowerCase().trim());
  const hasYesNo =
    normalized.includes("có") || normalized.includes("không");
  const asksWhich = /nào|gì|loại|mảng|hoạt động|phạm vi|dạng nào|deliverable/i.test(
    question,
  );
  return hasYesNo && asksWhich;
}

export function inferOptionsFromQuestion(
  question: string,
  stepHint: number,
  context?: ClarifyContext,
): string[] {
  const ctx: ClarifyContext = context ?? {
    ...defaultClarifyContext(),
    topicHint: question,
  };

  if (stepHint >= 1 && stepHint <= 3) {
    return getClarifyStepTemplate(stepHint, ctx).options;
  }

  const q = question.toLowerCase();
  if (/số liệu|dữ liệu|tài liệu|sẵn|xuất phát|trong tay/.test(q)) {
    return getClarifyStepTemplate(2, ctx).options;
  }
  if (/output|deliverable|file|word|slide|pdf|dàn ý|đầu ra/.test(q)) {
    return getClarifyStepTemplate(3, ctx).options;
  }
  if (/marketing|báo cáo|social|quảng cáo|campaign/.test(q)) {
    return getClarifyStepTemplate(1, {
      ...ctx,
      topicHint: `${ctx.topicHint} báo cáo marketing`,
    }).options;
  }

  return ["Phương án A", "Phương án B", "Chưa chắc — cần gợi ý"];
}

function isOpenClarifyingQuestion(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.includes("?") && trimmed.length < 600;
}

function extractIntroFromText(text: string): string {
  const trimmed = text.trim();
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [];
  if (sentences.length <= 1) return sentences[0]?.trim() ?? trimmed;
  return sentences.slice(0, -1).join(" ").trim();
}

function extractIntroFallback(fullText: string, questionSentence: string): string {
  const intro = fullText.replace(questionSentence, "").trim();
  return intro.replace(/[—–-]\s*$/, "").trim();
}

function normalizeQuestionSentence(sentence: string): string {
  const trimmed = sentence.trim();
  if (trimmed.endsWith("?")) return trimmed;
  return `${trimmed.replace(/[.!…]+$/, "")}?`;
}

function splitInlineOptions(raw: string): string[] {
  return raw
    .split(/\s*,\s*|\s+hay\s+|\s+hoặc\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ensureOtherOption(options: string[]): string[] {
  const hasOther = options.some((o) => /^khác/i.test(o));
  if (hasOther) return options;
  return [...options, OTHER_OPTION];
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
