import { describe, expect, it } from "vitest";
import {
  appendChatStreamChunk,
  createChatStreamParseState,
} from "@/lib/chat-stream-parse";

describe("chat-stream-parse", () => {
  it("parses thinking lines then answer", () => {
    let state = createChatStreamParseState();
    ({ state } = appendChatStreamChunk(
      state,
      "__THINKING__:Đang đọc câu hỏi...\n__THINKING__:Kiểm tra dữ kiện...\n",
    ));
    expect(state.thinkingText).toBe("Kiểm tra dữ kiện...");
    expect(state.answerText).toBe("");

    ({ state } = appendChatStreamChunk(state, "Xin chào "));
    ({ state } = appendChatStreamChunk(state, "bạn!"));
    expect(state.answerText).toBe("Xin chào bạn!");
  });
});
