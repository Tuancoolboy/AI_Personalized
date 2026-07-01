import type { AgentFlowInput } from "./path-agent-types";

export type PathFallbackReason =
  | "no-key"
  | "no-client"
  | "empty-content"
  | "parse-fail"
  | "empty-output"
  | "exception";

/** Log có cấu trúc — không ghi PII (tên, email, nội dung assessment). */
export function logPathFallback(
  reason: PathFallbackReason,
  input: AgentFlowInput,
  extra?: { errorName?: string },
): void {
  console.info(
    "[path-agent:fallback]",
    JSON.stringify({
      reason,
      flow: input.flow,
      roleId: input.roleId,
      aiLevel: input.aiLevel,
      skillCount: input.skillSlugs.length,
      completedCount: input.completedModuleIds.length,
      gapCount: input.assessmentGapModuleIds.length,
      goalTagCount: input.goalTags.length,
      ...(extra?.errorName ? { errorName: extra.errorName } : {}),
    }),
  );
}
