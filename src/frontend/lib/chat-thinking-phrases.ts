export const CHAT_THINKING_PHRASES = [
  "Đang đọc câu hỏi của bạn...",
  "Kiểm tra xem còn thiếu thông tin gì không...",
  "Đối chiếu với lộ trình và ngữ cảnh công việc...",
  "Suy nghĩ hướng dẫn — em sẽ không làm hộ bạn...",
  "Chuẩn bị các bước và câu hỏi gợi ý tiếp theo...",
  "Rà soát an toàn dữ liệu và phạm vi câu trả lời...",
] as const;

export function nextThinkingPhrase(index: number): string {
  return CHAT_THINKING_PHRASES[index % CHAT_THINKING_PHRASES.length];
}

export const THINKING_PREFIX = "__THINKING__:";
export const SAFETY_PREFIX = "__SAFETY__:";

export function encodeThinkingLine(phrase: string): string {
  return `${THINKING_PREFIX}${phrase}\n`;
}
