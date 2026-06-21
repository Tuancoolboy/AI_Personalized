import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatConversationBody } from "./chat-conversation-body";

describe("ChatConversationBody", () => {
  const baseProps = {
    sessionKey: "session-1",
    messages: [
      {
        id: "greeting",
        role: "assistant" as const,
        content: "Chào bạn!",
      },
    ],
    typing: false,
    thinkingText: null,
    scrollRef: createRef<HTMLDivElement>(),
    bottomRef: createRef<HTMLDivElement>(),
  };

  it("does not animate the whole loaded conversation on message updates", () => {
    const html = renderToStaticMarkup(
      createElement(ChatConversationBody, {
        ...baseProps,
        sessionLoading: false,
      }),
    );

    expect(html).not.toContain("animate-chat-session-enter");
    expect(html).not.toContain("animate-chat-session-loading");
  });

  it("keeps the loading animation only for the loading placeholder", () => {
    const html = renderToStaticMarkup(
      createElement(ChatConversationBody, {
        ...baseProps,
        sessionLoading: true,
      }),
    );

    expect(html).toContain("animate-chat-session-loading");
  });
});
