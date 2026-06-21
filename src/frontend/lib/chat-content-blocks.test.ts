import { describe, expect, it } from "vitest";
import {
  normalizeChatTextBlock,
  splitChatContentBlocks,
} from "./chat-content-blocks";

describe("chat-content-blocks", () => {
  it("splits fenced code blocks from text", () => {
    const blocks = splitChatContentBlocks(
      "Intro\n\n```\nPrompt line 1\nPrompt line 2\n```\n\nOutro",
    );
    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toEqual({
      type: "code",
      content: "Prompt line 1\nPrompt line 2",
    });
  });

  it("normalizes inline headings and list markers onto separate lines", () => {
    const normalized = normalizeChatTextBlock(
      "1. Giới thiệu\n- Mục đích báo cáo. - Thời gian báo cáo. 3. Tổng quan số liệu ### Lưu ý: - Kiểm tra file HR trước khi kết luận.",
    );

    expect(normalized).toContain(".\n- Thời gian báo cáo.");
    expect(normalized).toContain("\n\n3. Tổng quan số liệu");
    expect(normalized).toContain("\n\n### Lưu ý:");
    expect(normalized).toContain(":\n- Kiểm tra file HR trước khi kết luận.");
  });
});
