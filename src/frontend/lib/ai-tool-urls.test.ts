import { describe, expect, it } from "vitest";
import { AI_TOOL_URLS, resolveToolUrl } from "./ai-tool-urls";

describe("ai-tool-urls", () => {
  it("maps known starter-kit tools to HTTPS URLs", () => {
    expect(resolveToolUrl("ChatGPT")).toBe("https://chatgpt.com");
    expect(resolveToolUrl("Canva AI")).toBe("https://www.canva.com");
    expect(resolveToolUrl("Gemini")).toBe("https://gemini.google.com");
  });

  it("prefers explicit url on tool record", () => {
    expect(resolveToolUrl("ChatGPT", "https://example.com")).toBe(
      "https://example.com",
    );
  });

  it("covers every tool name used in roles starter kits", () => {
    const names = [
      "ChatGPT",
      "Claude",
      "Gamma",
      "Fireflies",
      "Copilot",
      "ChatPDF",
      "Canva AI",
      "Gemini",
      "Zapier",
      "Notion AI",
    ];
    for (const name of names) {
      expect(AI_TOOL_URLS[name], name).toMatch(/^https:\/\//);
    }
  });
});
