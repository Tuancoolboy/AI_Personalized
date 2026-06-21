export type ChatContentBlock =
  | { type: "text"; content: string }
  | { type: "code"; content: string };

export function splitChatContentBlocks(text: string): ChatContentBlock[] {
  const blocks: ChatContentBlock[] = [];
  const fence = /```(?:[\w-]*\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: "text",
        content: normalizeChatTextBlock(text.slice(lastIndex, match.index)),
      });
    }
    blocks.push({ type: "code", content: match[1]?.trimEnd() ?? "" });
    lastIndex = fence.lastIndex;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: "text",
      content: normalizeChatTextBlock(text.slice(lastIndex)),
    });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", content: normalizeChatTextBlock(text) });
  }

  return blocks;
}

export function normalizeChatTextBlock(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/([.!?])\s+(#{1,3}\s+)/g, "$1\n\n$2")
    .replace(/([.!?])\s+(-\s+)/g, "$1\n$2")
    .replace(/([.!?])\s+(\d+\.\s+)/g, "$1\n\n$2")
    .replace(/\s+(#{1,3}\s+)/g, "\n\n$1")
    .replace(/(#{1,3}[^\n]*?:)\s+(-\s+)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
