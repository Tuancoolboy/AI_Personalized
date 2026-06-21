/** URL chính thức của công cụ AI trong starter kit — dùng khi mở từ /lo-trinh. */
export const AI_TOOL_URLS: Record<string, string> = {
  ChatGPT: "https://chatgpt.com",
  Claude: "https://claude.ai",
  Gamma: "https://gamma.app",
  Fireflies: "https://fireflies.ai",
  Copilot: "https://copilot.microsoft.com",
  ChatPDF: "https://www.chatpdf.com",
  "Canva AI": "https://www.canva.com",
  Gemini: "https://gemini.google.com",
  Zapier: "https://zapier.com",
  "Notion AI": "https://www.notion.so",
};

export function resolveToolUrl(name: string, url?: string): string {
  return url?.trim() || AI_TOOL_URLS[name] || "#";
}
