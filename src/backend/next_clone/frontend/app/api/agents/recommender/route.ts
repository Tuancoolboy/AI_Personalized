import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { pathRecommenderAgent } from "@/lib/agents/recommender";
import { formatReasonCodes } from "@/lib/agents/reason-codes";
import {
  buildRecommendationSummary,
  loadRecommenderUserContext,
  shouldPersistRecommendations,
} from "@/lib/recommender-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  buildGlobalModuleCatalog,
  inferAssessmentGapModuleIds,
} from "@/lib/training-modules-adapter";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import type { RoleId } from "@/lib/openai";

type RecommenderPayload = {
  roleId?: unknown;
  aiLevel?: unknown;
  limit?: unknown;
  persist?: unknown;
  forcePersist?: unknown;
};

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: RecommenderPayload = {};
  try {
    body = (await request.json()) as RecommenderPayload;
  } catch {
    body = {};
  }

  let organizationId: string | null = null;
  let roleId: RoleId = "khac";
  let aiLevel = 0;
  let masteredModuleIds: string[] = [];
  let goalTags: string[] = [];
  let managerPriorityModuleIds: string[] = [];

  if (session.mode === "supabase" && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const ctx = await loadRecommenderUserContext(supabase, session.userId, {
      roleId:
        typeof body.roleId === "string" ? body.roleId.trim() : undefined,
      aiLevel:
        typeof body.aiLevel === "number" && Number.isFinite(body.aiLevel)
          ? body.aiLevel
          : undefined,
    });
    organizationId = ctx.organizationId;
    roleId = ctx.roleId;
    aiLevel = ctx.aiLevel;
    masteredModuleIds = ctx.masteredModuleIds;
    goalTags = ctx.goalTags;
    managerPriorityModuleIds = ctx.managerPriorityModuleIds;
  } else if (typeof body.roleId === "string") {
    roleId = body.roleId as RoleId;
  }

  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? Math.min(20, Math.round(body.limit))
      : 8;

  const output = await pathRecommenderAgent.execute(
    {
      organizationId,
      roleId,
      aiLevel,
      skipBasicModules: aiLevel >= 5,
      masteredModuleIds,
      assessmentGapModuleIds: inferAssessmentGapModuleIds(roleId, aiLevel),
      managerPriorityModuleIds,
      goalTags,
      modules: buildGlobalModuleCatalog(),
      limit,
    },
    { organizationId, userId: session.userId },
  );

  const recommendations = output.recommendations.map((item) => {
    const reasonLabels = formatReasonCodes(item.reasonCodes);
    const moduleTitle =
      getLearningModuleById(item.moduleId)?.title ?? item.moduleId;
    return {
      ...item,
      reasonLabels,
      summary: buildRecommendationSummary(moduleTitle, reasonLabels),
    };
  });

  const shouldPersist =
    body.persist === true &&
    session.mode === "supabase" &&
    isSupabaseConfigured();
  const forcePersist = body.forcePersist === true;

  if (shouldPersist) {
    const supabase = await createSupabaseServerClient();
    const allowed =
      forcePersist ||
      (await shouldPersistRecommendations(
        supabase,
        session.userId,
        output.engineVersion,
      ));

    if (allowed) {
      const rows = recommendations.map((item) => ({
        organization_id: organizationId,
        user_id: session.userId,
        candidate_module_id: item.moduleId,
        score: item.score,
        reason_codes: item.reasonCodes,
        engine_version: output.engineVersion,
      }));
      const { error } = await supabase.from("learning_recommendations").insert(rows);
      if (error) {
        console.warn("[agents/recommender] persist skipped:", error.message);
      }
    }
  }

  const top = recommendations[0] ?? null;

  return apiOk({
    engineVersion: output.engineVersion,
    roleId,
    aiLevel,
    managerPriorityModuleIds,
    topRecommendation: top
      ? {
          moduleId: top.moduleId,
          score: top.score,
          reasonLabels: top.reasonLabels,
          summary: top.summary,
        }
      : null,
    recommendations,
  });
}
