// Gợi ý công cụ AI cho người dùng CÁ NHÂN (Phần C §4).
// Sau bài test onboarding, dựa vào vị trí/công việc → gợi ý tool phù hợp.
// Người dùng vẫn được tự đổi. Pure (test được), không I/O.

import type { PrimaryAiTool } from "@/lib/ai-tools-config";

export type ToolSuggestion = {
  tool: PrimaryAiTool;
  reason: string;
};

// Map vai trò → thiên hướng công việc → tool gợi ý.
// - thiết kế/ảnh → ChatGPT (DALL-E) · văn bản/phân tích → Claude
// - bảng tính/Office → Copilot · Google Workspace → Gemini
const ROLE_SUGGESTION: Record<string, ToolSuggestion> = {
  marketing: {
    tool: "chatgpt",
    reason: "Công việc của bạn thiên về sáng tạo & hình ảnh — ChatGPT tạo được ảnh (DALL-E).",
  },
  "ke-toan": {
    tool: "copilot",
    reason: "Bạn làm nhiều với bảng tính/Office — Copilot hỗ trợ ngay trong Excel.",
  },
  "kinh-doanh": {
    tool: "claude",
    reason: "Bạn cần soạn thảo & phân tích văn bản nhiều — Claude mạnh ở tiếng Việt dài.",
  },
  "van-hanh": {
    tool: "claude",
    reason: "Công việc hành chính/HR cần soạn văn bản chuẩn — Claude phù hợp nhất.",
  },
  khac: {
    tool: "claude",
    reason: "Công việc văn phòng đa nhiệm — Claude là lựa chọn an toàn cho văn bản.",
  },
};

const DEFAULT_SUGGESTION: ToolSuggestion = {
  tool: "claude",
  reason: "Mặc định Claude — mạnh cho văn bản tiếng Việt; bạn có thể đổi sau.",
};

export function suggestToolForIndividual(roleId: string | null | undefined): ToolSuggestion {
  if (!roleId) return DEFAULT_SUGGESTION;
  return ROLE_SUGGESTION[roleId] ?? DEFAULT_SUGGESTION;
}
