import type { AgentCapability, AgentContext } from "@/lib/agents/types";
import type { RoleId } from "@/lib/openai";

export const RECOMMENDER_ENGINE_VERSION = "1.0.0";

export const RECOMMENDER_WEIGHTS = {
  roleMatch: 35,
  assessmentGap: 25,
  goalMatch: 20,
  aiLevelFit: 15,
  managerPriority: 5,
} as const;

export type ReasonCode =
  | "role-match"
  | "assessment-gap"
  | "goal-alignment"
  | "level-fit"
  | "manager-priority"
  | "prerequisite-ready"
  | "common-foundation";

export type RecommendableModule = {
  id: string;
  roleId: RoleId | "common";
  level: number;
  sortOrder: number;
  scope: "global" | "organization";
  organizationId?: string | null;
  status: "published" | "draft";
  prerequisites?: string[];
  goalTags?: string[];
};

export type RecommenderInput = {
  organizationId: string | null;
  roleId: RoleId;
  aiLevel: number;
  skipBasicModules?: boolean;
  masteredModuleIds: string[];
  assessmentGapModuleIds?: string[];
  managerPriorityModuleIds?: string[];
  goalTags?: string[];
  modules: RecommendableModule[];
  limit?: number;
};

export type ModuleRecommendation = {
  moduleId: string;
  score: number;
  reasonCodes: ReasonCode[];
  breakdown: Partial<Record<keyof typeof RECOMMENDER_WEIGHTS, number>>;
};

export type RecommenderOutput = {
  engineVersion: string;
  recommendations: ModuleRecommendation[];
};

function isEligible(
  mod: RecommendableModule,
  input: RecommenderInput,
): boolean {
  if (mod.status !== "published") return false;

  if (mod.scope === "organization") {
    if (!input.organizationId || mod.organizationId !== input.organizationId) {
      return false;
    }
  }

  if (input.masteredModuleIds.includes(mod.id)) return false;

  const prerequisites = mod.prerequisites ?? [];
  if (
    prerequisites.some((id) => !input.masteredModuleIds.includes(id))
  ) {
    return false;
  }

  if (input.skipBasicModules && mod.level <= 1 && mod.roleId !== "common") {
    return false;
  }

  return mod.roleId === input.roleId || mod.roleId === "common";
}

function scoreAiLevelFit(aiLevel: number, moduleLevel: number): number {
  if (aiLevel <= 1 && moduleLevel === 1) return RECOMMENDER_WEIGHTS.aiLevelFit;
  if (aiLevel >= 2 && aiLevel <= 3 && moduleLevel === 2) {
    return RECOMMENDER_WEIGHTS.aiLevelFit;
  }
  if (aiLevel >= 4 && moduleLevel >= 2) {
    return Math.round(RECOMMENDER_WEIGHTS.aiLevelFit * 0.85);
  }
  if (Math.abs(moduleLevel - Math.ceil((aiLevel + 1) / 2)) <= 1) {
    return Math.round(RECOMMENDER_WEIGHTS.aiLevelFit * 0.6);
  }
  return Math.round(RECOMMENDER_WEIGHTS.aiLevelFit * 0.25);
}

function scoreGoalMatch(
  module: RecommendableModule,
  goalTags: string[],
): number {
  if (goalTags.length === 0 || !module.goalTags?.length) return 0;
  const overlap = module.goalTags.filter((tag) => goalTags.includes(tag));
  if (overlap.length === 0) return 0;
  const ratio = overlap.length / Math.max(goalTags.length, module.goalTags.length);
  return Math.round(RECOMMENDER_WEIGHTS.goalMatch * ratio);
}

export function rankModules(input: RecommenderInput): ModuleRecommendation[] {
  const goalTags = input.goalTags ?? [];
  const gapIds = new Set(input.assessmentGapModuleIds ?? []);
  const priorityIds = new Set(input.managerPriorityModuleIds ?? []);

  const ranked = input.modules
    .filter((mod) => isEligible(mod, input))
    .map((mod) => {
      const breakdown: ModuleRecommendation["breakdown"] = {};
      const reasonCodes: ReasonCode[] = ["prerequisite-ready"];

      if (mod.roleId === "common") {
        breakdown.roleMatch = RECOMMENDER_WEIGHTS.roleMatch;
        reasonCodes.push("common-foundation", "role-match");
      } else if (mod.roleId === input.roleId) {
        breakdown.roleMatch = RECOMMENDER_WEIGHTS.roleMatch;
        reasonCodes.push("role-match");
      }

      if (gapIds.has(mod.id)) {
        breakdown.assessmentGap = RECOMMENDER_WEIGHTS.assessmentGap;
        reasonCodes.push("assessment-gap");
      }

      const goalScore = scoreGoalMatch(mod, goalTags);
      if (goalScore > 0) {
        breakdown.goalMatch = goalScore;
        reasonCodes.push("goal-alignment");
      }

      const levelScore = scoreAiLevelFit(input.aiLevel, mod.level);
      breakdown.aiLevelFit = levelScore;
      if (levelScore >= RECOMMENDER_WEIGHTS.aiLevelFit * 0.6) {
        reasonCodes.push("level-fit");
      }

      if (priorityIds.has(mod.id)) {
        breakdown.managerPriority = RECOMMENDER_WEIGHTS.managerPriority;
        reasonCodes.push("manager-priority");
      }

      const score = Object.values(breakdown).reduce((sum, n) => sum + (n ?? 0), 0);

      return {
        moduleId: mod.id,
        score,
        reasonCodes: [...new Set(reasonCodes)],
        breakdown,
        sortOrder: mod.sortOrder,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.sortOrder - b.sortOrder;
    });

  const limit = input.limit ?? ranked.length;
  return ranked.slice(0, limit).map(({ sortOrder: _sort, ...rest }) => rest);
}

export const pathRecommenderAgent: AgentCapability<
  RecommenderInput,
  RecommenderOutput
> = {
  name: "recommender",
  async execute(input, _context: AgentContext) {
    return {
      engineVersion: RECOMMENDER_ENGINE_VERSION,
      recommendations: rankModules(input),
    };
  },
};
