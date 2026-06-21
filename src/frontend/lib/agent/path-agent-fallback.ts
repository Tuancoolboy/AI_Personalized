// Fallback rule-based: dùng builder hiện có khi agent lỗi / thiếu key (demo không crash).
// Company: composePathFromSkills; Individual: getLearningModulesByRole.
// Vẫn đi qua validate để đồng nhất cap / bỏ bài đã xong / ưu tiên nền tảng.

import { getLearningModulesByRole } from "@/lib/learning-modules-data";
import { composePathFromSkills, SKILL_LABELS } from "@/lib/roles";
import { buildCandidatePool, findMissingSkills } from "./path-agent-catalog";
import type {
  AgentFlowInput,
  AgentPathGroup,
  AgentPathResult,
} from "./path-agent-types";
import { validateAgentOutput } from "./path-agent-validate";

function companyGroups(input: AgentFlowInput): AgentPathGroup[] {
  const composed = composePathFromSkills(input.skillSlugs);
  const assignedPath = input.assignedPathModules ?? [];
  const foundation = composed
    .filter((m) => m.source.type === "foundation")
    .map((m) => m.id);
  const groups: AgentPathGroup[] = [];
  if (assignedPath.length) {
    groups.push({
      title: input.assignedPathTitle
        ? `Lộ trình công ty: ${input.assignedPathTitle}`
        : "Lộ trình công ty đang giao",
      reason: "Bám lộ trình công ty đã giao trước khi bổ sung module ngoài path.",
      moduleIds: assignedPath.map((mod) => mod.id),
    });
  }
  if (foundation.length) {
    groups.push({
      title: "Nền tảng",
      reason: "Công cụ AI cơ bản + viết prompt + an toàn dữ liệu — học trước.",
      moduleIds: foundation,
    });
  }
  for (const slug of input.skillSlugs) {
    const ids = composed
      .filter((m) => m.source.type === "skill" && m.skills?.includes(slug))
      .map((m) => m.id);
    if (ids.length) {
      groups.push({
        title: `Kỹ năng: ${SKILL_LABELS[slug] ?? slug}`,
        reason: "Bài kỹ năng công ty mong muốn cho vị trí này.",
        moduleIds: ids,
      });
    }
  }
  return groups;
}

function individualGroups(input: AgentFlowInput): AgentPathGroup[] {
  const modules = getLearningModulesByRole(input.roleId, input.aiLevel);
  return [
    {
      title: "Lộ trình theo vị trí",
      reason: "Bài học sát vai trò của bạn, đi từ cơ bản đến nâng cao.",
      moduleIds: modules.map((m) => m.id),
    },
  ];
}

export function buildFallbackPath(
  input: AgentFlowInput,
  fingerprint: string,
): AgentPathResult {
  const pool = buildCandidatePool(input);
  const groups =
    input.flow === "company" ? companyGroups(input) : individualGroups(input);

  const validated = validateAgentOutput({ groups }, pool, input);
  const missingSkills = findMissingSkills(input.skillSlugs).map(
    (slug) => SKILL_LABELS[slug] ?? slug,
  );

  return {
    source: "fallback",
    flow: input.flow,
    summary:
      input.flow === "company"
        ? "Lộ trình theo kỹ năng công ty mong muốn, ưu tiên nền tảng trước."
        : "Lộ trình cá nhân theo vị trí của bạn, đi từ cơ bản đến nâng cao.",
    groups: validated.groups,
    orderedModuleIds: validated.orderedModuleIds,
    missingSkills,
    fingerprint,
  };
}
