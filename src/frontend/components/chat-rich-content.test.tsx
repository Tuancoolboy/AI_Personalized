import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatRichContent } from "./chat-rich-content";

describe("ChatRichContent", () => {
  it("keeps user-tone content on light foreground classes", () => {
    const html = renderToStaticMarkup(
      <ChatRichContent
        text={"Tin nhắn user\n- Ý 1\n- Ý 2"}
        tone="user"
        variant="full"
      />,
    );

    expect(html).toContain("text-brand-foreground");
    expect(html).not.toContain("text-ink");
  });

  it("keeps one ordered list even when items are separated by blank lines", () => {
    const html = renderToStaticMarkup(
      <ChatRichContent
        text={"1. Bước một\n\n1. Bước hai\n\n1. Bước ba"}
        tone="assistant"
        variant="full"
      />,
    );

    expect((html.match(/<ol/g) ?? []).length).toBe(1);
    expect((html.match(/<li/g) ?? []).length).toBe(3);
  });
});
