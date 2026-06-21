// Helper công cụ AI (mục 3 + 6.4): MỘT nguồn sự thật cho ai_tool.
// - getOrgAiTool(): client đọc localStorage('org_ai_tool'); fail → 'claude'.
//   Real mode: layout/settings hydrate localStorage từ organizations.ai_tool.
// - getToolForModule(): bài có tool chuyên dụng → dùng tool đó; else tool chính.

import {
  AI_TOOLS,
  DEFAULT_PRIMARY_TOOL,
  isPrimaryTool,
  type AiToolConfig,
  type PrimaryAiTool,
} from "@/lib/ai-tools-config";

const ORG_TOOL_KEY = "org_ai_tool";

// Đọc tool chính hiện tại (client). Nguồn duy nhất mọi nơi gọi.
export function getOrgAiTool(): PrimaryAiTool {
  if (typeof window === "undefined") return DEFAULT_PRIMARY_TOOL;
  try {
    const raw = window.localStorage.getItem(ORG_TOOL_KEY);
    if (raw && isPrimaryTool(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_PRIMARY_TOOL;
}

// Ghi tool chính vào localStorage (đồng bộ client). Persistence DB do API lo.
export function setOrgAiTool(tool: string): PrimaryAiTool {
  const next: PrimaryAiTool = isPrimaryTool(tool) ? tool : DEFAULT_PRIMARY_TOOL;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ORG_TOOL_KEY, next);
    } catch {
      // ignore
    }
  }
  return next;
}

// Tool theo PHÒNG BAN (Phần C §1): mỗi phòng chọn 1 tool chính riêng.
// Demo localStorage key `dept_ai_tool:<departmentId>`; fallback tool công ty.
const DEPT_TOOL_PREFIX = "dept_ai_tool:";

export function getDeptAiTool(departmentId: string): PrimaryAiTool {
  if (typeof window !== "undefined" && departmentId) {
    try {
      const raw = window.localStorage.getItem(DEPT_TOOL_PREFIX + departmentId);
      if (raw && isPrimaryTool(raw)) return raw;
    } catch {
      // ignore
    }
  }
  // Phòng chưa chọn riêng → dùng tool chính công ty.
  return getOrgAiTool();
}

export function setDeptAiTool(departmentId: string, tool: string): PrimaryAiTool {
  const next: PrimaryAiTool = isPrimaryTool(tool) ? tool : DEFAULT_PRIMARY_TOOL;
  if (typeof window !== "undefined" && departmentId) {
    try {
      window.localStorage.setItem(DEPT_TOOL_PREFIX + departmentId, next);
    } catch {
      // ignore
    }
  }
  return next;
}

export type ResolvedTool = AiToolConfig & { reason?: string };

// Tool hiển thị cho 1 bài học. module.tool có giá trị → tool chuyên dụng.
export function getToolForModule(
  module: { tool?: string | null; toolReason?: string | null },
  orgAiTool: string,
): ResolvedTool {
  const moduleTool = module.tool ? AI_TOOLS[module.tool] : undefined;
  if (moduleTool) {
    return { ...moduleTool, reason: module.toolReason ?? undefined };
  }
  const primary = isPrimaryTool(orgAiTool)
    ? AI_TOOLS[orgAiTool]
    : AI_TOOLS[DEFAULT_PRIMARY_TOOL];
  return primary ?? AI_TOOLS[DEFAULT_PRIMARY_TOOL];
}
