import { SAFETY_PREFIX, THINKING_PREFIX } from "@/lib/chat-thinking-phrases";

export type ChatStreamParseState = {
  buffer: string;
  safetyShown: boolean;
  thinkingText: string | null;
  answerText: string;
};

export function createChatStreamParseState(): ChatStreamParseState {
  return {
    buffer: "",
    safetyShown: false,
    thinkingText: null,
    answerText: "",
  };
}

/** Cập nhật state từ chunk stream plain-text; trả về true nếu có thay đổi answer. */
export function appendChatStreamChunk(
  state: ChatStreamParseState,
  chunk: string,
): { state: ChatStreamParseState; answerChanged: boolean } {
  let buffer = state.buffer + chunk;
  let safetyShown = state.safetyShown;
  let thinkingText = state.thinkingText;
  let answerText = state.answerText;
  let answerChanged = false;

  if (!safetyShown && buffer.includes(SAFETY_PREFIX)) {
    const newline = buffer.indexOf("\n");
    if (newline >= 0) {
      buffer = buffer.slice(newline + 1);
      safetyShown = true;
    }
  }

  while (true) {
    const thinkingIdx = buffer.indexOf(THINKING_PREFIX);
    if (thinkingIdx < 0) break;

    if (thinkingIdx > 0) {
      const prefix = buffer.slice(0, thinkingIdx);
      if (prefix) {
        answerText += prefix;
        answerChanged = true;
      }
      buffer = buffer.slice(thinkingIdx);
    }

    const lineEnd = buffer.indexOf("\n");
    if (lineEnd < 0) break;

    const line = buffer.slice(0, lineEnd);
    buffer = buffer.slice(lineEnd + 1);
    thinkingText = line.slice(THINKING_PREFIX.length).trim() || thinkingText;
  }

  if (buffer && !buffer.includes(THINKING_PREFIX)) {
    answerText += buffer;
    answerChanged = true;
    buffer = "";
  } else if (!buffer.includes(THINKING_PREFIX)) {
    buffer = "";
  }

  return {
    state: {
      buffer,
      safetyShown,
      thinkingText,
      answerText,
    },
    answerChanged,
  };
}
