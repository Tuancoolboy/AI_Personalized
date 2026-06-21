import {
  encodeThinkingLine,
  nextThinkingPhrase,
} from "@/lib/chat-thinking-phrases";

const THINKING_INTERVAL_MS = 1100;

/** Emit thinking lines on interval until `stop()` — dùng trước khi OpenAI trả token đầu. */
export function startThinkingTicker(
  enqueue: (chunk: Uint8Array) => void,
  encoder: TextEncoder,
): { stop: () => void } {
  let index = 0;
  enqueue(encoder.encode(encodeThinkingLine(nextThinkingPhrase(index))));
  index += 1;

  const timer = setInterval(() => {
    enqueue(encoder.encode(encodeThinkingLine(nextThinkingPhrase(index))));
    index += 1;
  }, THINKING_INTERVAL_MS);

  return {
    stop: () => {
      clearInterval(timer);
    },
  };
}
