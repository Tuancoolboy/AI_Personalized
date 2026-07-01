import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoleId } from "@/lib/openai";
import { coerceRoleId } from "@/lib/role-ids";

export type RecommenderUserContext = {
  organizationId: string | null;
  roleId: RoleId;
  aiLevel: number;
  masteredModuleIds: string[];
  goalTags: string[];
  managerPriorityModuleIds: string[];
};

function isMissingLearningSchema(message: string): boolean {
  return /learning_assignments|learning_path_modules|does not exist/i.test(
    message,
  );
}

export async function loadManagerPriorityModuleIds(
  supabase: SupabaseClient,
  userId: string,
  masteredModuleIds: string[],
): Promise<string[]> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("learning_assignments")
    .select("learning_path_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(3);

  if (assignmentError) {
    if (isMissingLearningSchema(assignmentError.message)) return [];
    console.warn("[recommender-context] assignment:", assignmentError.message);
    return [];
  }

  const assignment = Array.isArray(assignmentRows) ? assignmentRows[0] ?? null : null;
  if (!assignment?.learning_path_id) return [];

  const { data: pathModules, error: pathError } = await supabase
    .from("learning_path_modules")
    .select("legacy_module_id, sort_order, is_required")
    .eq("learning_path_id", assignment.learning_path_id)
    .order("sort_order", { ascending: true });

  if (pathError) {
    if (isMissingLearningSchema(pathError.message)) return [];
    console.warn("[recommender-context] path modules:", pathError.message);
    return [];
  }

  const mastered = new Set(masteredModuleIds);
  return (pathModules ?? [])
    .map((row) => row.legacy_module_id)
    .filter(
      (id): id is string =>
        typeof id === "string" && id.length > 0 && !mastered.has(id),
    )
    .slice(0, 5);
}

export async function loadRecommenderUserContext(
  supabase: SupabaseClient,
  userId: string,
  overrides?: { roleId?: string | null; aiLevel?: number },
): Promise<RecommenderUserContext> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id, ai_level, assessment_result")
    .eq("id", userId)
    .maybeSingle();

  const roleId = coerceRoleId(
    overrides?.roleId ?? profile?.role_id,
    "khac",
  );

  const aiLevel =
    overrides?.aiLevel !== undefined
      ? Math.min(5, Math.max(0, Math.round(overrides.aiLevel)))
      : typeof profile?.ai_level === "number"
        ? profile.ai_level
        : 0;

  const assessment = profile?.assessment_result as
    | { dailyTasks?: string[] }
    | null
    | undefined;
  const goalTags = Array.isArray(assessment?.dailyTasks)
    ? assessment.dailyTasks
    : [];

  const { data: progress } = await supabase
    .from("module_progress")
    .select("module_id")
    .eq("user_id", userId)
    .eq("status", "hoan-thanh");

  const masteredModuleIds = (progress ?? [])
    .map((row) => row.module_id)
    .filter((id): id is string => typeof id === "string");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  const organizationId = membership?.organization_id ?? null;
  const managerPriorityModuleIds = await loadManagerPriorityModuleIds(
    supabase,
    userId,
    masteredModuleIds,
  );

  return {
    organizationId,
    roleId,
    aiLevel,
    masteredModuleIds,
    goalTags,
    managerPriorityModuleIds,
  };
}

/** Chỉ ghi snapshot mới nếu chưa có batch gần đây (tránh spam mỗi lần mở trang). */
export async function shouldPersistRecommendations(
  supabase: SupabaseClient,
  userId: string,
  engineVersion: string,
  windowMs = 60 * 60 * 1000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("learning_recommendations")
    .select("id, engine_version, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    if (/learning_recommendations|does not exist/i.test(error.message)) {
      return false;
    }
    console.warn("[recommender-context] persist check:", error.message);
    return true;
  }

  if (!data?.length) return true;
  return data[0]?.engine_version !== engineVersion;
}

export function buildRecommendationSummary(
  moduleTitle: string,
  reasonLabels: string[],
): string {
  const reasons = reasonLabels.slice(0, 3).join(", ");
  return `Chúng tôi gợi ý «${moduleTitle}» vì ${reasons || "phù hợp tiến độ học của bạn"}.`;
}
