// Resolve đầu vào agent server-side cho 2 luồng + tính fingerprint cache.
// Luồng suy từ organization_members (có = công ty, không = cá nhân) — KHÔNG account_type.
// Demo mode: lấy từ hint body (không có DB). Supabase mode: query DB (nguồn sự thật).

import type { ApiSession } from "@/lib/api-auth";
import { DEFAULT_PRIMARY_TOOL, isPrimaryTool } from "@/lib/ai-tools-config";
import { suggestToolForIndividual } from "@/lib/individual-tool-suggest";
import {
  loadOrganizationLearningContext,
  type AssignedPathModuleHint,
} from "@/lib/chat-knowledge-company";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { coerceRoleId } from "@/lib/role-ids";
import { inferAssessmentGapModuleIds } from "@/lib/training-modules-adapter";
import { getRoleSkillSlugs } from "./path-agent-catalog";
import type { AgentFlowInput } from "./path-agent-types";

// Hint từ client — CHỈ dùng ở demo mode (không có DB). Supabase mode bỏ qua hint
// nhạy cảm, server tự resolve từ DB để chống giả mạo.
export type AgentInputHints = {
  roleId?: string;
  aiLevel?: number;
  completedModuleIds?: string[];
  dailyTasks?: string[];
};

function clampLevel(n: unknown): number {
  const v = typeof n === "number" ? n : Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return 0;
  return Math.min(5, Math.max(0, Math.trunc(v)));
}

function uniqStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter((x): x is string => typeof x === "string"))];
}

function clampHintLevel(level: number | null | undefined): 1 | 2 | 3 {
  if (level === 3) return 3;
  if (level === 2) return 2;
  return 1;
}

function normalizeAssignedPathModules(
  modules: AssignedPathModuleHint[],
): AssignedPathModuleHint[] {
  const byId = new Map<string, AssignedPathModuleHint>();
  for (const mod of modules) {
    if (!mod.id) continue;
    byId.set(mod.id, {
      id: mod.id,
      title: mod.title,
      level: clampHintLevel(mod.level),
      isFoundation: mod.isFoundation,
      isRequired: mod.isRequired,
    });
  }
  return [...byId.values()];
}

function attachPersonalizationSignals(
  input: Omit<AgentFlowInput, "assessmentGapModuleIds" | "goalTags"> & {
    goalTags?: string[];
    assessmentGapModuleIds?: string[];
  },
): AgentFlowInput {
  const roleId = coerceRoleId(input.roleId);
  const goalTags =
    input.goalTags && input.goalTags.length > 0
      ? input.goalTags
      : input.dailyTasks;
  return {
    ...input,
    roleId,
    goalTags,
    assessmentGapModuleIds:
      input.assessmentGapModuleIds ??
      inferAssessmentGapModuleIds(roleId, input.aiLevel),
  };
}

// Demo mode: dựng input từ hint client (cá nhân là mặc định ở demo).
function resolveDemoInput(hints: AgentInputHints): AgentFlowInput {
  const roleId = coerceRoleId(hints.roleId, "khac");
  const aiLevel = clampLevel(hints.aiLevel);
  const dailyTasks = uniqStrings(hints.dailyTasks);
  return attachPersonalizationSignals({
    flow: "individual",
    roleId,
    aiLevel,
    skillSlugs: getRoleSkillSlugs(roleId),
    primaryTool: suggestToolForIndividual(roleId).tool,
    completedModuleIds: uniqStrings(hints.completedModuleIds),
    dailyTasks,
    organizationName: null,
    departmentId: null,
    assignedPathTitle: null,
    assignedPathModules: [],
  });
}

type ProfileRow = {
  role_id: string | null;
  ai_level: number | null;
  daily_tasks: string[] | null;
  assessment_result: { dailyTasks?: string[] } | null;
};

type SupabaseFlowParts = {
  roleId: string;
  aiLevel: number;
  dailyTasks: string[];
  goalTags: string[];
  completedModuleIds: string[];
  organizationId: string | null;
  positionSkillSlugs: string[];
  learningContext: Awaited<ReturnType<typeof loadOrganizationLearningContext>>;
};

// Pure mapper — test được mà không mock Supabase.
export function buildSupabaseFlowInput(parts: SupabaseFlowParts): AgentFlowInput {
  const {
    roleId,
    aiLevel,
    dailyTasks,
    goalTags,
    completedModuleIds,
    organizationId,
    positionSkillSlugs,
    learningContext,
  } = parts;

  if (!organizationId) {
    return attachPersonalizationSignals({
      flow: "individual",
      roleId,
      aiLevel,
      skillSlugs: getRoleSkillSlugs(roleId),
      primaryTool: suggestToolForIndividual(roleId).tool,
      completedModuleIds,
      dailyTasks,
      goalTags,
      organizationName: null,
      departmentId: null,
      assignedPathTitle: null,
      assignedPathModules: [],
    });
  }

  const orgTool =
    learningContext.companyTool && isPrimaryTool(learningContext.companyTool)
      ? learningContext.companyTool
      : DEFAULT_PRIMARY_TOOL;

  return attachPersonalizationSignals({
    flow: "company",
    roleId,
    aiLevel,
    skillSlugs:
      positionSkillSlugs.length > 0
        ? positionSkillSlugs
        : getRoleSkillSlugs(roleId),
    primaryTool: orgTool,
    completedModuleIds,
    dailyTasks,
    goalTags,
    organizationName: learningContext.organizationName,
    departmentId: learningContext.departmentId,
    assignedPathTitle: learningContext.assignedPathTitle,
    assignedPathModules: normalizeAssignedPathModules(
      learningContext.assignedPathModules,
    ),
  });
}

// Supabase mode: query DB. Org membership quyết định luồng.
async function resolveSupabaseInput(userId: string): Promise<AgentFlowInput> {
  const supabase = createSupabaseServiceClient();

  const [{ data: profile }, { data: progress }, { data: membership }, learningContext] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role_id, ai_level, daily_tasks, assessment_result")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("module_progress")
        .select("module_id")
        .eq("user_id", userId)
        .eq("status", "hoan-thanh"),
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .maybeSingle(),
      loadOrganizationLearningContext(userId),
    ]);

  const prof = (profile ?? null) as ProfileRow | null;
  const roleId = coerceRoleId(prof?.role_id, "khac");
  const aiLevel = clampLevel(prof?.ai_level);
  const dailyTasks = uniqStrings(prof?.daily_tasks);
  const assessmentGoals = uniqStrings(prof?.assessment_result?.dailyTasks);
  const goalTags = assessmentGoals.length > 0 ? assessmentGoals : dailyTasks;
  const completedModuleIds = uniqStrings(
    (progress ?? []).map((r: { module_id: string }) => r.module_id),
  );
  const organizationId = membership?.organization_id ?? null;

  let positionSkillSlugs: string[] = [];
  if (organizationId) {
    const { data: memberPosition } = await supabase
      .from("member_positions")
      .select("position_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (memberPosition?.position_id) {
      const { data: posSkills } = await supabase
        .from("position_skills")
        .select("skills(slug)")
        .eq("position_id", memberPosition.position_id);

      positionSkillSlugs = uniqStrings(
        (posSkills ?? [])
          .map((r) => {
            const skills = (r as { skills?: { slug?: string } | { slug?: string }[] | null })
              .skills;
            if (!skills) return null;
            if (Array.isArray(skills)) return skills[0]?.slug ?? null;
            return skills.slug ?? null;
          })
          .filter((s): s is string => Boolean(s)),
      );
    }
  }

  return buildSupabaseFlowInput({
    roleId,
    aiLevel,
    dailyTasks,
    goalTags,
    completedModuleIds,
    organizationId,
    positionSkillSlugs,
    learningContext,
  });
}

export async function resolveFlowInput(
  session: ApiSession,
  hints: AgentInputHints,
): Promise<AgentFlowInput> {
  if (session.mode === "demo") return resolveDemoInput(hints);
  return resolveSupabaseInput(session.userId);
}

// Preview cho quản lý: nhận TRỰC TIẾP danh sách kỹ năng phòng + vị trí (+ level đại
// diện) → input luồng công ty, KHÔNG đọc DB. Dùng cho nút "AI gợi ý lộ trình" ở
// builder phòng ban (quản lý chưa phải người học).
export type DeptPreviewHints = {
  skillSlugs: string[];
  roleId?: string;
  aiLevel?: number;
  primaryTool?: string;
};

export function buildDeptPreviewInput(hints: DeptPreviewHints): AgentFlowInput {
  const roleId = coerceRoleId(hints.roleId, "khac");
  const aiLevel = clampLevel(hints.aiLevel ?? 1);
  const primaryTool =
    hints.primaryTool && isPrimaryTool(hints.primaryTool)
      ? hints.primaryTool
      : DEFAULT_PRIMARY_TOOL;
  return attachPersonalizationSignals({
    flow: "company",
    roleId,
    aiLevel,
    skillSlugs: uniqStrings(hints.skillSlugs),
    primaryTool,
    completedModuleIds: [],
    dailyTasks: [],
    goalTags: [],
    organizationName: null,
    departmentId: null,
    assignedPathTitle: null,
    assignedPathModules: [],
  });
}

// djb2 hash → fingerprint ngắn, ổn định cho cache. Đổi đầu vào đáng kể → đổi hash.
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

// Fingerprint: flow|role|level|skills|completed|dailyTasks|company context.
// Đổi nguồn sự thật lớn → cache đổi theo, tránh giữ lộ trình cũ quá lâu.
export function computeFingerprint(input: AgentFlowInput): string {
  const parts = [
    input.flow,
    input.roleId,
    String(input.aiLevel),
    [...input.skillSlugs].sort().join(","),
    [...input.completedModuleIds].sort().join(","),
    [...input.dailyTasks].sort().join(","),
    [...input.goalTags].sort().join(","),
    [...input.assessmentGapModuleIds].sort().join(","),
    input.organizationName ?? "",
    input.departmentId ?? "",
    input.assignedPathTitle ?? "",
    (input.assignedPathModules ?? [])
      .map((mod) => `${mod.id}:${mod.level}`)
      .sort()
      .join(","),
  ].join("|");
  return djb2(parts);
}
