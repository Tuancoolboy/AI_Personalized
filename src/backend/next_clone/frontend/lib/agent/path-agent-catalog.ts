// Kho bài hợp lệ (nguồn sự thật để validate id) + dựng candidate pool.
// Kho = LEARNING_MODULES (sinh từ ROLES). Agent chỉ được chọn id trong pool này.

import { LEARNING_MODULES } from "@/lib/learning-modules-data";
import {
  getFoundationModules,
  getModulesBySkill,
  ROLES,
} from "@/lib/roles";
import type { AgentFlowInput, CandidateModule } from "./path-agent-types";

// Tập mọi id bài hợp lệ trong kho — dùng để loại id bịa.
export const VALID_MODULE_IDS: ReadonlySet<string> = new Set(
  LEARNING_MODULES.map((m) => m.id),
);

export function isValidModuleId(id: string): boolean {
  return VALID_MODULE_IDS.has(id);
}

// Skill mà một vai trò chạm tới (từ module của vai trò) — dùng cho luồng cá nhân.
export function getRoleSkillSlugs(roleId: string): string[] {
  const role = ROLES[roleId];
  if (!role) return [];
  const slugs = new Set<string>();
  for (const m of role.modules) {
    for (const s of m.skills ?? []) slugs.add(s);
  }
  return [...slugs];
}

function toCandidate(
  id: string,
  title: string,
  level: 1 | 2 | 3,
  roleId: string,
  skills: string[],
  isFoundation: boolean,
): CandidateModule {
  return { id, title, level, roleId, skills, isFoundation };
}

// Candidate pool gửi lên agent — CHỈ metadata. Khử trùng theo id.
//  - Nền tảng (mọi luồng) luôn có mặt.
//  - Công ty: thêm module dạy từng kỹ năng position_skills.
//  - Cá nhân: thêm toàn bộ module của vai trò.
export function buildCandidatePool(input: AgentFlowInput): CandidateModule[] {
  const byId = new Map<string, CandidateModule>();

  for (const m of getFoundationModules()) {
    byId.set(
      m.id,
      toCandidate(m.id, m.title, m.level, m.roleId, m.skills ?? [], true),
    );
  }

  for (const hint of input.assignedPathModules ?? []) {
    if (byId.has(hint.id)) continue;
    byId.set(
      hint.id,
      toCandidate(hint.id, hint.title, hint.level, input.roleId, [], hint.isFoundation),
    );
  }

  if (input.flow === "company") {
    for (const slug of input.skillSlugs) {
      for (const m of getModulesBySkill(slug)) {
        if (!byId.has(m.id)) {
          byId.set(
            m.id,
            toCandidate(m.id, m.title, m.level, m.roleId, m.skills ?? [], false),
          );
        }
      }
    }
  } else {
    const role = ROLES[input.roleId];
    if (role) {
      for (const m of role.modules) {
        if (!byId.has(m.id)) {
          byId.set(
            m.id,
            toCandidate(
              m.id,
              m.title,
              m.level,
              role.id,
              m.skills ?? [],
              Boolean(m.isFoundation),
            ),
          );
        }
      }
    }
  }

  return [...byId.values()];
}

// Kỹ năng không có bài nào trong kho → ghi "chưa có bài cho [kỹ năng]".
export function findMissingSkills(skillSlugs: string[]): string[] {
  return skillSlugs.filter((slug) => getModulesBySkill(slug).length === 0);
}
