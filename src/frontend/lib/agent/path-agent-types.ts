// Types dùng chung cho Agent sinh lộ trình (2 luồng công ty / cá nhân).
// Agent CHỈ chọn + sắp xếp bài từ kho (LEARNING_MODULES); không bịa bài.

export type AgentFlow = "company" | "individual";

export type PathModuleHint = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  isFoundation: boolean;
  isRequired?: boolean;
};

// Đầu vào đã được server resolve (client KHÔNG gửi skills/level → chống giả mạo).
export type AgentFlowInput = {
  flow: AgentFlow;
  // Vị trí / vai trò người học (role_id trong roles.ts).
  roleId: string;
  // Level AI hiện tại 0-5 (tái dùng assessment).
  aiLevel: number;
  // Kỹ năng mục tiêu: công ty = position_skills; cá nhân = skill của vai trò.
  skillSlugs: string[];
  // Công cụ AI chính: công ty = organizations.ai_tool; cá nhân = gợi ý theo vị trí.
  primaryTool: string;
  // Module đã hoàn thành (để bỏ bài đã xong + ưu tiên bài kế tiếp).
  completedModuleIds: string[];
  // Tag công việc hằng ngày (assessment Q3 / profiles.daily_tasks).
  dailyTasks: string[];
  /** Tag mục tiêu từ assessment — dùng chung logic với rankModules.goalTags. */
  goalTags: string[];
  /** Module nên ưu tiên để lấp lỗ hổng năng lực (inferAssessmentGapModuleIds). */
  assessmentGapModuleIds: string[];
  organizationName?: string | null;
  departmentId?: string | null;
  assignedPathTitle?: string | null;
  assignedPathModules?: PathModuleHint[];
};

// 1 bài trong candidate pool gửi lên agent — CHỈ metadata, không PII.
export type CandidateModule = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  roleId: string;
  skills: string[];
  isFoundation: boolean;
};

// 1 nhóm bài trong lộ trình kèm lý do (agent hoặc fallback sinh ra).
export type AgentPathGroup = {
  title: string;
  reason: string;
  moduleIds: string[];
};

// Kết quả cuối trả về client + lưu cache.
export type AgentPathResult = {
  source: "agent" | "fallback";
  flow: AgentFlow;
  summary: string;
  groups: AgentPathGroup[];
  orderedModuleIds: string[];
  missingSkills: string[];
  fingerprint: string;
};

// Phần JSON thô agent trả về (trước validate). Mọi id phải được validate lại.
export type AgentRawOutput = {
  summary?: unknown;
  groups?: unknown;
  missingSkills?: unknown;
};
