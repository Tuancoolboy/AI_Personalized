import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistantChatMessageList } from "./assistant-chat-messages";

describe("AssistantChatMessageList", () => {
  it("renders messages even when stored history contains duplicate ids", () => {
    const html = renderToStaticMarkup(
      createElement(AssistantChatMessageList, {
        messages: [
          { id: "stored-id", role: "user", content: "Câu hỏi đầu" },
          { id: "stored-id", role: "assistant", content: "Câu trả lời đầu" },
        ],
        typing: false,
        variant: "full",
      }),
    );

    expect(html).toContain("Câu hỏi đầu");
    expect(html).toContain("Câu trả lời đầu");
  });
});
