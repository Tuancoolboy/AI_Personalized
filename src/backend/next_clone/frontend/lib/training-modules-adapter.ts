import { LEARNING_MODULES } from "@/lib/learning-modules-data";
import type { RecommendableModule } from "@/lib/agents/recommender";
import type { RoleId } from "@/lib/openai";

/** Chuyển curriculum global hiện có sang catalog cho Agent 3. */
export function buildGlobalModuleCatalog(): RecommendableModule[] {
  const byRole = new Map<string, typeof LEARNING_MODULES>();

  for (const mod of LEARNING_MODULES) {
    const list = byRole.get(mod.role_id) ?? [];
    list.push(mod);
    byRole.set(mod.role_id, list);
  }

  return LEARNING_MODULES.map((mod) => {
    const roleModules = [...(byRole.get(mod.role_id) ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const idx = roleModules.findIndex((m) => m.id === mod.id);
    const prerequisiteId =
      idx > 0 ? (roleModules[idx - 1]?.id ?? undefined) : undefined;

    return {
      id: mod.id,
      roleId: mod.role_id as RoleId,
      level: mod.level,
      sortOrder: mod.sort_order,
      scope: "global" as const,
      status: "published" as const,
      prerequisites: prerequisiteId ? [prerequisiteId] : [],
      goalTags: mod.learnings.map((item) =>
        item.toLowerCase().replace(/\s+/g, "-").slice(0, 40),
      ),
    };
  });
}

export function inferAssessmentGapModuleIds(
  roleId: RoleId,
  aiLevel: number,
): string[] {
  const catalog = buildGlobalModuleCatalog().filter((m) => m.roleId === roleId);
  if (aiLevel <= 1) {
    return catalog.filter((m) => m.level === 1).map((m) => m.id);
  }
  if (aiLevel <= 3) {
    return catalog.filter((m) => m.level === 2).map((m) => m.id);
  }
  return catalog.filter((m) => m.level >= 3).map((m) => m.id);
}
