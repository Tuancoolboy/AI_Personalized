// Cấu hình công cụ AI (mục 3): Tool chính (công ty chọn 1) + Tool chuyên dụng
// (gắn theo bài học). Dùng cho hiển thị trong bài học + trang chọn tool công ty.

export type AiToolCategory = "primary" | "specialist";
export type AiToolCapability = "image" | "video" | "design";

export type AiToolConfig = {
  key: string;
  name: string;
  provider: string;
  url: string;
  icon: string;
  signupGuide: string;
  recommended: boolean;
  category: AiToolCategory;
  capability?: AiToolCapability;
  pros: string[];
  note: string | null;
  // Video hướng dẫn tạo tài khoản tool (Phần C §3). null = chưa có link.
  videoGuide: string | null;
};

// Tool chính hợp lệ (khớp check constraint organizations.ai_tool).
export type PrimaryAiTool = "claude" | "chatgpt" | "gemini" | "copilot";

export const AI_TOOLS: Record<string, AiToolConfig> = {
  // === TOOL CHÍNH (công ty chọn 1) ===
  claude: {
    key: "claude",
    name: "Claude",
    provider: "Anthropic",
    url: "https://claude.ai",
    icon: "/images/tools/claude.svg",
    signupGuide:
      "Truy cập claude.ai → Đăng ký bằng email hoặc Google → Bắt đầu dùng miễn phí",
    recommended: true,
    category: "primary",
    pros: [
      "Trả lời chính xác nhất cho văn bản tiếng Việt",
      "Hiểu context dài",
      "Miễn phí cơ bản",
    ],
    note: "Được khuyên dùng — prompt trong khóa học được tối ưu cho Claude",
    videoGuide: "https://www.youtube.com/watch?v=LYDxj8sAnz0",
  },
  chatgpt: {
    key: "chatgpt",
    name: "ChatGPT",
    provider: "OpenAI",
    url: "https://chat.openai.com",
    icon: "/images/tools/chatgpt.svg",
    signupGuide: "Truy cập chat.openai.com → Đăng ký → Dùng GPT-4o miễn phí",
    recommended: false,
    category: "primary",
    pros: ["Phổ biến nhất", "Tạo được ảnh (DALL-E)", "Có app mobile"],
    note: null,
    videoGuide: null,
  },
  gemini: {
    key: "gemini",
    name: "Gemini",
    provider: "Google",
    url: "https://gemini.google.com",
    icon: "/images/tools/gemini.svg",
    signupGuide:
      "Truy cập gemini.google.com → Đăng nhập bằng tài khoản Google",
    recommended: false,
    category: "primary",
    pros: ["Tích hợp Google Workspace", "Miễn phí với tài khoản Google"],
    note: null,
    videoGuide: null,
  },
  copilot: {
    key: "copilot",
    name: "Copilot",
    provider: "Microsoft",
    url: "https://copilot.microsoft.com",
    icon: "/images/tools/copilot.svg",
    signupGuide:
      "Truy cập copilot.microsoft.com → Đăng nhập bằng tài khoản Microsoft",
    recommended: false,
    category: "primary",
    pros: ["Tích hợp Microsoft 365", "Có sẵn trong Edge/Windows"],
    note: null,
    videoGuide: null,
  },

  // === TOOL CHUYÊN DỤNG (gắn theo bài học) ===
  "chatgpt-image": {
    key: "chatgpt-image",
    name: "ChatGPT (tạo ảnh)",
    provider: "OpenAI",
    url: "https://chat.openai.com",
    icon: "/images/tools/chatgpt.svg",
    signupGuide: 'Dùng ChatGPT → gõ "tạo ảnh..." → DALL-E tự tạo',
    recommended: false,
    category: "specialist",
    capability: "image",
    pros: ["Tạo ảnh từ mô tả text", "Chỉnh sửa ảnh bằng lời"],
    note: "Công cụ tối ưu cho bài học cần tạo ảnh",
    videoGuide: null,
  },
  "canva-ai": {
    key: "canva-ai",
    name: "Canva AI",
    provider: "Canva",
    url: "https://canva.com",
    icon: "/images/tools/canva.svg",
    signupGuide:
      "Truy cập canva.com → Đăng ký miễn phí → Dùng Magic Design",
    recommended: false,
    category: "specialist",
    capability: "design",
    pros: ["Thiết kế slide, poster, banner", "Template sẵn", "Miễn phí cơ bản"],
    note: "Dùng cho bài học cần thiết kế — tạo slide, poster, banner",
    videoGuide: null,
  },
  runway: {
    key: "runway",
    name: "Runway",
    provider: "Runway",
    url: "https://runwayml.com",
    icon: "/images/tools/runway.svg",
    signupGuide: "Truy cập runwayml.com → Đăng ký → Dùng Gen-3 tạo video",
    recommended: false,
    category: "specialist",
    capability: "video",
    pros: ["Tạo video từ text/ảnh", "Chỉnh sửa video bằng AI"],
    note: "Dùng cho bài học cần tạo video ngắn",
    videoGuide: null,
  },
};

export const PRIMARY_TOOLS: AiToolConfig[] = Object.values(AI_TOOLS).filter(
  (t) => t.category === "primary",
);

export const DEFAULT_PRIMARY_TOOL: PrimaryAiTool = "claude";

export function isPrimaryTool(value: string): value is PrimaryAiTool {
  const t = AI_TOOLS[value];
  return Boolean(t && t.category === "primary");
}
