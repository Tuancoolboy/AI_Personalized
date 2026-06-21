export const CLARIFY_PREFIX = "__CLARIFY__:";

/** Số câu hỏi card tối đa mỗi yêu cầu (3 lớp điểm rẽ). */
export const MAX_CLARIFY_QUESTIONS = 3;

export type ClarifyingQuestion = {
  step: number;
  total: number;
  question: string;
  options: string[];
};

export type ParsedAssistantMessage = {
  content: string;
  clarify?: ClarifyingQuestion;
};
